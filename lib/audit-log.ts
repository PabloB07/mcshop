import { createServerClient } from './supabase/server';

export type AuditAction =
  | 'plugin_uploaded'
  | 'plugin_associated'
  | 'download_generated'
  | 'download_completed'
  | 'license_verified'
  | 'license_revoked'
  | 'order_created'
  | 'order_paid'
  | 'user_registered'
  | 'user_login'
  | 'admin_action';

export interface AuditLogEntry {
  user_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Registra un evento de auditoría en la base de datos
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServerClient();
    
    await supabase.from('audit_logs').insert({
      user_id: entry.user_id || null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id || null,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
    });
  } catch (error) {
    // No fallar si el log falla, solo registrar en consola
    console.error('Error registrando evento de auditoría:', error);
  }
}

/**
 * Helper para obtener información de la request
 */
export function getRequestInfo(request: Request): {
  ip: string | null;
  userAgent: string | null;
} {
  const headers = request.headers;
  
  const ip = 
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    null;
  
  const userAgent = headers.get('user-agent') || null;
  
  return { ip, userAgent };
}

