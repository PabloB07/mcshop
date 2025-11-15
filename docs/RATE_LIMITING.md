# Sistema de Rate Limiting

## 🛡️ Configuración

El sistema de rate limiting está implementado en `middleware.ts` y se aplica automáticamente a todas las rutas `/api/*`.

## ⚙️ Límites por Ruta

| Ruta | Límite | Ventana |
|------|--------|---------|
| `/api/admin/plugins/upload` | 10 requests | 1 minuto |
| `/api/downloads/generate` | 20 requests | 1 minuto |
| `/api/downloads/[token]` | 30 requests | 1 minuto |
| `/api/admin/plugins/associate` | 20 requests | 1 minuto |
| `/api/licenses/verify` | 100 requests | 1 minuto |
| Otras rutas | 60 requests | 1 minuto |

## 🔑 Clave de Rate Limiting

El rate limiting se basa en:
- **IP del cliente** (por defecto)
- **User ID** (si está disponible después de autenticación)

## 📊 Headers de Respuesta

Cuando se aplica rate limiting, la respuesta incluye:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
Retry-After: 45
```

## 🔧 Personalizar Límites

Edita `lib/rate-limit.ts`:

```typescript
export const rateLimitConfig = {
  '/api/admin/plugins/upload': {
    maxRequests: 10,  // Cambiar aquí
    windowMs: 60 * 1000,  // Cambiar ventana de tiempo
  },
  // ...
};
```

## 🚀 Para Producción

**Recomendación**: Usar Redis o un servicio externo para rate limiting distribuido:

- **Vercel**: Rate limiting automático
- **Upstash Redis**: Para rate limiting distribuido
- **Cloudflare**: Rate limiting en el edge

El sistema actual funciona en memoria y es suficiente para desarrollo y pequeñas aplicaciones.

