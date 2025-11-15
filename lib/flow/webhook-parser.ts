import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Parsea el body de un webhook de Flow
 * Flow puede enviar datos como JSON, form-data, URL-encoded o en query params (GET)
 */
export async function parseFlowWebhookBody(
  request: NextRequest
): Promise<Record<string, any>> {
  const contentType = request.headers.get('content-type') || '';
  const method = request.method;

  // Si es GET, los datos vienen en query params
  if (method === 'GET') {
    return Object.fromEntries(request.nextUrl.searchParams.entries());
  }

  // Para POST, leer según content-type
  if (contentType.includes('application/json')) {
    try {
      return await request.json();
    } catch (error) {
      logger.warn('Error parseando JSON del webhook', { error });
      return {};
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const text = await request.text();
      if (!text) return {};
      const params = new URLSearchParams(text);
      return Object.fromEntries(params.entries());
    } catch (error) {
      logger.warn('Error parseando URL-encoded del webhook', { error });
      return {};
    }
  }

  // Por defecto, intentar como URL-encoded (más común en webhooks de Flow)
  try {
    const text = await request.text();
    if (text && text.trim().length > 0) {
      const params = new URLSearchParams(text);
      return Object.fromEntries(params.entries());
    }
  } catch (error) {
    logger.warn('No se pudo parsear el body del webhook', { error });
  }

  return {};
}

/**
 * Extrae el token de Flow de diferentes formatos posibles
 */
export function extractFlowToken(
  body: Record<string, any>,
  searchParams: URLSearchParams
): string | null {
  return (
    body.token ||
    body.Token ||
    body.TOKEN ||
    searchParams.get('token') ||
    searchParams.get('Token') ||
    null
  );
}

/**
 * Extrae otros parámetros comunes de Flow
 */
export function extractFlowParams(body: Record<string, any>): {
  token: string | null;
  status?: string | number;
  flowOrder?: string | number;
  error?: string;
} {
  return {
    token: body.token || body.Token || body.TOKEN || null,
    status: body.status || body.Status,
    flowOrder: body.flowOrder || body.floworder || body.flowOrder,
    error: body.error || body.Error,
  };
}

