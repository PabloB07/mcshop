'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMinecraftAvatarUrl } from '@/lib/minecraft/api';
import { Loader2, CheckCircle, XCircle, User } from 'lucide-react';

interface MinecraftUsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, uuid?: string) => void;
  onAvatarChange?: (avatarUrl: string | null) => void;
  required?: boolean;
  placeholder?: string;
  label?: string;
}

export function MinecraftUsernameInput({
  value,
  onChange,
  onValidationChange,
  onAvatarChange,
  required = false,
  placeholder = 'Ingresa tu nombre de usuario de Minecraft',
  label = 'Usuario de Minecraft',
}: MinecraftUsernameInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
    uuid?: string;
  } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const lastValidatedValue = useRef<string>('');

  // Declarar validateUsername antes del useEffect
  const validateUsername = useCallback(async (username: string) => {
    setIsValidating(true);
    setValidationResult(null);
    setAvatarUrl(null);

    // Validación básica del formato antes de hacer la petición
    const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
    if (!usernameRegex.test(username)) {
      setValidationResult({
        valid: false,
        error: 'El nombre de usuario debe tener entre 3 y 16 caracteres (solo letras, números y guiones bajos)',
      });
      onValidationChange?.(false);
      setIsValidating(false);
      return;
    }

    try {
      // Usar la API route de Next.js para evitar problemas de CORS
      const response = await fetch(
        `/api/minecraft/validate?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const result = await response.json();
      
      setValidationResult({
        valid: result.valid,
        error: result.error,
        uuid: result.profile?.id,
      });

      if (result.valid && result.profile) {
        const avatar = getMinecraftAvatarUrl(result.profile.id, 64);
        setAvatarUrl(avatar);
        onAvatarChange?.(avatar);
        onValidationChange?.(true, result.profile.id);
      } else {
        setAvatarUrl(null);
        onAvatarChange?.(null);
        onValidationChange?.(false);
      }
    } catch (error) {
      console.error('Error validando usuario de Minecraft:', error);
      setValidationResult({
        valid: false,
        error: 'Error al validar el usuario. Por favor intenta de nuevo.',
      });
      onValidationChange?.(false);
    } finally {
      setIsValidating(false);
    }
  }, [onValidationChange, onAvatarChange]);

  // Debounce para validar después de que el usuario deje de escribir
  useEffect(() => {
    // Solo validar si el valor cambió y no es el mismo que ya validamos
    if (value.trim() === lastValidatedValue.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const trimmedValue = value.trim();
      
      // Si el valor está vacío, limpiar estado
      if (trimmedValue.length === 0) {
        setValidationResult(null);
        setAvatarUrl(null);
        onAvatarChange?.(null);
        onValidationChange?.(false);
        lastValidatedValue.current = '';
        return;
      }

      // Solo validar si el valor realmente cambió
      if (trimmedValue !== lastValidatedValue.current) {
        lastValidatedValue.current = trimmedValue;
        validateUsername(trimmedValue);
      }
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timeoutId);
  }, [value, validateUsername]);

  return (
    <div>
      <label htmlFor="minecraftUsername" className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isValidating ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : validationResult?.valid ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : validationResult && !validationResult.valid ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <User className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <input
          id="minecraftUsername"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
            validationResult?.valid
              ? 'border-green-300 bg-green-50'
              : validationResult && !validationResult.valid
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          }`}
        />

      </div>

      <AnimatePresence>
        {validationResult?.error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-1 text-xs text-red-600 text-sm"
          >
            {validationResult.error}
          </motion.p>
        )}
        {validationResult?.valid && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-1 text-xs text-green-600 text-sm"
          >
            ✓ Usuario de Minecraft válido
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-xs text-gray-500 mt-1">
        El nombre debe tener entre 3 y 16 caracteres (solo letras, números y guiones bajos)
      </p>
    </div>
  );
}

