import { NextRequest, NextResponse } from 'next/server';
import { MinecraftService } from '@/lib/services/minecraft.service';
import { logger } from '@/lib/logger';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/minecraft/plugin/pending-orders
 * Endpoint para que el plugin Java obtenga órdenes pendientes de aplicar
 * Autenticación: API Key + HMAC Signature
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = rateLimitMiddleware(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const minecraftService = new MinecraftService();

    // Obtener headers de autenticación
    const apiKey = request.headers.get('X-API-Key');
    const signature = request.headers.get('X-Signature');

    if (!apiKey || !signature) {
      return NextResponse.json(
        { error: 'API Key y Signature requeridos' },
        { status: 401 }
      );
    }

    // Leer body para verificar firma (para GET, usamos query params)
    const url = new URL(request.url);
    const body = JSON.stringify(Object.fromEntries(url.searchParams));
    
    // Verificar autenticación
    const server = await minecraftService.verifyPluginAuth(apiKey, signature, body);
    if (!server) {
      return NextResponse.json(
        { error: 'Autenticación inválida' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Obtener órdenes pendientes para este servidor
    const { data: pendingOrders, error } = await supabaseAdmin
      .from('minecraft_orders')
      .select(`
        *,
        order:orders(
          id,
          status,
          user_id,
          order_items(
            product:products(
              id,
              name,
              product_type,
              ranks(*),
              game_items(*),
              game_money(*)
            )
          )
        )
      `)
      .eq('status', 'pending')
      .or(`server_id.is.null,server_id.eq.${server.id}`)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      logger.error('Error obteniendo órdenes pendientes', error);
      return NextResponse.json(
        { error: 'Error obteniendo órdenes pendientes' },
        { status: 500 }
      );
    }

    // Filtrar solo órdenes con status 'paid'
    const paidOrders = pendingOrders?.filter(
      (mo) => mo.order && mo.order.status === 'paid'
    ) || [];

    return NextResponse.json({
      success: true,
      orders: paidOrders,
    });
  } catch (error) {
    logger.error('Error en pending-orders endpoint', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

