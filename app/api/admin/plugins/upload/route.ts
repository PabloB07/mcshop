import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient, isUserAdmin } from '@/lib/supabase/admin';
import { logAuditEvent, getRequestInfo } from '@/lib/audit-log';

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
        { error: 'Solo administradores pueden subir plugins' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const category = formData.get('category') as string;
    const plugin_version = formData.get('plugin_version') as string;
    const minecraft_versions = formData.get('minecraft_versions') as string;
    const author = formData.get('author') as string;
    const changelog = formData.get('changelog') as string;
    const active = formData.get('active') === 'true';

    if (!file || !name || !description || !price) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Validar que sea un archivo .jar
    if (!file.name.endsWith('.jar')) {
      return NextResponse.json(
        { error: 'El archivo debe ser un .jar' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande (máximo 50MB)' },
        { status: 400 }
      );
    }

    // Crear cliente de Supabase con service role para Storage
    const supabaseAdmin = createAdminClient();

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `plugins/${fileName}`;

    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('plugins')
      .upload(filePath, file, {
        contentType: 'application/java-archive',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Error subiendo archivo', uploadError);
      return NextResponse.json(
        { error: 'Error al subir el archivo' },
        { status: 500 }
      );
    }

    // Obtener URL pública del archivo
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('plugins')
      .getPublicUrl(filePath);

    // Parsear minecraft_versions si viene como string
    let minecraftVersionsArray: string[] = [];
    if (minecraft_versions) {
      try {
        minecraftVersionsArray = JSON.parse(minecraft_versions);
      } catch {
        // Si no es JSON, dividir por comas
        minecraftVersionsArray = minecraft_versions.split(',').map(v => v.trim());
      }
    }

    // Crear producto en la base de datos
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name,
        description,
        price: parseFloat(price),
        category: category || 'plugin',
        jar_file_path: filePath,
        jar_file_size: file.size,
        plugin_version: plugin_version || '1.0.0',
        minecraft_versions: minecraftVersionsArray.length > 0 ? minecraftVersionsArray : null,
        author: author || null,
        changelog: changelog || null,
        active: active !== undefined ? active : true,
      })
      .select()
      .single();

    if (productError) {
      logger.error('Error creando producto', productError);
      // Intentar eliminar el archivo subido
      await supabaseAdmin.storage.from('plugins').remove([filePath]);
      return NextResponse.json(
        { error: 'Error al crear el producto' },
        { status: 500 }
      );
    }

    // Registrar evento de auditoría
    const { ip, userAgent } = getRequestInfo(request);
    await logAuditEvent({
      user_id: user.id,
      action: 'plugin_uploaded',
      resource_type: 'product',
      resource_id: product.id,
      details: {
        product_name: product.name,
        file_path: filePath,
        file_size: file.size,
        plugin_version: product.plugin_version,
      },
      ip_address: ip || undefined,
      user_agent: userAgent || undefined,
    });

    return NextResponse.json({
      success: true,
      product,
      filePath,
      publicUrl,
    });
  } catch (error) {
    logger.error('Error en upload plugin', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

