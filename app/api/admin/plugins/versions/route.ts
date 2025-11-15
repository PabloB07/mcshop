import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isUserAdmin } from '@/lib/supabase/admin';
import { logAuditEvent, getRequestInfo } from '@/lib/audit-log';

/**
 * GET - Obtener versiones de un plugin
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { error: 'product_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener todas las versiones del plugin
    const { data: versions, error } = await supabase
      .from('plugin_versions')
      .select('*')
      .eq('product_id', productId)
      .order('release_date', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Error al obtener versiones' },
        { status: 500 }
      );
    }

    return NextResponse.json({ versions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear nueva versión de un plugin
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
        { error: 'Solo administradores pueden crear versiones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { product_id, version, jar_file_path, jar_file_size, changelog, is_active } = body;

    if (!product_id || !version || !jar_file_path) {
      return NextResponse.json(
        { error: 'product_id, version y jar_file_path son requeridos' },
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

    // Crear nueva versión
    const { data: newVersion, error: versionError } = await supabase
      .from('plugin_versions')
      .insert({
        product_id,
        version,
        jar_file_path,
        jar_file_size: jar_file_size || null,
        changelog: changelog || null,
        is_active: is_active !== undefined ? is_active : false,
      })
      .select()
      .single();

    if (versionError) {
      logger.error('Error creando versión', versionError);
      return NextResponse.json(
        { error: 'Error al crear la versión' },
        { status: 500 }
      );
    }

    // Si se activó esta versión, actualizar el producto principal
    if (is_active) {
      await supabase
        .from('products')
        .update({
          jar_file_path: jar_file_path,
          jar_file_size: jar_file_size || null,
          plugin_version: version,
        })
        .eq('id', product_id);
    }

    // Registrar evento de auditoría
    const { ip, userAgent } = getRequestInfo(request);
    await logAuditEvent({
      user_id: user.id,
      action: 'plugin_uploaded',
      resource_type: 'plugin_version',
      resource_id: newVersion.id,
      details: {
        product_id,
        product_name: product.name,
        version,
        jar_file_path,
        is_active,
      },
      ip_address: ip || undefined,
      user_agent: userAgent || undefined,
    });

    return NextResponse.json({
      success: true,
      version: newVersion,
    });
  } catch (error) {
    logger.error('Error creando versión', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualizar versión (activar/desactivar)
 */
export async function PATCH(request: NextRequest) {
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
        { error: 'Solo administradores pueden actualizar versiones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { version_id, is_active } = body;

    if (!version_id || is_active === undefined) {
      return NextResponse.json(
        { error: 'version_id e is_active son requeridos' },
        { status: 400 }
      );
    }

    // Obtener versión actual
    const { data: currentVersion, error: getError } = await supabase
      .from('plugin_versions')
      .select('*, product:products(*)')
      .eq('id', version_id)
      .single();

    if (getError || !currentVersion) {
      return NextResponse.json(
        { error: 'Versión no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar versión
    const { data: updatedVersion, error: updateError } = await supabase
      .from('plugin_versions')
      .update({ is_active })
      .eq('id', version_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Error al actualizar la versión' },
        { status: 500 }
      );
    }

    // Si se activó, actualizar producto principal
    if (is_active) {
      await supabase
        .from('products')
        .update({
          jar_file_path: updatedVersion.jar_file_path,
          jar_file_size: updatedVersion.jar_file_size,
          plugin_version: updatedVersion.version,
        })
        .eq('id', currentVersion.product_id);
    }

    // Registrar evento de auditoría
    const { ip, userAgent } = getRequestInfo(request);
    await logAuditEvent({
      user_id: user.id,
      action: 'plugin_uploaded',
      resource_type: 'plugin_version',
      resource_id: version_id,
      details: {
        product_id: currentVersion.product_id,
        version: updatedVersion.version,
        is_active,
      },
      ip_address: ip || undefined,
      user_agent: userAgent || undefined,
    });

    return NextResponse.json({
      success: true,
      version: updatedVersion,
    });
  } catch (error) {
    logger.error('Error actualizando versión', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

