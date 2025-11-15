import crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Firma los parámetros con la SecretKey de Flow
 * 
 * Según la documentación oficial de Flow: https://developers.flow.cl/api#section/Introduccion
 * 
 * Proceso de firma:
 * 1. Se deben firmar todos los parámetros MENOS el parámetro 's' (donde va la firma)
 * 2. Ordenar los parámetros alfabéticamente ascendente por nombre
 * 3. Concatenar en un string: Nombre_parametro + Valor (sin separadores)
 * 4. Generar HMAC-SHA256 con la SecretKey
 * 
 * Ejemplo: Si tenemos apiKey=ABC, commerceOrder=123, amount=1000
 * Cadena a firmar: "apiKeyABCcommerceOrder123amount1000"
 */
export function signParams(params: Record<string, any>, secretKey: string): string {
  // 1. Filtrar el parámetro 's' si existe (no se incluye en la firma)
  // 2. Ordenar alfabéticamente ascendente
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 's') // Excluir el parámetro de firma
    .sort(); // Ordenar alfabéticamente ascendente
  
  // 3. Concatenar parámetros: Nombre_parametro + Valor (sin separadores)
  // Solo incluir parámetros que tengan valor (no undefined, null, ni string vacío)
  const paramString = sortedKeys
    .filter(key => {
      const value = params[key];
      return value !== undefined && value !== null && value !== '';
    })
    .map(key => {
      const value = params[key];
      // Concatenar: Nombre_parametro + Valor (sin espacios ni separadores)
      return `${key}${String(value).trim()}`;
    })
    .join(''); // Sin separador entre parámetros
  
  // Log detallado en desarrollo para debugging
  logger.debug('Generando firma Flow', {
    sortedKeys,
    paramString: paramString.substring(0, 100) + (paramString.length > 100 ? '...' : ''),
    paramStringLength: paramString.length,
    secretKeyLength: secretKey.length,
  });
  
  // 4. Crear firma HMAC-SHA256 según documentación de Flow
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(paramString)
    .digest('hex');
  
  logger.debug('Firma generada', {
    signature: signature.substring(0, 20) + '...',
  });
  
  return signature;
}

/**
 * Prepara los parámetros para enviar a Flow
 */
export function prepareFlowParams(
  params: Record<string, any>,
  apiKey: string,
  secretKey: string
): Record<string, any> {
  const flowParams = {
    ...params,
    apiKey,
  };
  
  const signature = signParams(flowParams, secretKey);
  
  return {
    ...flowParams,
    s: signature,
  };
}

/**
 * Obtiene la URL base de Flow según el ambiente
 * 
 * Según la documentación oficial: https://developers.flow.cl/api#section/Introduccion/Acceso-al-API
 * 
 * | Site       | Base URL for Rest Endpoints |
 * | ---------- | --------------------------- |
 * | Production | https://www.flow.cl/api     |
 * | Sandbox    | https://sandbox.flow.cl/api  |
 */
export function getFlowBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://www.flow.cl/api'
    : 'https://sandbox.flow.cl/api';
}
