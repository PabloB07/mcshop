import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent, getRequestInfo } from '@/lib/audit-log';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token || token.length !== 64) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Buscar registro de descarga con información del producto
    const { data: download, error: downloadError } = await supabase
      .from('product_downloads')
      .select('*, product:products(*)')
      .eq('download_token', token)
      .single();

    if (downloadError || !download) {
      return NextResponse.json(
        { error: 'Token de descarga no válido' },
        { status: 404 }
      );
    }

    // Verificar autenticación del usuario que intenta descargar
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Debes estar autenticado para descargar' },
        { status: 401 }
      );
    }

    // Verificar que el usuario que descarga sea el dueño del token
    if (download.user_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para descargar este archivo' },
        { status: 403 }
      );
    }

    // Verificar si ya fue usado
    if (download.used) {
      return NextResponse.json(
        { error: 'Este enlace de descarga ya fue utilizado. Genera uno nuevo desde tu dashboard.' },
        { status: 410 }
      );
    }

    // Verificar expiración
    const expiresAt = new Date(download.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Este enlace de descarga ha expirado. Genera uno nuevo desde tu dashboard.' },
        { status: 410 }
      );
    }

    // Obtener la versión activa del plugin (o usar la del producto si no hay versiones)
    let jarFilePath = download.product?.jar_file_path;
    
    // Intentar obtener la versión activa desde plugin_versions
    const { data: activeVersion } = await supabase
      .from('plugin_versions')
      .select('jar_file_path')
      .eq('product_id', download.product_id)
      .eq('is_active', true)
      .single();
    
    if (activeVersion?.jar_file_path) {
      jarFilePath = activeVersion.jar_file_path;
    }

    // Verificar que el producto tenga archivo
    if (!jarFilePath) {
      return NextResponse.json(
        { error: 'Archivo no encontrado para este producto' },
        { status: 404 }
      );
    }

    // Verificar que el usuario aún tenga acceso al producto (licencia activa)
    const { data: userProduct, error: userProductError } = await supabase
      .from('user_products')
      .select('*, license:licenses(*)')
      .eq('user_id', user.id)
      .eq('product_id', download.product_id)
      .single();

    // Si no está en user_products, verificar orden pagada
    if (userProductError || !userProduct) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, order:orders!inner(*)')
        .eq('product_id', download.product_id)
        .eq('order.user_id', user.id)
        .eq('order.status', 'paid')
        .limit(1);

      if (!orderItems || orderItems.length === 0) {
        return NextResponse.json(
          { error: 'Ya no tienes acceso a este producto' },
          { status: 403 }
        );
      }
    } else if (userProduct.license && userProduct.license.status !== 'active') {
      return NextResponse.json(
        { error: 'Tu licencia para este producto no está activa' },
        { status: 403 }
      );
    }

    // Crear cliente de Supabase con service role para descargar archivo
    const supabaseAdmin = createAdminClient();

    // Descargar archivo desde Storage (usar la versión activa si existe)
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('plugins')
      .download(jarFilePath);

    if (fileError || !fileData) {
      logger.error('Error descargando archivo', fileError);
      return NextResponse.json(
        { error: 'Error al descargar el archivo' },
        { status: 500 }
      );
    }

    // Marcar descarga como usada (antes de enviar el archivo para evitar race conditions)
    const { error: updateError } = await supabase
      .from('product_downloads')
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', download.id);

    if (updateError) {
      logger.warn('Error marcando descarga como usada', updateError);
      // Continuar con la descarga aunque falle el update
    }

    // Convertir blob a buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Obtener nombre del archivo
    const fileName = jarFilePath.split('/').pop() || 'plugin.jar';

    // Registrar evento de auditoría (después de marcar como usado)
    const { ip, userAgent } = getRequestInfo(request);
    await logAuditEvent({
      user_id: user.id,
      action: 'download_completed',
      resource_type: 'product',
      resource_id: download.product_id,
      details: {
        product_name: download.product.name,
        download_token: token.substring(0, 8) + '...',
        file_name: fileName,
        file_size: buffer.length,
      },
      ip_address: ip || undefined,
      user_agent: userAgent || undefined,
    });

    // Retornar archivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/java-archive',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Error en descarga', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar la descarga' },
      { status: 500 }
    );
  }
}

