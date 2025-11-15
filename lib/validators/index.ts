/**
 * Validadores reutilizables para el proyecto
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida un email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email es requerido' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email inválido' };
  }

  return { valid: true };
}

/**
 * Valida una contraseña
 */
export function validatePassword(password: string, minLength: number = 6): ValidationResult {
  if (!password || password.trim() === '') {
    return { valid: false, error: 'Contraseña es requerida' };
  }

  if (password.length < minLength) {
    return {
      valid: false,
      error: `La contraseña debe tener al menos ${minLength} caracteres`,
    };
  }

  return { valid: true };
}

/**
 * Valida que dos contraseñas coincidan
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Las contraseñas no coinciden' };
  }

  return { valid: true };
}

/**
 * Valida un token de descarga (debe ser 64 caracteres hex)
 */
export function validateDownloadToken(token: string): ValidationResult {
  if (!token) {
    return { valid: false, error: 'Token requerido' };
  }

  if (token.length !== 64) {
    return { valid: false, error: 'Token inválido' };
  }

  // Validar que sea hexadecimal
  const hexRegex = /^[0-9a-f]{64}$/i;
  if (!hexRegex.test(token)) {
    return { valid: false, error: 'Token inválido' };
  }

  return { valid: true };
}

/**
 * Valida un UUID
 */
export function validateUUID(uuid: string): ValidationResult {
  if (!uuid) {
    return { valid: false, error: 'UUID requerido' };
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: 'UUID inválido' };
  }

  return { valid: true };
}

