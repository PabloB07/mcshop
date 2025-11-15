# Configuración del Sistema de Plugins

## 📋 Requisitos Previos

1. **Supabase Storage Bucket**: Necesitas crear un bucket llamado `plugins` en Supabase Storage
2. **Service Role Key**: Necesitas la `SUPABASE_SERVICE_ROLE_KEY` para subir archivos
3. **Variables de Entorno**: Agregar `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`

## 🗄️ Configuración de Base de Datos

Ejecuta la migración SQL en Supabase:

```bash
# Ejecuta el archivo en el SQL Editor de Supabase
supabase/migrations/002_plugins_licenses_downloads.sql
```

## 📦 Configuración de Supabase Storage

1. Ve a tu proyecto de Supabase
2. Navega a **Storage** → **Buckets**
3. Crea un nuevo bucket llamado `plugins`
4. Configura las políticas:

```sql
-- Política para permitir lectura pública de plugins (opcional)
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'plugins');

-- Política para permitir subida solo a usuarios autenticados (admin)
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'plugins' 
  AND auth.role() = 'authenticated'
);
```

## 🔑 Variables de Entorno

Agrega a tu `.env.local`:

```env
# Supabase Service Role Key (para operaciones admin)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**⚠️ IMPORTANTE**: Nunca expongas la `SUPABASE_SERVICE_ROLE_KEY` en el frontend. Solo úsala en API routes del servidor.

## 📤 Subir Plugins (Admin)

### Opción 1: Usando la API

```bash
curl -X POST http://localhost:3000/api/admin/plugins/upload \
  -F "file=@plugin.jar" \
  -F "name=Mi Plugin" \
  -F "description=Descripción del plugin" \
  -F "price=9990" \
  -F "category=plugin" \
  -F "plugin_version=1.0.0" \
  -F "minecraft_versions=[\"1.20.1\",\"1.20.2\"]" \
  -F "author=Tu Nombre" \
  -F "active=true"
```

### Opción 2: Crear página de admin (TODO)

Puedes crear una página `/admin/plugins/upload` para subir plugins desde la interfaz.

## 🔐 Sistema de Licencias

### Verificar Licencia (desde el plugin de Minecraft)

```typescript
// Ejemplo de verificación desde un plugin de Minecraft
const response = await fetch('https://tu-dominio.com/api/licenses/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    license_key: 'XXXX-XXXX-XXXX-XXXX',
    product_id: 'uuid-del-producto', // Opcional
  }),
});

const data = await response.json();
if (data.valid) {
  // Licencia válida
  console.log('Producto:', data.license.product_name);
} else {
  // Licencia inválida
  console.error('Error:', data.error);
}
```

## 📥 Sistema de Descargas

### Generar URL de Descarga

Cuando un usuario compra un plugin, el sistema automáticamente:
1. Crea una licencia única
2. Genera una URL de descarga con token único
3. La URL expira en 24 horas
4. La URL solo puede usarse una vez

### Descargar desde el Dashboard

Los usuarios pueden descargar sus plugins desde `/dashboard`:
- Ver todos sus plugins comprados
- Ver sus licencias
- Generar nuevas URLs de descarga si expiraron

## 📧 Emails (TODO)

Actualmente el sistema prepara los datos para enviar emails pero no los envía automáticamente.

Para implementar envío de emails:

1. **Opción 1: Supabase Edge Functions con Resend**
   - Crear Edge Function en Supabase
   - Configurar Resend API
   - Llamar desde el webhook

2. **Opción 2: API Route con Resend**
   - Instalar `resend`: `npm install resend`
   - Crear `/api/email/send`
   - Llamar desde el webhook

3. **Opción 3: Otro servicio de email**
   - SendGrid
   - Mailgun
   - AWS SES

## 🗂️ Estructura de Tablas

### `licenses`
- Almacena las licencias generadas para cada compra
- Cada usuario recibe una licencia única por producto

### `user_products`
- Relación entre usuarios y productos comprados
- Vincula licencias con productos

### `product_downloads`
- URLs de descarga temporales
- Tokens únicos de un solo uso
- Expiración de 24 horas

## 🔒 Seguridad

- Las URLs de descarga solo funcionan una vez
- Las URLs expiran después de 24 horas
- Solo usuarios autenticados pueden generar descargas
- Solo usuarios que compraron el producto pueden descargarlo
- Las licencias se verifican en el servidor

## 📝 Próximos Pasos

1. ✅ Migración SQL creada
2. ✅ APIs de subida y descarga creadas
3. ✅ Dashboard actualizado
4. ✅ Sistema de licencias implementado
5. ⏳ Configurar Supabase Storage bucket
6. ⏳ Implementar envío de emails
7. ⏳ Crear página de admin para subir plugins
8. ⏳ Agregar verificación de admin en API de upload

