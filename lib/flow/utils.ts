import crypto from 'crypto';

/**
 * Firma los parámetros con la SecretKey de Flow
 * Los parámetros deben estar ordenados alfabéticamente
 */
export function signParams(params: Record<string, any>, secretKey: string): string {
  // Ordenar parámetros alfabéticamente
  const sortedKeys = Object.keys(params).sort();
  
  // Concatenar parámetros
  const paramString = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // Crear firma HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(paramString)
    .digest('hex');
  
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
 */
export function getFlowBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://www.flow.cl/api'
    : 'https://sandbox.flow.cl/api';
}

