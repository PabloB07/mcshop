import { NextRequest } from 'next/server';

/**
 * Sistema simple de rate limiting en memoria
 * Para producción, considera usar Redis o un servicio externo
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Limpia entradas expiradas del store cada 5 minutos
 */
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Configuración de rate limiting por ruta
 */
export const rateLimitConfig = {
  '/api/admin/plugins/upload': {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
  },
  '/api/downloads/generate': {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minuto
  },
  '/api/downloads/': {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minuto
  },
  '/api/admin/plugins/associate': {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minuto
  },
  '/api/licenses/verify': {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },
  default: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minuto
  },
};

/**
 * Obtiene la clave única para rate limiting
 */
function getRateLimitKey(request: NextRequest, userId?: string): string {
  // Usar IP del cliente
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';
  
  // Si hay usuario, incluir su ID para rate limiting por usuario
  if (userId) {
    return `${request.nextUrl.pathname}:${userId}`;
  }
  
  return `${request.nextUrl.pathname}:${ip}`;
}

/**
 * Verifica si una request excede el rate limit
 */
export function checkRateLimit(
  request: NextRequest,
  userId?: string
): { allowed: boolean; remaining: number; resetTime: number } {
  const pathname = request.nextUrl.pathname;
  
  // Encontrar configuración para esta ruta
  let config = rateLimitConfig.default;
  for (const [route, routeConfig] of Object.entries(rateLimitConfig)) {
    if (pathname.startsWith(route)) {
      config = routeConfig;
      break;
    }
  }

  const key = getRateLimitKey(request, userId);
  const now = Date.now();
  
  // Obtener o crear entrada
  let entry = store[key];
  
  if (!entry || entry.resetTime < now) {
    // Nueva ventana de tiempo
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    store[key] = entry;
  }
  
  // Incrementar contador
  entry.count++;
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Middleware helper para rate limiting
 */
export function rateLimitMiddleware(
  request: NextRequest,
  userId?: string
): Response | null {
  const result = checkRateLimit(request, userId);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': rateLimitConfig.default.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  return null;
}

