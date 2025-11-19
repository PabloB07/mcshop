import { createClient } from '@supabase/supabase-js';

/**
 * Verifica si un usuario es administrador
 * Un usuario es admin si tiene is_admin: true en user_metadata o raw_user_meta_data
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabaseAdmin = createAdminClient();
    
    // Obtener información del usuario usando admin client
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error || !user) {
      console.error('Error obteniendo usuario para verificar admin:', error);
      return false;
    }
    
    // Verificar en user_metadata
    const isAdminInMetadata = 
      user.user_metadata?.is_admin === true || 
      user.user_metadata?.is_admin === 'true';
    
    // Verificar en raw_user_meta_data (formato de Supabase)
    const isAdminInRaw = 
      (user as any).raw_user_meta_data?.is_admin === true ||
      (user as any).raw_user_meta_data?.is_admin === 'true';
    
    const isAdmin = isAdminInMetadata || isAdminInRaw;
    
    // Log para debug (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('Verificación de admin:', {
        userId,
        user_metadata: user.user_metadata,
        raw_user_meta_data: (user as any).raw_user_meta_data,
        isAdminInMetadata,
        isAdminInRaw,
        isAdmin,
      });
    }
    
    return isAdmin;
  } catch (error) {
    console.error('Error verificando admin:', error);
    return false;
  }
}

/**
 * Crea un cliente de Supabase con service role para operaciones admin
 * ⚠️ SOLO usar en API routes del servidor, NUNCA en el frontend
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

