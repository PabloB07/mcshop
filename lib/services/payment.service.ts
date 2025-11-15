import { createFlowAPI } from '@/lib/flow/api';
import { logger } from '@/lib/logger';

export interface CreatePaymentParams {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlReturn?: string;
  urlConfirmation?: string;
}

export interface PaymentResponse {
  token: string;
  url: string;
  flowOrder?: number;
}

/**
 * Servicio para gestionar pagos con Flow
 */
export class PaymentService {
  /**
   * Crea una orden de pago en Flow
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const flowAPI = createFlowAPI();

      // Construir URLs si no se proporcionan
      const appUrl = this.buildAppUrl();
      const urlReturn = params.urlReturn || `${appUrl}/api/payment/finalize`;
      const urlConfirmation = params.urlConfirmation || `${appUrl}/api/payment/webhook`;

      // Validar URLs
      this.validateUrls(urlReturn, urlConfirmation);

      logger.info('Creando orden de pago en Flow', {
        commerceOrder: params.commerceOrder,
        amount: params.amount,
        email: params.email,
        urlReturn,
        urlConfirmation,
      });

      const paymentData = await flowAPI.createPaymentOrder({
        commerceOrder: params.commerceOrder,
        subject: params.subject,
        amount: params.amount,
        email: params.email,
        currency: 'CLP',
        urlReturn,
        urlConfirmation,
      });

      logger.debug('Orden de pago creada en Flow', {
        hasToken: !!paymentData.token,
        hasUrl: !!paymentData.url,
        flowOrder: paymentData.flowOrder,
      });

      return {
        token: paymentData.token,
        url: paymentData.url,
        flowOrder: paymentData.flowOrder || undefined,
      };
    } catch (error) {
      logger.error('Error creando orden de pago', error);
      throw error;
    }
  }

  /**
   * Construye la URL de la aplicación
   */
  private buildAppUrl(): string {
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // Si no tiene protocolo, agregarlo
    if (appUrl && !appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      if (appUrl.includes('ngrok') || appUrl.includes('.')) {
        appUrl = `https://${appUrl}`;
      } else {
        appUrl = `http://${appUrl}`;
      }
    }

    // Si no hay NEXT_PUBLIC_APP_URL, usar ngrok o localhost
    if (!appUrl || appUrl === '') {
      const ngrokDomain = process.env.NEXT_PUBLIC_NGROK_DOMAIN;
      if (ngrokDomain) {
        appUrl = `https://${ngrokDomain}`;
      } else {
        appUrl = 'http://localhost:3000';
      }
    }

    return appUrl;
  }

  /**
   * Valida que las URLs sean válidas y accesibles
   */
  private validateUrls(urlReturn: string, urlConfirmation: string): void {
    // Validar formato
    try {
      new URL(urlReturn);
      new URL(urlConfirmation);
    } catch (e) {
      logger.error('URL inválida', { urlReturn, urlConfirmation });
      throw new Error('URL inválida. Verifica NEXT_PUBLIC_APP_URL.');
    }

    // Validar que no sean localhost
    if (urlReturn.includes('localhost') || urlReturn.includes('127.0.0.1')) {
      logger.error('urlReturn no puede ser localhost', { urlReturn });
      throw new Error(
        'Las URLs de retorno deben ser accesibles desde internet. Configura NEXT_PUBLIC_APP_URL con ngrok o tu dominio público.'
      );
    }

    if (urlConfirmation.includes('localhost') || urlConfirmation.includes('127.0.0.1')) {
      logger.error('urlConfirmation no puede ser localhost', { urlConfirmation });
      throw new Error(
        'Las URLs de confirmación deben ser accesibles desde internet. Configura NEXT_PUBLIC_APP_URL con ngrok o tu dominio público.'
      );
    }
  }
}

