# Sistema de Versiones de Plugins

## 📦 Concepto

El sistema de versiones permite:
- Mantener múltiples versiones del mismo plugin
- Activar/desactivar versiones específicas
- Los usuarios siempre descargan la versión activa
- Historial completo de versiones con changelog

## 🗄️ Estructura

### Tabla `plugin_versions`
- `id` - UUID único
- `product_id` - Referencia al producto
- `version` - Número de versión (ej: "1.0.0", "2.1.3")
- `jar_file_path` - Ruta del archivo JAR en Storage
- `jar_file_size` - Tamaño del archivo
- `changelog` - Notas de cambios
- `is_active` - Si es la versión activa
- `release_date` - Fecha de lanzamiento

## 🔄 Flujo de Trabajo

### 1. Crear Nueva Versión

```bash
curl -X POST http://localhost:3000/api/admin/plugins/versions \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "uuid-del-producto",
    "version": "2.0.0",
    "jar_file_path": "plugins/plugin-v2.0.0.jar",
    "jar_file_size": 1234567,
    "changelog": "Nuevas características y correcciones",
    "is_active": true
  }'
```

**Comportamiento:**
- Si `is_active: true`, automáticamente desactiva las versiones anteriores
- Actualiza el producto principal con la nueva versión
- Los usuarios descargarán automáticamente la nueva versión activa

### 2. Obtener Versiones de un Plugin

```bash
curl "http://localhost:3000/api/admin/plugins/versions?product_id=uuid-del-producto"
```

### 3. Activar/Desactivar Versión

```bash
curl -X PATCH http://localhost:3000/api/admin/plugins/versions \
  -H "Content-Type: application/json" \
  -d '{
    "version_id": "uuid-de-la-version",
    "is_active": true
  }'
```

## 📥 Descarga Automática de Versión Activa

Cuando un usuario descarga un plugin:
1. El sistema busca la versión activa en `plugin_versions`
2. Si existe, usa esa versión
3. Si no existe, usa `jar_file_path` del producto (compatibilidad hacia atrás)

## 🔄 Migración desde Sistema Anterior

Si ya tienes plugins con `jar_file_path` en `products`:
1. Los plugins seguirán funcionando
2. Puedes crear versiones nuevas usando la API
3. La primera versión puede usar el mismo `jar_file_path`

## 📝 Ejemplo de Uso

```typescript
// 1. Subir JAR v2.0.0 manualmente en Supabase Storage
// Ruta: plugins/mi-plugin-v2.0.0.jar

// 2. Crear versión
POST /api/admin/plugins/versions
{
  "product_id": "abc-123",
  "version": "2.0.0",
  "jar_file_path": "plugins/mi-plugin-v2.0.0.jar",
  "changelog": "Nueva versión con mejoras",
  "is_active": true
}

// 3. Los usuarios ahora descargarán v2.0.0 automáticamente

// 4. Si necesitas volver a v1.0.0
PATCH /api/admin/plugins/versions
{
  "version_id": "version-1-uuid",
  "is_active": true
}
```

## 🔒 Seguridad

- Solo admins pueden crear/actualizar versiones
- Los usuarios siempre descargan la versión activa
- No pueden elegir versiones específicas (previene downgrades no autorizados)

