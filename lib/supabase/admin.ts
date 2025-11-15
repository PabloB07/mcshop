import { createClient } from '@supabase/supabase-js';
import { createServerClient } from './server';

/**
 * Verifica si un usuario es administrador
 * Un usuario es admin si tiene is_admin: true en user_metadata
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    
    // Obtener información del usuario
    const { data: { user }, error } = await supabase.auth.getUserById(userId);
    
    if (error || !user) {
      return false;
    }
    
    // Verificar si tiene is_admin en metadata
    return user.user_metadata?.is_admin === true || 
           user.user_metadata?.is_admin === 'true';
  } catch {
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

