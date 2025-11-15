# Scripts SQL para Actualizar Metadatos de Usuario

## Script: update_minecraft_username.sql

Este script actualiza el campo `full_name` en los metadatos de usuario con el valor de `minecraft_username` que ya está guardado.

### Cómo usar:

1. Ve al **SQL Editor** en tu proyecto de Supabase
2. Copia y pega el contenido de `update_minecraft_username.sql`
3. Ejecuta el script

### Qué hace el script:

- Actualiza `raw_user_meta_data->>'full_name'` con el valor de `raw_user_meta_data->>'minecraft_username'`
- Solo actualiza usuarios que tienen `minecraft_username` definido
- Muestra un resumen de los usuarios actualizados

### Opciones disponibles:

El script incluye 3 opciones (solo una está activa por defecto):

**Opción 1 (Activa por defecto):** Reemplaza `full_name` con `minecraft_username`

**Opción 2 (Comentada):** Sincroniza `full_name` con `minecraft_username` solo si son diferentes

**Opción 3 (Comentada):** Elimina el campo `full_name` y mantiene solo `minecraft_username`

### Ejemplo de resultado:

Antes:
```json
{
  "minecraft_username": "AeroSama7",
  "minecraft_uuid": "abc123...",
  "full_name": "Juan Pérez"
}
```

Después:
```json
{
  "minecraft_username": "AeroSama7",
  "minecraft_uuid": "abc123...",
  "full_name": "AeroSama7"
}
```

### Notas importantes:

- Este script es **seguro** y solo actualiza usuarios que tienen `minecraft_username`
- No elimina ningún dato, solo actualiza `full_name`
- Puedes ejecutarlo múltiples veces sin problemas
- Se recomienda hacer un backup antes de ejecutar en producción

