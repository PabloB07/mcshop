import { NextRequest, NextResponse } from 'next/server';
import { MinecraftService } from '@/lib/services/minecraft.service';
import { logger } from '@/lib/logger';
import { rateLimitMiddleware } from '@/lib/rate-limit';

/**
 * POST /api/minecraft/plugin/execute
 * Endpoint para que el plugin Java ejecute comandos y reporte resultados
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

    const { command, command_type, executed_command_id } = bodyData;

    if (!command) {
      return NextResponse.json(
        { error: 'Comando requerido' },
        { status: 400 }
      );
    }

    // El plugin Java ejecuta el comando y reporta el resultado
    // Este endpoint solo actualiza el estado en la base de datos
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();

    if (executed_command_id) {
      const { success, response, error } = bodyData;

      await supabaseAdmin
        .from('executed_commands')
        .update({
          status: success ? 'success' : 'failed',
          response: response || null,
          error_message: error || null,
          executed_at: new Date().toISOString(),
        })
        .eq('id', executed_command_id);

      logger.info('Comando ejecutado reportado por plugin', {
        executed_command_id,
        success,
        server_id: server.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Comando reportado correctamente',
    });
  } catch (error) {
    logger.error('Error en execute command endpoint', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

