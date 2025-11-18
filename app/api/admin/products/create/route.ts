import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUserAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import type { ProductType } from '@/types/database';

/**
 * POST /api/admin/products/create
 * Crear un nuevo producto (rango, item, dinero, plugin)
 */
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
      description,
      price,
      image_url,
      category,
      product_type,
      minecraft_username,
      minecraft_uuid,
      // Campos específicos de rangos
      luckperms_group,
      priority,
      prefix,
      suffix,
      weight,
      display_name,
      rank_permissions,
      rank_commands,
      // Campos específicos de items
      item_type,
      item_id,
      item_data,
      quantity,
      item_commands,
      // Campos específicos de dinero
      amount,
      currency_type,
      money_command,
    } = body;

    if (!name || !price || !product_type) {
      return NextResponse.json(
        { error: 'name, price y product_type son requeridos' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Crear producto base
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        name,
        description,
        price,
        image_url,
        category: category || product_type,
        product_type: product_type as ProductType,
        minecraft_username,
        minecraft_uuid,
        active: true,
      })
      .select()
      .single();

    if (productError || !product) {
      logger.error('Error creando producto', productError);
      return NextResponse.json({ error: 'Error creando producto' }, { status: 500 });
    }

    // Crear datos específicos según el tipo
    if (product_type === 'rank') {
      if (!luckperms_group) {
        return NextResponse.json(
          { error: 'luckperms_group es requerido para rangos' },
          { status: 400 }
        );
      }

      const { data: rank, error: rankError } = await supabaseAdmin
        .from('ranks')
        .insert({
          product_id: product.id,
          luckperms_group,
          priority: priority || 0,
          prefix,
          suffix,
          weight,
          display_name,
          description,
          permissions: rank_permissions || [],
        })
        .select()
        .single();

      if (rankError) {
        logger.error('Error creando rango', rankError);
        // Eliminar producto si falla
        await supabaseAdmin.from('products').delete().eq('id', product.id);
        return NextResponse.json({ error: 'Error creando rango' }, { status: 500 });
      }

      // Crear comandos del rango si existen
      if (rank_commands && Array.isArray(rank_commands)) {
        for (let i = 0; i < rank_commands.length; i++) {
          const cmd = rank_commands[i];
          await supabaseAdmin.from('rank_commands').insert({
            rank_id: rank.id,
            command: cmd.command,
            command_type: cmd.command_type || 'luckperms',
            execution_order: cmd.execution_order || i,
            server_id: cmd.server_id,
          });
        }
      }
    } else if (product_type === 'item') {
      const { error: itemError } = await supabaseAdmin.from('game_items').insert({
        product_id: product.id,
        item_type: item_type || 'item',
        item_id,
        item_data,
        quantity: quantity || 1,
        commands: item_commands || [],
      });

      if (itemError) {
        logger.error('Error creando item', itemError);
        await supabaseAdmin.from('products').delete().eq('id', product.id);
        return NextResponse.json({ error: 'Error creando item' }, { status: 500 });
      }
    } else if (product_type === 'money') {
      if (!amount) {
        return NextResponse.json(
          { error: 'amount es requerido para dinero' },
          { status: 400 }
        );
      }

      const { error: moneyError } = await supabaseAdmin.from('game_money').insert({
        product_id: product.id,
        amount,
        currency_type: currency_type || 'vault',
        command: money_command,
      });

      if (moneyError) {
        logger.error('Error creando dinero', moneyError);
        await supabaseAdmin.from('products').delete().eq('id', product.id);
        return NextResponse.json({ error: 'Error creando dinero' }, { status: 500 });
      }
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    logger.error('Error en POST /api/admin/products/create', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

