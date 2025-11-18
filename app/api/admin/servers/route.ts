import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUserAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import crypto from 'crypto';

/**
 * GET /api/admin/servers - Obtener todos los servidores
 * POST /api/admin/servers - Crear un nuevo servidor
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimitMiddleware(request);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: servers, error } = await supabaseAdmin
      .from('minecraft_servers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error obteniendo servidores', error);
      return NextResponse.json({ error: 'Error obteniendo servidores' }, { status: 500 });
    }

    // No retornar api_secret por seguridad
    const safeServers = servers?.map(({ api_secret, ...server }) => ({
      ...server,
      api_secret: '***hidden***',
    }));

    return NextResponse.json({ servers: safeServers });
  } catch (error) {
    logger.error('Error en GET /api/admin/servers', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimitMiddleware(request);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      host,
      port,
      rcon_host,
      rcon_port,
      rcon_password,
      webhook_url,
    } = body;

    if (!name || !host) {
      return NextResponse.json(
        { error: 'name y host son requeridos' },
        { status: 400 }
      );
    }

    // Generar API key y secret
    const apiKey = crypto.randomBytes(16).toString('hex').toUpperCase().match(/.{1,8}/g)?.join('-') || '';
    const apiSecret = crypto.randomBytes(32).toString('hex');

    const supabaseAdmin = createAdminClient();
    const { data: server, error } = await supabaseAdmin
      .from('minecraft_servers')
      .insert({
        name,
        host,
        port: port || 25565,
        api_key: apiKey,
        api_secret: apiSecret,
        rcon_host,
        rcon_port: rcon_port || 25575,
        rcon_password,
        webhook_url,
        active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creando servidor', error);
      return NextResponse.json({ error: 'Error creando servidor' }, { status: 500 });
    }

    // Retornar con api_secret solo una vez (para que el admin lo guarde)
    return NextResponse.json(
      {
        server: {
          ...server,
          api_secret: apiSecret, // Mostrar solo en la creación
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error en POST /api/admin/servers', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

