import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { logAuditEvent, getRequestInfo } from '@/lib/audit-log';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { product_id, order_id } = body;

    if (!product_id) {
      return NextResponse.json(
        { error: 'product_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tenga acceso al producto (lo haya comprado)
    // Verificar tanto en user_products como en orders con status 'paid'
    const { data: userProduct, error: userProductError } = await supabase
      .from('user_products')
      .select('*, license:licenses(*), order:orders(*)')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single();

    // Si no está en user_products, verificar si tiene una orden pagada con este producto
    if (userProductError || !userProduct) {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select('*, order:orders!inner(*)')
        .eq('product_id', product_id)
        .eq('order.user_id', user.id)
        .eq('order.status', 'paid')
        .limit(1);

      if (orderItemsError || !orderItems || orderItems.length === 0) {
        return NextResponse.json(
          { error: 'No tienes acceso a este producto. Debes comprarlo primero.' },
          { status: 403 }
        );
      }
    }

    // Verificar que la licencia esté activa si existe
    if (userProduct?.license && userProduct.license.status !== 'active') {
      return NextResponse.json(
        { error: 'Tu licencia para este producto no está activa' },
        { status: 403 }
      );
    }

    // Obtener información del producto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('jar_file_path, name')
      .eq('id', product_id)
      .single();

    if (productError || !product || !product.jar_file_path) {
      return NextResponse.json(
        { error: 'Producto no encontrado o sin archivo' },
        { status: 404 }
      );
    }

    // Generar token único para la descarga
    const downloadToken = crypto.randomBytes(32).toString('hex');
    
    // URL de descarga válida por 24 horas
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Crear registro de descarga
    const { data: download, error: downloadError } = await supabase
      .from('product_downloads')
      .insert({
        user_id: user.id,
        product_id: product_id,
        order_id: order_id || userProduct.order_id || null,
        license_id: userProduct.license_id || null,
        download_token: downloadToken,
        download_url: `/api/downloads/${downloadToken}`,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();

    if (downloadError) {
      logger.error('Error creando registro de descarga', downloadError);
      return NextResponse.json(
        { error: 'Error al generar URL de descarga' },
        { status: 500 }
      );
    }

    // Construir URL completa
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const downloadUrl = `${baseUrl}/api/downloads/${downloadToken}`;

    // Registrar evento de auditoría
    const { ip, userAgent } = getRequestInfo(request);
    await logAuditEvent({
      user_id: user.id,
      action: 'download_generated',
      resource_type: 'product',
      resource_id: product_id,
      details: {
        product_name: product.name,
        download_token: downloadToken.substring(0, 8) + '...',
        expires_at: expiresAt.toISOString(),
      },
      ip_address: ip || undefined,
      user_agent: userAgent || undefined,
    });

    return NextResponse.json({
      success: true,
      download_url: downloadUrl,
      expires_at: expiresAt.toISOString(),
      token: downloadToken,
    });
  } catch (error) {
    logger.error('Error generando URL de descarga', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

