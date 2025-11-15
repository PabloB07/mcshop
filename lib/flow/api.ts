import { FlowConfig, FlowPaymentOrder, FlowPaymentResponse, FlowPaymentStatus, FlowRefundRequest, FlowRefundResponse } from './types';
import { prepareFlowParams, getFlowBaseUrl } from './utils';

export class FlowAPI {
  private config: FlowConfig;
  private baseUrl: string;

  constructor(config: FlowConfig) {
    this.config = config;
    this.baseUrl = getFlowBaseUrl(config.environment);
  }

  /**
   * Genera una orden de pago
   */
  async createPaymentOrder(order: FlowPaymentOrder): Promise<FlowPaymentResponse> {
    // Validar que amount sea un número válido
    const amount = Number(order.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('El monto debe ser un número válido mayor a 0');
    }

    // Preparar parámetros base (sin apiKey ni firma aún)
    const baseParams: Record<string, any> = {
      commerceOrder: String(order.commerceOrder),
      subject: String(order.subject),
      currency: order.currency || 'CLP',
      amount: Math.round(amount), // Flow espera números enteros (sin decimales para CLP)
      email: String(order.email),
    };

    // Agregar parámetros opcionales solo si tienen valor
    if (order.urlConfirmation) {
      baseParams.urlConfirmation = order.urlConfirmation;
    }
    if (order.urlReturn) {
      baseParams.urlReturn = order.urlReturn;
    }
    if (order.paymentMethod !== undefined) {
      baseParams.paymentMethod = order.paymentMethod;
    }
    if (order.forward_days_after !== undefined) {
      baseParams.forward_days_after = order.forward_days_after;
    }
    if (order.forward_days_after_type !== undefined) {
      baseParams.forward_days_after_type = order.forward_days_after_type;
    }
    if (order.optional) {
      Object.assign(baseParams, order.optional);
    }

    // Preparar parámetros con firma
    const params = prepareFlowParams(
      baseParams,
      this.config.apiKey,
      this.config.secretKey
    );

    // Crear formData solo con parámetros que tienen valor
    const formData = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });

    // Log para depuración (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('Flow API Request:', {
        url: `${this.baseUrl}/payment/create`,
        params: Object.fromEntries(formData.entries()),
        environment: this.config.environment,
      });
    }

    const response = await fetch(`${this.baseUrl}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    let errorData: any = { message: 'Error desconocido' };

    try {
      errorData = JSON.parse(responseText);
    } catch {
      // Si no es JSON, usar el texto como mensaje
      errorData = { message: responseText || `Error ${response.status}` };
    }

    if (!response.ok) {
      console.error('Flow API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
        url: `${this.baseUrl}/payment/create`,
      });
      
      // Mensajes de error más descriptivos según el código de estado
      if (response.status === 400) {
        throw new Error(errorData.message || 'Parámetros inválidos. Verifica los datos enviados.');
      } else if (response.status === 401) {
        throw new Error('Error de autenticación. Verifica tus credenciales de Flow (API Key y Secret Key).');
      } else if (response.status === 403) {
        throw new Error('Acceso denegado. Verifica los permisos de tu cuenta de Flow.');
      } else {
        throw new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error('Respuesta inválida de Flow API');
    }
  }

  /**
   * Obtiene el estado de una orden de pago
   */
  async getPaymentStatus(token: string): Promise<FlowPaymentStatus> {
    const params = prepareFlowParams(
      { token },
      this.config.apiKey,
      this.config.secretKey
    );

    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const response = await fetch(`${this.baseUrl}/payment/getStatus?${queryString}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * Obtiene el estado de un pago por commerceOrder
   */
  async getPaymentStatusByCommerceOrder(commerceOrder: string): Promise<FlowPaymentStatus> {
    const params = prepareFlowParams(
      { commerceOrder },
      this.config.apiKey,
      this.config.secretKey
    );

    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const response = await fetch(`${this.baseUrl}/payment/getStatusByCommerceOrder?${queryString}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * Crea un reembolso
   */
  async createRefund(refund: FlowRefundRequest): Promise<FlowRefundResponse> {
    const params = prepareFlowParams(
      {
        token: refund.token,
        amount: refund.amount,
        comment: refund.comment,
      },
      this.config.apiKey,
      this.config.secretKey
    );

    const formData = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await fetch(`${this.baseUrl}/refund/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * Obtiene el estado de un reembolso
   */
  async getRefundStatus(token: string): Promise<any> {
    const params = prepareFlowParams(
      { token },
      this.config.apiKey,
      this.config.secretKey
    );

    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const response = await fetch(`${this.baseUrl}/refund/getStatus?${queryString}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return response.json();
  }
}

/**
 * Crea una instancia de FlowAPI con la configuración del entorno
 */
export function createFlowAPI(): FlowAPI {
  const config: FlowConfig = {
    apiKey: process.env.FLOW_API_KEY!,
    secretKey: process.env.FLOW_SECRET_KEY!,
    environment: (process.env.FLOW_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  };

  if (!config.apiKey || !config.secretKey) {
    throw new Error('Missing Flow API credentials');
  }

  return new FlowAPI(config);
}

