/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Permitir solicitudes desde dominios ngrok en desarrollo
  allowedDevOrigins: [
    'd70bc66e4bf6.ngrok-free.app',
    // Agregar más dominios ngrok aquí si cambias de túnel
    // O configura NEXT_PUBLIC_NGROK_DOMAIN en .env.local
    ...(process.env.NEXT_PUBLIC_NGROK_DOMAIN 
      ? [process.env.NEXT_PUBLIC_NGROK_DOMAIN] 
      : []),
  ],
  // Configuración para Server Actions y headers de ngrok/Flow
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: [
        'localhost:3000',
        'sandbox.flow.cl',
        'www.flow.cl',
        'd70bc66e4bf6.ngrok-free.app',
        ...(process.env.NEXT_PUBLIC_NGROK_DOMAIN 
          ? [process.env.NEXT_PUBLIC_NGROK_DOMAIN] 
          : []),
      ],
    },
  },
};

module.exports = nextConfig;

