import crypto from 'crypto';

/**
 * Firma los parámetros con la SecretKey de Flow
 * Los parámetros deben estar ordenados alfabéticamente
 * IMPORTANTE: No incluir el parámetro 's' en la firma
 */
export function signParams(params: Record<string, any>, secretKey: string): string {
  // Filtrar el parámetro 's' si existe y ordenar alfabéticamente
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 's') // Excluir el parámetro de firma
    .sort();
  
  // Concatenar parámetros en formato: nombre=valor&nombre2=valor2
  const paramString = sortedKeys
    .map(key => {
      const value = params[key];
      // Convertir a string y asegurar que no sea undefined o null
      return `${key}=${value !== undefined && value !== null ? String(value) : ''}`;
    })
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

