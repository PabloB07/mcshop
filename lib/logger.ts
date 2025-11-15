/**
 * Sistema de logging centralizado
 * Reemplaza todos los console.log/error/warn del proyecto
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, data?: any): void {
    // En producción, solo loguear info, warn y error
    if (level === 'debug' && !this.isDevelopment) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };

    const logString = JSON.stringify(logEntry, null, this.isDevelopment ? 2 : 0);

    switch (level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'info':
      case 'debug':
      default:
        console.log(logString);
        break;
    }
  }

  /**
   * Log de debug (solo en desarrollo)
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log informativo
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log de advertencia
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log de error
   */
  error(message: string, error?: any): void {
    const errorData = error
      ? {
          message: error?.message,
          stack: error?.stack,
          ...(typeof error === 'object' ? error : { error }),
        }
      : undefined;
    this.log('error', message, errorData);
  }
}

export const logger = new Logger();

