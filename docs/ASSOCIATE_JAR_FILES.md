# Asociar Archivos JAR Subidos Manualmente

## 📤 Paso 1: Subir Archivo en Supabase Storage

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Storage** → **Buckets** → **plugins**
3. Haz clic en **Upload file** o arrastra el archivo
4. Sube tu archivo `.jar`
5. **Copia la ruta completa del archivo** (ej: `plugins/mi-plugin-v1.0.0.jar`)

## 🔗 Paso 2: Asociar con un Producto

### Opción A: Usando la API (Recomendado)

```bash
curl -X POST http://localhost:3000/api/admin/plugins/associate \
  -H "Content-Type: application/json" \
  -H "Cookie: tu_cookie_de_sesion" \
  -d '{
    "product_id": "uuid-del-producto",
    "file_path": "plugins/mi-plugin-v1.0.0.jar",
    "file_size": 1234567
  }'
```

### Opción B: Desde SQL Editor (Directo)

```sql
-- Actualizar producto con la ruta del archivo
UPDATE products
SET 
  jar_file_path = 'plugins/mi-plugin-v1.0.0.jar',
  jar_file_size = 1234567  -- Tamaño en bytes (opcional)
WHERE id = 'uuid-del-producto';
```

## ✅ Verificar

Después de asociar, el producto debería mostrar el archivo disponible para descarga cuando un usuario lo compre.

## 📝 Notas

- El `file_path` debe comenzar con `plugins/`
- El `file_size` es opcional pero recomendado
- Solo usuarios admin pueden usar la API de asociación
- El producto debe existir antes de asociar el archivo

