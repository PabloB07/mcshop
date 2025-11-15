import { createClient } from '@supabase/supabase-js';

/**
 * Envía un email usando Supabase Edge Functions o el servicio de email configurado
 * 
 * Para usar esto, necesitas configurar Supabase Edge Functions o usar un servicio externo
 * como Resend, SendGrid, etc.
 * 
 * Por ahora, esta función prepara los datos para enviar el email.
 */
export async function sendPurchaseConfirmationEmail(
  email: string,
  orderId: string,
  products: Array<{ name: string; downloadUrl?: string }>,
  downloadUrl?: string
) {
  // TODO: Implementar envío de email real
  // Opciones:
  // 1. Usar Supabase Edge Functions con Resend/SendGrid
  // 2. Usar Supabase Auth email templates (limitado)
  // 3. Usar un servicio externo directamente
  
  const emailData = {
    to: email,
    subject: `Confirmación de Compra - MCShop`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .product { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Gracias por tu compra!</h1>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Tu pedido <strong>${orderId}</strong> ha sido procesado exitosamente.</p>
            
            <h2>Productos comprados:</h2>
            ${products.map(p => `
              <div class="product">
                <h3>${p.name}</h3>
                ${p.downloadUrl ? `<a href="${p.downloadUrl}" class="button">Descargar Plugin</a>` : ''}
              </div>
            `).join('')}
            
            ${downloadUrl ? `
              <p><strong>Importante:</strong> Este enlace de descarga expirará en 24 horas y solo puede usarse una vez.</p>
              <a href="${downloadUrl}" class="button">Descargar Todos los Plugins</a>
            ` : ''}
            
            <p>También puedes acceder a tus descargas desde tu <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard">dashboard</a>.</p>
          </div>
          <div class="footer">
            <p>MCShop - Tu tienda de plugins de Minecraft</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  // Por ahora, solo loguear (implementar envío real después)
  console.log('📧 Email a enviar:', {
    to: email,
    subject: emailData.subject,
    hasDownloadUrl: !!downloadUrl,
  });

  // TODO: Implementar envío real usando:
  // - Supabase Edge Functions
  // - Resend API
  // - SendGrid
  // - O cualquier otro servicio de email

  return emailData;
}

