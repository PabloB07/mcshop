# Configuración de Administradores

## 🔐 Hacer un Usuario Administrador

Para que un usuario pueda subir plugins y realizar operaciones administrativas, necesitas marcarlo como admin en Supabase.

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **Users**
3. Encuentra el usuario que quieres hacer admin
4. Haz clic en el usuario para ver sus detalles
5. En **User Metadata**, agrega o edita:
   ```json
   {
     "is_admin": true
   }
   ```
6. Guarda los cambios

### Opción 2: Desde SQL Editor

```sql
-- Actualizar user_metadata para hacer un usuario admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'::jsonb
)
WHERE email = 'tu-email@ejemplo.com';
```

### Opción 3: Desde la API (Programáticamente)

Puedes crear una función en Supabase para hacer usuarios admin:

```sql
-- Función para hacer un usuario admin
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{is_admin}',
    'true'::jsonb
  )
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uso:
SELECT make_user_admin('admin@ejemplo.com');
```

## ✅ Verificar que un Usuario es Admin

Los usuarios admin tienen `is_admin: true` en su `user_metadata`. El sistema verifica esto automáticamente en las APIs protegidas.

## 🔒 APIs Protegidas

Las siguientes APIs requieren ser admin:

- `POST /api/admin/plugins/upload` - Subir plugins
- `POST /api/admin/plugins/associate` - Asociar archivos JAR con productos

## 📝 Notas de Seguridad

- Solo usuarios con `is_admin: true` pueden subir plugins
- Las descargas están protegidas: solo usuarios que compraron el producto pueden descargar
- Los tokens de descarga son únicos y de un solo uso
- Los tokens expiran después de 24 horas

