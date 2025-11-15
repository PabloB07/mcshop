/**
 * Utilidades para interactuar con la API de Minecraft (Mojang)
 * API oficial: https://api.mojang.com
 */

export interface MinecraftProfile {
  id: string; // UUID
  name: string; // Username
}

export interface MinecraftValidationResult {
  valid: boolean;
  profile?: MinecraftProfile;
  error?: string;
}

/**
 * Valida un nombre de usuario de Minecraft y obtiene su UUID
 * @param username Nombre de usuario de Minecraft
 * @returns Resultado de la validación con perfil si es válido
 */
export async function validateMinecraftUsername(
  username: string
): Promise<MinecraftValidationResult> {
  if (!username || username.trim().length === 0) {
    return {
      valid: false,
      error: 'El nombre de usuario no puede estar vacío',
    };
  }

  // Validar formato básico (3-16 caracteres, alfanumérico y guiones bajos)
  const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      error: 'El nombre de usuario debe tener entre 3 y 16 caracteres (solo letras, números y guiones bajos)',
    };
  }

  try {
    const response = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 204 || response.status === 404) {
      return {
        valid: false,
        error: 'Este nombre de usuario de Minecraft no existe',
      };
    }

    if (!response.ok) {
      throw new Error(`Error de la API: ${response.status}`);
    }

    const data: MinecraftProfile = await response.json();

    return {
      valid: true,
      profile: data,
    };
  } catch (error: any) {
    console.error('Error validando usuario de Minecraft:', error);
    return {
      valid: false,
      error: 'Error al validar el nombre de usuario. Por favor intenta de nuevo.',
    };
  }
}

/**
 * Obtiene la URL del avatar de un usuario de Minecraft
 * @param uuid UUID del usuario de Minecraft
 * @param size Tamaño de la imagen (por defecto 64x64)
 * @returns URL del avatar
 */
export function getMinecraftAvatarUrl(uuid: string, size: number = 64): string {
  // Usar Crafatar para obtener el avatar
  // Formato: https://crafatar.com/avatars/{uuid}?size={size}
  return `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;
}

/**
 * Obtiene la URL del avatar usando el username (primero obtiene el UUID)
 * @param username Nombre de usuario de Minecraft
 * @param size Tamaño de la imagen
 * @returns URL del avatar o null si no se puede obtener
 */
export async function getMinecraftAvatarUrlByUsername(
  username: string,
  size: number = 64
): Promise<string | null> {
  const validation = await validateMinecraftUsername(username);
  if (validation.valid && validation.profile) {
    return getMinecraftAvatarUrl(validation.profile.id, size);
  }
  return null;
}

