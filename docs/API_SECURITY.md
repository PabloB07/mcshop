# Seguridad de las APIs

## 🔒 APIs Protegidas y sus Medidas de Seguridad

### 1. `/api/admin/plugins/upload` - Subir Plugins

**Protecciones:**
- ✅ Requiere autenticación (usuario logueado)
- ✅ Verifica que el usuario sea admin (`is_admin: true` en user_metadata)
- ✅ Valida que el archivo sea `.jar`
- ✅ Limita tamaño máximo a 50MB
- ✅ Valida MIME type: `application/java-archive`

**Cómo funciona:**
```typescript
// 1. Verifica autenticación
const { user } = await supabase.auth.getUser();
if (!user) return 401;

// 2. Verifica admin
const isAdmin = await isUserAdmin(user.id);
if (!isAdmin) return 403;

// 3. Valida archivo
if (!file.name.endsWith('.jar')) return 400;
if (file.size > 50MB) return 400;
```

**No se puede usar con curl/wget sin:**
- Cookie de sesión válida
- Usuario autenticado
- Usuario marcado como admin

---

### 2. `/api/downloads/generate` - Generar URL de Descarga

**Protecciones:**
- ✅ Requiere autenticación
- ✅ Verifica que el usuario haya comprado el producto
- ✅ Verifica que la licencia esté activa (si existe)
- ✅ Verifica orden pagada como respaldo

**Cómo funciona:**
```typescript
// 1. Verifica autenticación
const { user } = await supabase.auth.getUser();
if (!user) return 401;

// 2. Verifica propiedad del producto
const userProduct = await verificarCompra(user.id, product_id);
if (!userProduct) return 403;

// 3. Verifica licencia activa
if (license.status !== 'active') return 403;
```

**No se puede usar con curl/wget sin:**
- Cookie de sesión válida
- Usuario autenticado
- Usuario que haya comprado el producto

---

### 3. `/api/downloads/[token]` - Descargar Plugin

**Protecciones:**
- ✅ Valida formato del token (64 caracteres hex)
- ✅ Requiere autenticación
- ✅ Verifica que el token pertenezca al usuario
- ✅ Verifica que el token no haya sido usado
- ✅ Verifica que el token no haya expirado (24 horas)
- ✅ Verifica que el usuario aún tenga acceso al producto
- ✅ Verifica que la licencia esté activa

**Cómo funciona:**
```typescript
// 1. Valida token
if (token.length !== 64) return 400;

// 2. Busca registro de descarga
const download = await buscarPorToken(token);
if (!download) return 404;

// 3. Verifica autenticación
const { user } = await supabase.auth.getUser();
if (!user) return 401;

// 4. Verifica propiedad del token
if (download.user_id !== user.id) return 403;

// 5. Verifica uso y expiración
if (download.used) return 410;
if (expired) return 410;

// 6. Verifica acceso actual al producto
const tieneAcceso = await verificarAcceso(user.id, product_id);
if (!tieneAcceso) return 403;
```

**No se puede usar con curl/wget sin:**
- Token válido de 64 caracteres
- Cookie de sesión válida
- Usuario autenticado que sea dueño del token
- Token no usado y no expirado
- Usuario con acceso actual al producto

---

### 4. `/api/admin/plugins/associate` - Asociar Archivo JAR

**Protecciones:**
- ✅ Requiere autenticación
- ✅ Verifica que el usuario sea admin
- ✅ Valida que el file_path esté en el bucket `plugins`
- ✅ Verifica que el producto exista

**No se puede usar con curl/wget sin:**
- Cookie de sesión válida
- Usuario autenticado
- Usuario marcado como admin

---

## 🛡️ Medidas de Seguridad Adicionales

### Rate Limiting (Recomendado para Producción)

Puedes agregar rate limiting usando middleware de Next.js:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Implementar rate limiting aquí
export function middleware(request: NextRequest) {
  // Limitar requests por IP
  // ...
}
```

### Validación de Tokens

- Los tokens son de 64 caracteres hexadecimales (256 bits)
- Se generan con `crypto.randomBytes(32)`
- Son únicos y no predecibles

### Verificación de Propiedad

- Cada token está vinculado a un `user_id` específico
- No se puede usar un token de otro usuario
- Se verifica en cada request

### Expiración

- Los tokens expiran después de 24 horas
- Una vez usado, el token se marca como `used = true`
- No se puede reutilizar

## 🚫 Lo que NO se puede hacer

1. **Descargar sin comprar:**
   - Se verifica `user_products` o `orders` con status `paid`
   - No hay forma de saltarse esta verificación

2. **Usar tokens de otros usuarios:**
   - Cada token está vinculado a un `user_id`
   - Se verifica en cada descarga

3. **Reutilizar tokens:**
   - Se marcan como `used = true` después del primer uso
   - No se pueden reutilizar

4. **Subir plugins sin ser admin:**
   - Se verifica `is_admin: true` en user_metadata
   - No hay forma de saltarse esta verificación

5. **Descargar con tokens expirados:**
   - Se verifica `expires_at` en cada request
   - Tokens expirados son rechazados

## ✅ Resumen de Seguridad

| API | Autenticación | Autorización | Validación | Protección |
|-----|---------------|--------------|------------|------------|
| `/api/admin/plugins/upload` | ✅ | Admin | Archivo .jar, tamaño | 🔒🔒🔒 |
| `/api/downloads/generate` | ✅ | Propietario | Compra verificada | 🔒🔒🔒 |
| `/api/downloads/[token]` | ✅ | Propietario | Token, expiración, uso | 🔒🔒🔒🔒 |
| `/api/admin/plugins/associate` | ✅ | Admin | Producto existe | 🔒🔒🔒 |

**Nivel de seguridad: 🔒🔒🔒🔒 (Muy Alto)**

Las APIs están completamente protegidas y no se pueden usar con curl/wget sin las credenciales y permisos adecuados.

