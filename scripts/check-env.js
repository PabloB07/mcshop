#!/usr/bin/env node

/**
 * Script para verificar que todas las variables de entorno estén configuradas
 * Ejecutar con: node scripts/check-env.js
 */

const path = require('path');
const fs = require('fs');

// Obtener el path absoluto del archivo .env.local
const envPath = path.resolve(process.cwd(), '.env.local');

// Verificar que el archivo existe
if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: No se encontró el archivo .env.local');
  console.error(`   Buscado en: ${envPath}`);
  console.error('\n   Crea el archivo .env.local con las siguientes variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   - FLOW_API_KEY');
  console.error('   - FLOW_SECRET_KEY');
  console.error('   - FLOW_ENVIRONMENT (opcional, por defecto: sandbox)');
  console.error('   - NEXT_PUBLIC_APP_URL (opcional, por defecto: http://localhost:3000)');
  console.error('\n   Puedes usar .env.local.example como referencia.');
  process.exit(1);
}

// Cargar variables de entorno
const result = require('dotenv').config({ path: envPath });

if (result.error) {
  console.error('❌ ERROR al cargar .env.local:', result.error.message);
  process.exit(1);
}

if (!result.parsed || Object.keys(result.parsed).length === 0) {
  console.error('❌ ERROR: El archivo .env.local está vacío o no tiene variables válidas');
  console.error(`   Archivo: ${envPath}`);
  console.error('\n   Asegúrate de que el archivo tenga el formato correcto:');
  console.error('   VARIABLE_NAME=valor');
  console.error('   VARIABLE_NAME="valor con espacios"');
  process.exit(1);
}

console.log(`✅ Archivo .env.local encontrado: ${envPath}`);
console.log(`✅ Variables cargadas: ${Object.keys(result.parsed).length}\n`);

const requiredVars = {
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL': {
    name: 'Supabase URL',
    description: 'URL de tu proyecto Supabase',
    getUrl: () => 'https://app.supabase.com/project/_/settings/api',
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    name: 'Supabase Anon Key',
    description: 'Clave anónima de Supabase',
    getUrl: () => 'https://app.supabase.com/project/_/settings/api',
  },
  // Flow.cl
  'FLOW_API_KEY': {
    name: 'Flow API Key',
    description: 'API Key de Flow.cl',
    getUrl: () => process.env.FLOW_ENVIRONMENT === 'production' 
      ? 'https://www.flow.cl/app/web/misDatos.php'
      : 'https://sandbox.flow.cl/app/web/misDatos.php',
  },
  'FLOW_SECRET_KEY': {
    name: 'Flow Secret Key',
    description: 'Secret Key de Flow.cl (mantén esto seguro)',
    getUrl: () => process.env.FLOW_ENVIRONMENT === 'production'
      ? 'https://www.flow.cl/app/web/misDatos.php'
      : 'https://sandbox.flow.cl/app/web/misDatos.php',
  },
  // Next.js
  'NEXT_PUBLIC_APP_URL': {
    name: 'Next.js App URL',
    description: 'URL de tu aplicación (requerida para Flow)',
    optional: false, // Requerida para que Flow pueda redirigir correctamente
    defaultValue: () => {
      // Si hay ngrok configurado, usar ese dominio
      const ngrokDomain = process.env.NEXT_PUBLIC_NGROK_DOMAIN;
      if (ngrokDomain) {
        return `https://${ngrokDomain}`;
      }
      return 'http://localhost:3000';
    },
    getUrl: () => 'Configura con tu URL de producción o ngrok para desarrollo',
  },
};

const optionalVars = {
  'FLOW_ENVIRONMENT': {
    name: 'Flow Environment',
    description: 'Ambiente de Flow (sandbox o production)',
    defaultValue: 'sandbox',
  },
  'NEXT_PUBLIC_NGROK_DOMAIN': {
    name: 'Ngrok Domain',
    description: 'Dominio de ngrok para desarrollo',
  },
};

console.log('🔍 Verificando variables de entorno...\n');

let hasErrors = false;
let hasWarnings = false;

// Verificar variables requeridas
console.log('📋 Variables Requeridas:');
console.log('─'.repeat(60));

for (const [key, config] of Object.entries(requiredVars)) {
  const value = process.env[key];
  const isSet = value && value.trim() !== '';
  
  // Si no está configurada pero tiene valor por defecto, usar el default
  const defaultValue = typeof config.defaultValue === 'function' 
    ? config.defaultValue() 
    : config.defaultValue;
  const finalValue = isSet ? value : (defaultValue || null);
  const isActuallySet = isSet || !!defaultValue;

  if (!isActuallySet && !config.optional) {
    console.log(`❌ ${config.name} (${key})`);
    console.log(`   ${config.description}`);
    if (defaultValue) {
      console.log(`   💡 Sugerencia: Agrega esta línea a .env.local:`);
      console.log(`   ${key}=${defaultValue}`);
    }
    console.log(`   Obtén desde: ${config.getUrl ? config.getUrl() : 'N/A'}`);
    console.log('');
    hasErrors = true;
  } else if (!isSet && config.optional) {
    console.log(`⚠️  ${config.name} (${key}) - Opcional`);
    console.log(`   ${config.description}`);
    if (defaultValue) {
      console.log(`   Valor por defecto: ${defaultValue}`);
      console.log(`   Valor usado: ${finalValue}`);
    }
    console.log('');
    hasWarnings = true;
  } else {
    // Ocultar valores sensibles
    const displayValue = key.includes('KEY') || key.includes('SECRET')
      ? `${finalValue.substring(0, 8)}...${finalValue.substring(finalValue.length - 4)}`
      : finalValue;
    console.log(`✅ ${config.name} (${key})`);
    console.log(`   ${displayValue}`);
    if (!isSet && defaultValue) {
      console.log(`   (usando valor por defecto: ${defaultValue})`);
    }
    console.log('');
  }
}

// Verificar variables opcionales
console.log('📋 Variables Opcionales:');
console.log('─'.repeat(60));

for (const [key, config] of Object.entries(optionalVars)) {
  const value = process.env[key];
  const isSet = value && value.trim() !== '';
  
  if (!isSet) {
    console.log(`⚠️  ${config.name} (${key}) - No configurada`);
    if (config.defaultValue) {
      console.log(`   Valor por defecto: ${config.defaultValue}`);
    }
    console.log('');
    hasWarnings = true;
  } else {
    console.log(`✅ ${config.name} (${key})`);
    console.log(`   ${value}`);
    console.log('');
  }
}

// Verificaciones adicionales
console.log('🔍 Verificaciones Adicionales:');
console.log('─'.repeat(60));

// Verificar formato de Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && !supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://')) {
  console.log('⚠️  NEXT_PUBLIC_SUPABASE_URL no parece ser una URL válida');
  hasWarnings = true;
}

// Verificar formato de Flow Environment
const flowEnv = process.env.FLOW_ENVIRONMENT || 'sandbox';
if (flowEnv !== 'sandbox' && flowEnv !== 'production') {
  console.log('⚠️  FLOW_ENVIRONMENT debe ser "sandbox" o "production"');
  hasWarnings = true;
}

// Verificar formato de App URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
  console.log('⚠️  NEXT_PUBLIC_APP_URL debe ser una URL válida (http:// o https://)');
  hasWarnings = true;
}

// Verificar si está usando localhost con Flow
if (appUrl.includes('localhost') && flowEnv === 'production') {
  console.log('⚠️  ADVERTENCIA: Estás usando localhost con Flow en producción');
  console.log('   Flow no puede redirigir a localhost. Usa ngrok para desarrollo.');
  hasWarnings = true;
}

// Resumen
console.log('─'.repeat(60));
if (hasErrors) {
  console.log('\n❌ ERROR: Faltan variables de entorno requeridas');
  console.log('   Por favor, completa el archivo .env.local con todas las variables requeridas.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  ADVERTENCIA: Hay algunas variables opcionales sin configurar');
  console.log('   La aplicación debería funcionar, pero revisa las advertencias arriba.\n');
  process.exit(0);
} else {
  console.log('\n✅ Todas las variables de entorno están configuradas correctamente!\n');
  process.exit(0);
}

