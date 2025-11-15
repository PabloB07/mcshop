-- Script SQL para actualizar full_name con minecraft_username
-- Ejecuta este script en el SQL Editor de Supabase
-- Este script reemplaza el campo full_name con el minecraft_username existente

-- Opción 1: Actualización directa (recomendada)
-- Actualiza todos los usuarios que tienen minecraft_username
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{full_name}',
    to_jsonb(COALESCE(raw_user_meta_data->>'minecraft_username', '')),
    true
  ),
  updated_at = NOW()
WHERE 
  raw_user_meta_data->>'minecraft_username' IS NOT NULL
  AND raw_user_meta_data->>'minecraft_username' != '';

-- Verificación: Ver los usuarios actualizados
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'minecraft_username' as minecraft_username,
  raw_user_meta_data->>'minecraft_uuid' as minecraft_uuid,
  created_at,
  updated_at
FROM auth.users
WHERE raw_user_meta_data->>'minecraft_username' IS NOT NULL
ORDER BY updated_at DESC;

-- Opción 2: Si quieres mantener ambos campos pero sincronizar full_name con minecraft_username
-- (Descomenta si prefieres esta opción)
/*
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{full_name}',
    to_jsonb(COALESCE(raw_user_meta_data->>'minecraft_username', '')),
    true
  ),
  updated_at = NOW()
WHERE 
  raw_user_meta_data->>'minecraft_username' IS NOT NULL
  AND raw_user_meta_data->>'minecraft_username' != ''
  AND (
    raw_user_meta_data->>'full_name' IS NULL 
    OR raw_user_meta_data->>'full_name' != raw_user_meta_data->>'minecraft_username'
  );
*/

-- Opción 3: Si quieres eliminar full_name y solo mantener minecraft_username
-- (Descomenta si prefieres esta opción)
/*
UPDATE auth.users
SET 
  raw_user_meta_data = raw_user_meta_data - 'full_name',
  updated_at = NOW()
WHERE 
  raw_user_meta_data->>'minecraft_username' IS NOT NULL
  AND raw_user_meta_data->>'full_name' IS NOT NULL;
*/

