# Sistema de Rangos y Integración con Minecraft

Este documento explica cómo usar el sistema completo de venta de rangos, items y dinero en juego mediante el sitio web MCShop.

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Configuración Inicial](#configuración-inicial)
3. [Crear Rangos](#crear-rangos)
4. [Crear Items y Dinero](#crear-items-y-dinero)
5. [Configurar Servidores](#configurar-servidores)
6. [Plugin Java](#plugin-java)
7. [Flujo de Compra](#flujo-de-compra)
8. [APIs para el Plugin](#apis-para-el-plugin)

## 🎯 Descripción General

El sistema permite vender:
- **Rangos**: Aplicados mediante LuckPerms
- **Items**: Items del juego con comandos personalizados
- **Dinero**: Dinero en juego (Vault, PlayerPoints, custom)
- **Plugins**: Plugins descargables (sistema existente)

Cuando un usuario compra un rango/item/dinero:
1. El usuario selecciona el producto y un usuario de Minecraft
2. Realiza el pago mediante Flow.cl
3. El webhook procesa el pago
4. Se crea una orden de Minecraft
5. El plugin Java aplica el rango/item/dinero en el servidor

## ⚙️ Configuración Inicial

### 1. Ejecutar Migraciones

Ejecuta la migración SQL en Supabase:

```sql
-- Ejecutar en el SQL Editor de Supabase
-- Archivo: supabase/migrations/004_ranks_minecraft_integration.sql
```

Esta migración crea:
- Tabla `minecraft_servers` - Configuración de servidores
- Tabla `ranks` - Rangos de Minecraft
- Tabla `rank_commands` - Comandos para aplicar rangos
- Tabla `game_items` - Items del juego
- Tabla `game_money` - Dinero en juego
- Tabla `minecraft_orders` - Tracking de órdenes de Minecraft
- Tabla `executed_commands` - Log de comandos ejecutados

### 2. Configurar Servidor de Minecraft

1. Ve a `/admin/servers`
2. Crea un nuevo servidor con:
   - **Nombre**: Nombre del servidor
   - **Host**: IP o dominio del servidor
   - **Port**: Puerto del servidor (default: 25565)
   - **Webhook URL**: URL donde el plugin Java escucha comandos (ver sección Plugin Java)
   - **RCON** (opcional): Si prefieres usar RCON en lugar de webhook

3. **IMPORTANTE**: Guarda el `api_key` y `api_secret` que se generan. Los necesitarás para el plugin Java.

## 🎖️ Crear Rangos

### Desde el Admin Panel

1. Ve a `/admin/ranks`
2. Haz clic en "Nuevo Rango"
3. Completa el formulario:
   - **Nombre del Producto**: Nombre que verán los usuarios
   - **Precio**: Precio en pesos chilenos
   - **Grupo LuckPerms**: Nombre del grupo en LuckPerms (ej: `vip`, `premium`)
   - **Prioridad**: Número de prioridad (mayor = más importante)
   - **Prefijo**: Prefijo del rango (ej: `&7[&aVIP&7]`)
   - **Sufijo**: Sufijo del rango
   - **Peso (Weight)**: Peso del rango en LuckPerms
   - **Permisos**: Permisos adicionales separados por coma

### Comandos Personalizados

Puedes agregar comandos personalizados después de crear el rango editando la tabla `rank_commands` o mediante la API.

Los comandos soportan placeholders:
- `{username}` - Nombre de usuario de Minecraft
- `{uuid}` - UUID del jugador
- `{group}` - Grupo de LuckPerms

Ejemplo de comandos:
```
lp user {username} parent set {group}
give {username} diamond 64
```

## 💎 Crear Items y Dinero

### Items

1. Ve a `/admin/items` (o usa la API `/api/admin/products/create`)
2. Crea un producto con `product_type: 'item'`
3. Especifica:
   - **item_type**: Tipo de item (`item`, `command`, `kit`)
   - **item_id**: ID del item (ej: `diamond_sword`)
   - **quantity**: Cantidad
   - **commands**: Array de comandos para dar el item

### Dinero

1. Crea un producto con `product_type: 'money'`
2. Especifica:
   - **amount**: Cantidad de dinero
   - **currency_type**: Tipo (`vault`, `playerpoints`, `custom`)
   - **command**: Comando personalizado (opcional)

Comandos por defecto según `currency_type`:
- `vault`: `eco give {username} {amount}`
- `playerpoints`: `points give {username} {amount}`
- `custom`: Requiere especificar `command`

## 🖥️ Configurar Servidores

### Método 1: Webhook (Recomendado)

El plugin Java debe exponer un endpoint HTTP que reciba comandos:

```java
// Ejemplo de endpoint en el plugin
@PostMapping("/execute")
public ResponseEntity<?> executeCommand(@RequestBody CommandRequest request) {
    // Verificar autenticación
    // Ejecutar comando en el servidor
    // Retornar resultado
}
```

Configura la `webhook_url` en el admin panel con la URL del plugin.

### Método 2: RCON (Fallback)

Si no puedes usar webhook, puedes configurar RCON:
- **rcon_host**: IP del servidor
- **rcon_port**: Puerto RCON (default: 25575)
- **rcon_password**: Contraseña RCON

**Nota**: RCON requiere implementación adicional. Se recomienda usar webhook.

## 🔌 Plugin Java

### Estructura del Plugin

El plugin Java debe:

1. **Autenticarse con la API** usando `api_key` y `api_secret`
2. **Obtener órdenes pendientes** desde `/api/minecraft/plugin/pending-orders`
3. **Ejecutar comandos** en el servidor
4. **Confirmar órdenes** en `/api/minecraft/plugin/confirm-order`

### Autenticación

Todas las requests deben incluir:
- Header `X-API-Key`: API key del servidor
- Header `X-Signature`: HMAC SHA256 del body usando `api_secret`

Ejemplo en Java:
```java
String body = requestBody.toString();
String signature = HmacUtils.hmacSha256Hex(apiSecret, body);

HttpHeaders headers = new HttpHeaders();
headers.set("X-API-Key", apiKey);
headers.set("X-Signature", signature);
```

### Obtener Órdenes Pendientes

```http
GET /api/minecraft/plugin/pending-orders
Headers:
  X-API-Key: tu-api-key
  X-Signature: hmac-signature
```

Respuesta:
```json
{
  "success": true,
  "orders": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "minecraft_username": "PlayerName",
      "minecraft_uuid": "uuid",
      "status": "pending",
      "order": {
        "status": "paid",
        "order_items": [
          {
            "product": {
              "product_type": "rank",
              "ranks": {
                "luckperms_group": "vip"
              }
            }
          }
        ]
      }
    }
  ]
}
```

### Aplicar Rango/Item/Dinero

Para cada orden pendiente:

1. **Rango**: Ejecutar comando LuckPerms
   ```java
   String command = "lp user " + username + " parent set " + rankGroup;
   Bukkit.dispatchCommand(Bukkit.getConsoleSender(), command);
   ```

2. **Item**: Ejecutar comando de dar item
   ```java
   String command = "give " + username + " diamond 64";
   Bukkit.dispatchCommand(Bukkit.getConsoleSender(), command);
   ```

3. **Dinero**: Ejecutar comando de economía
   ```java
   String command = "eco give " + username + " " + amount;
   Bukkit.dispatchCommand(Bukkit.getConsoleSender(), command);
   ```

### Confirmar Orden

```http
POST /api/minecraft/plugin/confirm-order
Headers:
  X-API-Key: tu-api-key
  X-Signature: hmac-signature
Body:
{
  "minecraft_order_id": "uuid",
  "success": true,
  "error_message": null
}
```

## 🛒 Flujo de Compra

1. **Usuario navega productos** en `/products`
2. **Agrega al carrito** un rango/item/dinero
3. **Va a checkout** (`/checkout`)
4. **Ingresa usuario de Minecraft** (si es necesario)
5. **Paga con Flow.cl**
6. **Webhook procesa pago**:
   - Crea orden de Minecraft
   - Marca como `pending`
7. **Plugin Java**:
   - Obtiene órdenes pendientes
   - Aplica rango/item/dinero
   - Confirma orden
8. **Orden marcada como `applied`**

## 📡 APIs para el Plugin

### Endpoints Disponibles

#### 1. Obtener Órdenes Pendientes
```
GET /api/minecraft/plugin/pending-orders
```

#### 2. Confirmar Orden
```
POST /api/minecraft/plugin/confirm-order
Body: {
  minecraft_order_id: string,
  success: boolean,
  error_message?: string
}
```

#### 3. Reportar Ejecución de Comando
```
POST /api/minecraft/plugin/execute
Body: {
  command: string,
  command_type: string,
  executed_command_id?: string,
  success: boolean,
  response?: string,
  error?: string
}
```

### Seguridad

- Todas las requests requieren autenticación HMAC
- Rate limiting aplicado
- Solo servidores activos pueden acceder
- Logs de auditoría para todas las operaciones

## 🔍 Troubleshooting

### El rango no se aplica

1. Verifica que el servidor esté activo en `/admin/servers`
2. Verifica que el webhook_url esté correcto
3. Revisa los logs en `executed_commands`
4. Verifica que el plugin Java esté ejecutándose

### Error de autenticación

1. Verifica que `api_key` y `api_secret` sean correctos
2. Verifica que la firma HMAC sea correcta
3. Revisa que el servidor esté activo

### Órdenes no aparecen

1. Verifica que la orden esté pagada (`status: 'paid'`)
2. Verifica que el servidor_id coincida (o sea null para todos)
3. Revisa los logs de `minecraft_orders`

## 📚 Recursos Adicionales

- [Documentación de LuckPerms](https://luckperms.net/)
- [API de Flow.cl](https://www.flow.cl/docs/api)
- [PaperMC API](https://papermc.io/javadocs/)

