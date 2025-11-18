import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { rateLimitMiddleware } from '@/lib/rate-limit';

/**
 * GET /api/admin/ranks - Obtener todos los rangos
 * POST /api/admin/ranks - Crear un nuevo rango
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

    const { data: ranks, error } = await supabase
      .from('ranks')
      .select('*, product:products(*)')
      .order('priority', { ascending: false });

    if (error) {
      logger.error('Error obteniendo rangos', error);
      return NextResponse.json({ error: 'Error obteniendo rangos' }, { status: 500 });
    }

    return NextResponse.json({ ranks });
  } catch (error) {
    logger.error('Error en GET /api/admin/ranks', error);
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
      product_id,
      luckperms_group,
      priority,
      prefix,
      suffix,
      weight,
      display_name,
      description,
      permissions,
    } = body;

    if (!product_id || !luckperms_group) {
      return NextResponse.json(
        { error: 'product_id y luckperms_group son requeridos' },
        { status: 400 }
      );
    }

    const { data: rank, error } = await supabase
      .from('ranks')
      .insert({
        product_id,
        luckperms_group,
        priority: priority || 0,
        prefix,
        suffix,
        weight,
        display_name,
        description,
        permissions: permissions || [],
      })
      .select('*, product:products(*)')
      .single();

    if (error) {
      logger.error('Error creando rango', error);
      return NextResponse.json({ error: 'Error creando rango' }, { status: 500 });
    }

    return NextResponse.json({ rank }, { status: 201 });
  } catch (error) {
    logger.error('Error en POST /api/admin/ranks', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

