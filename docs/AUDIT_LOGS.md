# Sistema de Logs de Auditoría

## 📋 Eventos Registrados

El sistema registra automáticamente los siguientes eventos:

### Acciones de Plugins
- `plugin_uploaded` - Plugin subido
- `plugin_associated` - Archivo JAR asociado con producto
- `download_generated` - URL de descarga generada
- `download_completed` - Descarga completada

### Acciones de Órdenes
- `order_created` - Orden creada
- `order_paid` - Orden pagada

### Acciones de Licencias
- `license_verified` - Licencia verificada
- `license_revoked` - Licencia revocada

## 📊 Información Registrada

Cada evento incluye:
- `user_id` - Usuario que realizó la acción
- `action` - Tipo de acción
- `resource_type` - Tipo de recurso (product, order, license, etc.)
- `resource_id` - ID del recurso afectado
- `details` - Información adicional (JSON)
- `ip_address` - IP del cliente
- `user_agent` - User agent del navegador
- `created_at` - Timestamp del evento

## 🔍 Consultar Logs

### API (Solo Admins)

```bash
# Obtener todos los logs
GET /api/admin/audit-logs

# Filtrar por acción
GET /api/admin/audit-logs?action=download_completed

# Filtrar por tipo de recurso
GET /api/admin/audit-logs?resource_type=product

# Filtrar por usuario
GET /api/admin/audit-logs?user_id=uuid-del-usuario

# Paginación
GET /api/admin/audit-logs?limit=50&offset=0
```

### SQL Directo

```sql
-- Ver últimos 100 eventos
SELECT * FROM audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- Eventos de un usuario específico
SELECT * FROM audit_logs
WHERE user_id = 'uuid-del-usuario'
ORDER BY created_at DESC;

-- Eventos de descargas
SELECT * FROM audit_logs
WHERE action = 'download_completed'
ORDER BY created_at DESC;
```

## 🔒 Seguridad

- Solo administradores pueden ver los logs
- Los logs son inmutables (no se pueden editar ni eliminar)
- Se almacenan permanentemente para auditoría

## 📈 Análisis

Puedes usar los logs para:
- Detectar patrones de uso
- Identificar problemas de seguridad
- Analizar comportamiento de usuarios
- Auditoría de cumplimiento

## 🧹 Limpieza (Opcional)

Para mantener la base de datos optimizada, puedes crear un job que elimine logs antiguos:

```sql
-- Eliminar logs más antiguos de 1 año
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

