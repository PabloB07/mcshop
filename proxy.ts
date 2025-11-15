import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function proxy(req: NextRequest) {
  // Aplicar rate limiting a rutas de API
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Rate limiting por IP (el userId se puede obtener después de autenticación)
    const rateLimitResponse = rateLimitMiddleware(req);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  // El proxy básico para Next.js 16
  // La protección de rutas se maneja en los componentes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/checkout/:path*',
  ],
};

