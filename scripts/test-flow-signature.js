/**
 * Script de prueba para verificar la firma de Flow
 * Ejecutar con: node scripts/test-flow-signature.js
 * 
 * Asegúrate de tener las variables de entorno configuradas:
 * FLOW_API_KEY=tu_api_key
 * FLOW_SECRET_KEY=tu_secret_key
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const apiKey = process.env.FLOW_API_KEY;
const secretKey = process.env.FLOW_SECRET_KEY;

if (!apiKey || !secretKey) {
  console.error('❌ Error: FLOW_API_KEY y FLOW_SECRET_KEY deben estar configuradas en .env.local');
  process.exit(1);
}

// Parámetros de ejemplo según el quickstart de Flow
const params = {
  apiKey: apiKey,
  commerceOrder: 'ORDER-TEST-123',
  urlConfirmation: 'https://mydomain.com/confirmation',
  urlReturn: 'https://mydomain.com/payment-status',
  email: 'test@example.com',
  subject: 'Compra de articulos en tienda online',
  amount: 30000
};

console.log('🧪 Probando firma de Flow...\n');
console.log('Parámetros:', params);
console.log('');

// Generar firma según el quickstart
const keys = Object.keys(params).sort();
let toSign = "";
for (let i = 0; i < keys.length; i++) {
  const key = keys[i];
  toSign += key + params[key];
}

console.log('Cadena a firmar:', toSign);
console.log('Longitud:', toSign.length);
console.log('');

const signature = crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");

console.log('✅ Firma generada:', signature);
console.log('');

// Verificar que la firma tenga el formato correcto (64 caracteres hex)
if (signature.length === 64 && /^[0-9a-f]+$/.test(signature)) {
  console.log('✅ La firma tiene el formato correcto (64 caracteres hexadecimales)');
} else {
  console.error('❌ La firma no tiene el formato correcto');
}

// Mostrar cómo se enviaría a Flow
const body = {
  ...params,
  s: signature
};

console.log('\n📦 Body que se enviaría a Flow:');
console.log(JSON.stringify(body, null, 2));

