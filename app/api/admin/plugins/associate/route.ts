import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/supabase/admin';
import { logAuditEvent, getRequestInfo } from '@/lib/audit-log';

/**
 * API para asociar un archivo JAR subido manualmente en Supabase Storage
 * con un producto existente en la base de datos
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea admin
    const userIsAdmin = await isUserAdmin(user.id);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Solo administradores pueden asociar archivos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { product_id, file_path, file_size } = body;

    if (!product_id || !file_path) {
      return NextResponse.json(
        { error: 'product_id y file_path son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el producto existe
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el archivo existe en Storage
    // El file_path debe ser relativo al bucket, ej: "plugins/archivo.jar"
    if (!file_path.startsWith('plugins/')) {
      return NextResponse.json(
        { error: 'El archivo debe estar en el bucket "plugins"' },
        { status: 400 }
      );
    }

    // Actualizar producto con la información del archivo
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        jar_file_path: file_path,
        jar_file_size: file_size || null,
      })
      .eq('id', product_id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error actualizando producto', updateError);
      return NextResponse.json(
        { error: 'Error al asociar el archivo al producto' },
        { status: 500 }
      );
    }

    // Registrar evento de auditoría
    const { ip, userAgent } = getRequestInfo(request);
    await logAuditEvent({
      user_id: user.id,
      action: 'plugin_associated',
      resource_type: 'product',
      resource_id: product_id,
      details: {
        product_name: updatedProduct.name,
        file_path: file_path,
        file_size: file_size,
      },
      ip_address: ip || undefined,
      user_agent: userAgent || undefined,
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Archivo asociado correctamente al producto',
    });
  } catch (error) {
    logger.error('Error asociando archivo', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

