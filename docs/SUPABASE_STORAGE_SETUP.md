# Configuración de Supabase Storage para Plugins

## 📋 Paso 1: Obtener SUPABASE_SERVICE_ROLE_KEY

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Settings** (Configuración) → **API**
3. En la sección **Project API keys**, encontrarás:
   - **anon/public key** (ya la tienes como `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role key** ← Esta es la que necesitas
4. Haz clic en el ícono de **ojo** para revelar la `service_role` key
5. **⚠️ IMPORTANTE**: Esta clave tiene permisos completos, nunca la expongas en el frontend

## 📦 Paso 2: Crear el Bucket "plugins"

1. En Supabase Dashboard, ve a **Storage** → **Buckets**
2. Haz clic en **New bucket** o **Create bucket**
3. Configuración:
   - **Bucket name**: `plugins`
   - **Public bucket**: ❌ OFF (desactivado)
   - **Restrict file size**: ✅ ON (activado) - Límite: `52428800` (50 MB)
   - **Restrict MIME types**: ✅ ON (activado) - Tipo: `application/java-archive`
4. Haz clic en **Create**

## 🔒 Paso 3: Configurar Políticas de Seguridad (RLS)

Ve al **SQL Editor** en Supabase y ejecuta estas políticas:

```sql
-- Política para permitir subida de archivos solo a usuarios autenticados
-- (En producción, deberías agregar verificación de admin)
CREATE POLICY "Authenticated users can upload plugins" 
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'plugins' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir lectura de archivos solo a usuarios autenticados
-- (El acceso real se controla en las APIs del servidor)
CREATE POLICY "Authenticated users can read plugins" 
ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'plugins' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir eliminación solo a usuarios autenticados
-- (Útil para admin si necesitas eliminar archivos)
CREATE POLICY "Authenticated users can delete plugins" 
ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'plugins' 
  AND auth.role() = 'authenticated'
);
```

**Nota**: Estas políticas son básicas. En producción, deberías agregar verificación de que el usuario sea admin para subir/eliminar archivos.

## 🔑 Paso 4: Agregar Variable de Entorno

Agrega la `SUPABASE_SERVICE_ROLE_KEY` a tu archivo `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# Supabase Service Role Key (SOLO para operaciones del servidor)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**⚠️ IMPORTANTE**:
- Esta clave **NUNCA** debe estar en el frontend
- Solo se usa en API routes del servidor
- No la subas a Git (ya está en `.gitignore`)

## ✅ Paso 5: Verificar Configuración

Puedes verificar que todo esté configurado correctamente:

1. El bucket `plugins` existe en Storage
2. Las políticas RLS están activas
3. La variable `SUPABASE_SERVICE_ROLE_KEY` está en `.env.local`
4. Reinicia el servidor de desarrollo: `npm run dev`

## 🧪 Paso 6: Probar Subida de Plugin

Puedes probar subir un plugin usando curl o Postman:

```bash
curl -X POST http://localhost:3000/api/admin/plugins/upload \
  -H "Cookie: tu_cookie_de_sesion" \
  -F "file=@plugin.jar" \
  -F "name=Mi Plugin" \
  -F "description=Descripción del plugin" \
  -F "price=9990" \
  -F "category=plugin" \
  -F "plugin_version=1.0.0" \
  -F "minecraft_versions=[\"1.20.1\"]" \
  -F "author=Tu Nombre" \
  -F "active=true"
```

## 🔐 Seguridad Adicional (Opcional pero Recomendado)

Para mayor seguridad, puedes crear una función que verifique si el usuario es admin:

1. Agrega un campo `is_admin` a `user_metadata` en Supabase
2. Actualiza la política para verificar admin:

```sql
-- Función helper para verificar admin (opcional)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND raw_user_meta_data->>'is_admin' = 'true'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política actualizada para solo admins
DROP POLICY IF EXISTS "Authenticated users can upload plugins" ON storage.objects;
CREATE POLICY "Admins can upload plugins" 
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'plugins' 
  AND auth.role() = 'authenticated'
  AND is_admin(auth.uid())
);
```

## 📝 Resumen

✅ Bucket `plugins` creado
✅ Políticas RLS configuradas
✅ `SUPABASE_SERVICE_ROLE_KEY` agregada a `.env.local`
✅ Servidor reiniciado

¡Listo! El sistema de plugins está configurado y listo para usar.

