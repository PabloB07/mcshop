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
    const params = prepareFlowParams(
      {
        commerceOrder: order.commerceOrder,
        subject: order.subject,
        currency: order.currency || 'CLP',
        amount: order.amount,
        email: order.email,
        urlConfirmation: order.urlConfirmation,
        urlReturn: order.urlReturn,
        paymentMethod: order.paymentMethod,
        forward_days_after: order.forward_days_after,
        forward_days_after_type: order.forward_days_after_type,
        ...order.optional,
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

    const response = await fetch(`${this.baseUrl}/payment/create`, {
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

