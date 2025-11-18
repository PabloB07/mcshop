# MCShop - Ecommerce de Plugins o Rangos para Minecraft

Ecommerce moderno construido con Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion, Supabase y Flow.cl API para vender plugins de servidores de Minecraft o rangos en el servidor.

## 🚀 Características

- **Next.js 16** con App Router
- **React 19** con Server Components
- **TypeScript** para type safety
- **Tailwind CSS** para estilos
- **Framer Motion** para animaciones
- **Supabase** para base de datos, autenticación y storage
- **Flow.cl API** integración completa para pagos
- **Zustand** para manejo de estado del carrito
- **Sistema de logging** centralizado
- **Rate limiting** para protección de APIs
- **Audit logs** para trazabilidad
- **Sistema de versiones** para plugins
- UI moderna y responsive

## 📋 Prerequisitos

- Node.js 18+
- Cuenta de Supabase
- Cuenta de Flow.cl con API Key y Secret Key

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone <tu-repo>
cd mcshop
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_de_supabase

# Flow.cl API
FLOW_API_KEY=tu_api_key_de_flow
FLOW_SECRET_KEY=tu_secret_key_de_flow
FLOW_ENVIRONMENT=sandbox
# Opciones: sandbox o production

# Next.js
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
# Para desarrollo con ngrok:
# NEXT_PUBLIC_NGROK_DOMAIN=tu-dominio-ngrok.ngrok-free.app
```

4. Configura la base de datos en Supabase:

Ejecuta las migraciones SQL en el SQL Editor de Supabase en este orden:

1. `supabase/migrations/001_initial_schema.sql` - Esquema inicial
2. `supabase/migrations/002_plugins_licenses_downloads.sql` - Plugins, licencias y descargas
3. `supabase/migrations/003_audit_logs_versions.sql` - Logs de auditoría y versiones

5. Configura Supabase Storage:

- Crea un bucket llamado `plugins` en Supabase Storage
- Configura las políticas de acceso según `docs/SUPABASE_STORAGE_SETUP.md`

6. Verifica la configuración:
```bash
npm run check-env
```

7. Inicia el servidor de desarrollo:
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
mcshop/
├── app/                    # App Router de Next.js
│   ├── api/               # API Routes
│   │   ├── admin/         # APIs administrativas
│   │   ├── downloads/     # Gestión de descargas
│   │   ├── licenses/      # Verificación de licencias
│   │   ├── minecraft/     # Validación de usuarios Minecraft
│   │   └── payment/       # Endpoints de Flow.cl
│   ├── auth/              # Páginas de autenticación
│   ├── checkout/          # Páginas de checkout
│   ├── dashboard/         # Dashboard del usuario
│   ├── products/          # Página de productos
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página de inicio
├── components/            # Componentes React
│   ├── ui/                # Componentes UI base
│   ├── cart.tsx           # Componente del carrito
│   ├── navbar.tsx         # Barra de navegación
│   ├── product-card.tsx   # Tarjeta de producto
│   └── minecraft-username-input.tsx
├── hooks/                 # Custom hooks
│   ├── useCheckout.ts     # Hook de checkout
│   ├── useUserOrders.ts   # Hook de órdenes
│   └── useUserProducts.ts # Hook de productos
├── lib/                   # Utilidades y configuraciones
│   ├── flow/              # Integración Flow.cl
│   │   ├── api.ts         # Cliente de Flow API
│   │   ├── types.ts       # Tipos de Flow
│   │   ├── utils.ts       # Utilidades de Flow
│   │   └── webhook-parser.ts # Parser de webhooks
│   ├── services/          # Servicios de negocio
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   └── webhook.service.ts
│   ├── supabase/          # Cliente de Supabase
│   │   ├── client.ts      # Cliente para cliente
│   │   ├── server.ts      # Cliente para servidor
│   │   ├── admin.ts       # Cliente admin (service role)
│   │   └── email.ts       # Utilidades de email
│   ├── validators/        # Validadores reutilizables
│   │   └── index.ts
│   ├── logger.ts          # Sistema de logging
│   ├── rate-limit.ts      # Rate limiting
│   ├── audit-log.ts       # Logs de auditoría
│   └── utils.ts           # Utilidades generales
├── store/                 # Estado global (Zustand)
│   └── cart-store.ts      # Store del carrito
├── types/                 # Tipos TypeScript
│   └── database.ts        # Tipos de base de datos
├── supabase/              # Migraciones y scripts SQL
│   ├── migrations/        # Migraciones de base de datos
│   └── scripts/           # Scripts SQL adicionales
└── docs/                  # Documentación
    ├── ADMIN_SETUP.md
    ├── API_SECURITY.md
    ├── ASSOCIATE_JAR_FILES.md
    ├── AUDIT_LOGS.md
    ├── PLUGINS_SETUP.md
    ├── RATE_LIMITING.md
    ├── SUPABASE_STORAGE_SETUP.md
    └── VERSIONES_PLUGINS.md
```

## 🔑 Funcionalidades

### Autenticación
- Registro e inicio de sesión con Supabase Auth
- Validación de usuario de Minecraft (Mojang API)
- Avatar de Minecraft en perfil
- Protección de rutas
- Sesión persistente

### Productos
- Listado de productos
- Búsqueda y filtrado
- Detalles de productos
- Categorías
- Gestión de versiones de plugins

### Carrito de Compras
- Agregar/eliminar productos
- Actualizar cantidades
- Cálculo automático de totales
- Persistencia en estado global

### Checkout y Pagos
- Integración completa con Flow.cl
- Creación de órdenes de pago
- Webhook para confirmación de pagos
- Redirección a Flow para pago
- Páginas de éxito y error
- Manejo de estados de pago

### Dashboard del Usuario
- Ver historial de pedidos
- Estado de pagos
- Productos comprados
- Generar enlaces de descarga (one-time use, expirables)
- Ver licencias
- Información del usuario y avatar de Minecraft

### Administración
- Subir plugins (.jar) a Supabase Storage
- Asociar archivos JAR a productos
- Gestionar versiones de plugins
- Ver logs de auditoría
- Rate limiting configurado

### Seguridad
- Rate limiting en todas las APIs
- Validación de tokens de descarga
- Enlaces de descarga de un solo uso
- Verificación de licencias
- Logs de auditoría
- Row Level Security (RLS) en Supabase

## 🔌 API de Flow.cl

El proyecto incluye una integración completa con la API de Flow.cl:

### Endpoints Implementados
- **Crear orden de pago**: `POST /api/payment/create`
- **Verificar estado**: `GET /api/payment/status`
- **Webhook de confirmación**: `POST /api/payment/webhook`
- **Finalizar pago**: `POST /api/payment/finalize`

### Métodos Disponibles
Todas las funciones de Flow.cl están implementadas en `lib/flow/api.ts`:
- ✅ Crear orden de pago
- ✅ Obtener estado de pago (por token o commerceOrder)
- ✅ Obtener transacciones
- ✅ Crear reembolsos
- ✅ Obtener estado de reembolsos
- ✅ Cancelar reembolsos

Ver `lib/flow/README.md` para documentación completa.

## 📦 Gestión de Plugins

### Subir Plugins
Los administradores pueden subir plugins de dos formas:

1. **API de Upload** (`POST /api/admin/plugins/upload`):
   - Sube el archivo .jar directamente
   - Crea el producto automáticamente

2. **Asociar Archivo Existente** (`POST /api/admin/plugins/associate`):
   - Asocia un archivo .jar ya subido en Supabase Storage
   - Útil si subiste el archivo manualmente desde la web de Supabase

Ver `docs/PLUGINS_SETUP.md` y `docs/ASSOCIATE_JAR_FILES.md` para más detalles.

### Versiones de Plugins
- Sistema de versionado completo
- Múltiples versiones por plugin
- Versión activa para descargas
- Changelog por versión

Ver `docs/VERSIONES_PLUGINS.md` para más detalles.

## 🔒 Seguridad

### Rate Limiting
- Configurado por ruta
- Límites personalizables
- Headers informativos en respuestas

Ver `docs/RATE_LIMITING.md` para configuración.

### Audit Logs
- Registro automático de acciones importantes
- Trazabilidad completa
- Solo administradores pueden ver logs

Ver `docs/AUDIT_LOGS.md` para más detalles.

### API Security
- Validación de tokens
- Verificación de permisos
- Protección contra acceso no autorizado

Ver `docs/API_SECURITY.md` para más detalles.

## 🎨 Personalización

### Colores
Edita `tailwind.config.ts` para cambiar los colores del tema.

### Estilos
Los estilos globales están en `app/globals.css`.

### Fuentes
El proyecto incluye soporte para fuentes personalizadas. Ver `public/fonts/README.md`.

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter
- `npm run check-env` - Verifica que todas las variables de entorno estén configuradas

## 🚢 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Agrega las variables de entorno en la configuración:
   - Todas las variables de `.env.local`
   - **IMPORTANTE**: `NEXT_PUBLIC_APP_URL` debe ser tu dominio de producción
3. Deploy automático

### Desarrollo con ngrok

Para desarrollo local con webhooks de Flow.cl:

1. Instala ngrok: `npm install -g ngrok`
2. Inicia ngrok: `ngrok http 3000`
3. Copia el dominio (ej: `d70bc66e4bf6.ngrok-free.app`)
4. Agrega a `.env.local`:
   ```
   NEXT_PUBLIC_APP_URL=https://d70bc66e4bf6.ngrok-free.app
   NEXT_PUBLIC_NGROK_DOMAIN=d70bc66e4bf6.ngrok-free.app
   ```
5. Configura el webhook de Flow.cl en su dashboard con: `https://tu-dominio-ngrok.ngrok-free.app/api/payment/webhook`

### Otros proveedores

Asegúrate de:
- Configurar todas las variables de entorno
- Configurar `NEXT_PUBLIC_APP_URL` con tu dominio público
- Configurar el webhook de Flow.cl con tu dominio público

## 📚 Documentación Adicional

- `docs/ADMIN_SETUP.md` - Configuración de administradores
- `docs/API_SECURITY.md` - Seguridad de APIs
- `docs/ASSOCIATE_JAR_FILES.md` - Asociar archivos JAR manualmente
- `docs/AUDIT_LOGS.md` - Sistema de logs de auditoría
- `docs/PLUGINS_SETUP.md` - Configuración de plugins
- `docs/RATE_LIMITING.md` - Configuración de rate limiting
- `docs/SUPABASE_STORAGE_SETUP.md` - Configuración de Supabase Storage
- `docs/VERSIONES_PLUGINS.md` - Sistema de versiones

## 🏗️ Arquitectura

### Servicios
El proyecto utiliza una arquitectura basada en servicios:
- `OrderService` - Gestión de órdenes
- `PaymentService` - Gestión de pagos
- `WebhookService` - Procesamiento de webhooks

### Hooks Personalizados
- `useCheckout` - Lógica de checkout
- `useUserOrders` - Obtener órdenes del usuario
- `useUserProducts` - Obtener productos del usuario

### Sistema de Logging
- Logging centralizado en `lib/logger.ts`
- Niveles: debug, info, warn, error
- Logs estructurados en JSON

## 🐛 Troubleshooting

### Error: "urlConfirmation is not valid URL"
- Verifica que `NEXT_PUBLIC_APP_URL` esté configurada con `https://`
- No uses `localhost` en producción
- Para desarrollo, usa ngrok

### Error: "Invalid Server Actions request"
- Verifica `experimental.serverActions.allowedOrigins` en `next.config.js`
- Agrega tu dominio ngrok si usas uno

### Error: "Flow credentials not configured"
- Verifica que `FLOW_API_KEY` y `FLOW_SECRET_KEY` estén en `.env.local`
- Ejecuta `npm run check-env` para verificar

## 📄 Licencia

MIT

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor abre un issue o pull request.

## 📧 Soporte

Para soporte, abre un issue en el repositorio.
