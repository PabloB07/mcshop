import { NextRequest, NextResponse } from 'next/server';
import { parseFlowWebhookBody, extractFlowParams } from '@/lib/flow/webhook-parser';
import { logger } from '@/lib/logger';

/**
 * Maneja la finalización de orden desde Flow
 * Según la documentación: https://developers.flow.cl/docs/category/pago-ecommerce
 * Flow hace un POST mediante el browser en urlReturn después de la confirmación
 * Acepta: text/html, application/xhtml+xml, application/xml
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseFlowWebhookBody(request);
    const { token, status, flowOrder, error } = extractFlowParams(body);

    // Si hay un error explícito de Flow, redirigir a página de error
    if (error) {
      logger.error('Error en finalización de Flow', { error, token });
      const errorUrl = `/checkout/error?error=${encodeURIComponent(error)}${token ? `&token=${token}` : ''}`;
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${errorUrl}">
  <script>window.location.href = "${errorUrl}";</script>
</head>
<body>
  <p>Redirigiendo...</p>
</body>
</html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Redirigir a la página de éxito con los parámetros
    const searchParams = new URLSearchParams();
    if (token) searchParams.set('token', token);
    if (status) searchParams.set('status', String(status));
    if (flowOrder) searchParams.set('flowOrder', String(flowOrder));

    const redirectUrl = `/checkout/success?${searchParams.toString()}`;

    // Retornar una respuesta HTML que redirige (Flow espera HTML)
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <script>window.location.href = "${redirectUrl}";</script>
</head>
<body>
  <p>Redirigiendo...</p>
  <a href="${redirectUrl}">Haz clic aquí si no eres redirigido automáticamente</a>
</body>
</html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    logger.error('Error procesando finalización de orden', error);
    // Redirigir a página de error
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=/checkout/error?error=${encodeURIComponent('Error al procesar la finalización del pago')}">
  <script>window.location.href = "/checkout/error?error=${encodeURIComponent('Error al procesar la finalización del pago')}";</script>
</head>
<body>
  <p>Redirigiendo...</p>
</body>
</html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
}

// También manejar GET por si Flow redirige con GET
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const status = searchParams.get('status');
  const flowOrder = searchParams.get('flowOrder');

  // Redirigir a la página de éxito
  const redirectParams = new URLSearchParams();
  if (token) redirectParams.set('token', token);
  if (status) redirectParams.set('status', status);
  if (flowOrder) redirectParams.set('flowOrder', flowOrder);

  return NextResponse.redirect(
    new URL(`/checkout/success?${redirectParams.toString()}`, request.url)
  );
}

