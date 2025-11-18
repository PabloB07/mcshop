import { NextRequest, NextResponse } from 'next/server';
import { MinecraftService } from '@/lib/services/minecraft.service';
import { logger } from '@/lib/logger';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/minecraft/plugin/confirm-order
 * Endpoint para que el plugin Java confirme que aplicó una orden exitosamente
 * Autenticación: API Key + HMAC Signature
 */
export async function POST(request: NextRequest) {
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

    // Leer body para verificar firma
    const body = await request.text();
    let bodyData: any;
    try {
      bodyData = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: 'Body JSON inválido' },
        { status: 400 }
      );
    }

    // Verificar autenticación
    const server = await minecraftService.verifyPluginAuth(apiKey, signature, body);
    if (!server) {
      return NextResponse.json(
        { error: 'Autenticación inválida' },
        { status: 401 }
      );
    }

    const { minecraft_order_id, success, error_message } = bodyData;

    if (!minecraft_order_id) {
      return NextResponse.json(
        { error: 'minecraft_order_id requerido' },
        { status: 400 }
      );
    }

    // Actualizar estado de la orden
    const status = success ? 'applied' : 'failed';
    await minecraftService.updateMinecraftOrderStatus(
      minecraft_order_id,
      status,
      error_message
    );

    logger.info('Orden de Minecraft confirmada por plugin', {
      minecraft_order_id,
      success,
      server_id: server.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Orden actualizada correctamente',
    });
  } catch (error) {
    logger.error('Error en confirm-order endpoint', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

