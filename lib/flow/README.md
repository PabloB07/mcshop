# Flow.cl API Integration

Implementación completa de la API de Flow.cl según la [documentación oficial](https://developers.flow.cl/api#section/Introduccion).

## Configuración

### Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
FLOW_API_KEY=tu_api_key
FLOW_SECRET_KEY=tu_secret_key
FLOW_ENVIRONMENT=sandbox  # o 'production'
NEXT_PUBLIC_APP_URL=http://localhost:3000  # o tu URL de producción
```

### Obtener Credenciales

Puedes obtener tus credenciales desde:

- **Sandbox**: https://sandbox.flow.cl/app/web/misDatos.php
- **Producción**: https://www.flow.cl/app/web/misDatos.php

## Autenticación y Firma

Según la [documentación oficial de Flow](https://developers.flow.cl/api#section/Introduccion), todas las solicitudes deben estar firmadas con la `SecretKey`:

1. **Excluir el parámetro 's'** de la firma (es donde va la firma)
2. **Ordenar parámetros** alfabéticamente ascendente
3. **Concatenar**: `Nombre_parametro + Valor` (sin separadores)
4. **Generar HMAC-SHA256** con la SecretKey

Ejemplo:
```
Parámetros: apiKey=ABC, commerceOrder=123, amount=1000
Cadena a firmar: "apiKeyABCcommerceOrder123amount1000"
```

## Métodos Implementados

### Payment (Pagos)

- ✅ `createPaymentOrder()` - Genera una orden de pago
- ✅ `getPaymentStatus()` - Obtiene el estado de un pago por token
- ✅ `getPaymentStatusByCommerceOrder()` - Obtiene el estado por commerceOrder
- ✅ `getTransactions()` - Obtiene el listado de transacciones realizadas en un día

### Refund (Reembolsos)

- ✅ `createRefund()` - Crea un reembolso
- ✅ `getRefundStatus()` - Obtiene el estado de un reembolso
- ✅ `cancelRefund()` - Cancela un reembolso

## Uso

```typescript
import { createFlowAPI } from '@/lib/flow/api';

// Crear instancia
const flowAPI = createFlowAPI();

// Crear orden de pago
const payment = await flowAPI.createPaymentOrder({
  commerceOrder: 'ORDER-123',
  subject: 'Compra de productos',
  amount: 30000,
  email: 'cliente@example.com',
  currency: 'CLP',
  urlReturn: 'https://tudominio.com/success',
  urlConfirmation: 'https://tudominio.com/webhook',
});

// Obtener estado de pago
const status = await flowAPI.getPaymentStatus(payment.token);

// Obtener transacciones de un día
const transactions = await flowAPI.getTransactions({
  date: '2024-01-15', // Formato YYYY-MM-DD
  start: 0, // Opcional: inicio de paginación (default: 0)
  limit: 50, // Opcional: registros por página (default: 10, max: 100)
});

// Crear reembolso
const refund = await flowAPI.createRefund({
  token: payment.token,
  amount: 30000,
  comment: 'Reembolso solicitado por el cliente',
});
```

## Endpoints

Según la [documentación oficial de Flow](https://developers.flow.cl/api#section/Introduccion/Acceso-al-API):

| Site       | Base URL for Rest Endpoints |
| ---------- | --------------------------- |
| Production | `https://www.flow.cl/api`    |
| Sandbox    | `https://sandbox.flow.cl/api` |

El endpoint de Producción proporciona acceso directo para generar transacciones reales. El endpoint Sandbox permite probar su integración sin afectar los datos reales.

## Referencias

- [Documentación Oficial de Flow](https://developers.flow.cl/api#section/Introduccion)
- [Quickstart Guide](https://developers.flow.cl/docs/quick-start)
- [Pago Ecommerce](https://developers.flow.cl/docs/category/pago-ecommerce)

