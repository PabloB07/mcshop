import { FlowConfig, FlowPaymentOrder, FlowPaymentResponse, FlowPaymentStatus, FlowRefundRequest, FlowRefundResponse, FlowTransactionsParams, FlowTransactionsResponse } from './types';
import { prepareFlowParams, getFlowBaseUrl } from './utils';
import { logger } from '@/lib/logger';

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

    // Log para depuración
    logger.debug('Flow API Request', {
      url: `${this.baseUrl}/payment/create`,
      environment: this.config.environment,
    });

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
      logger.error('Flow API Error', {
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
      const data = JSON.parse(responseText);
      
      // Log de la respuesta
      logger.debug('Flow API Response', {
        hasToken: !!data.token,
        hasUrl: !!data.url,
        token: data.token ? data.token.substring(0, 20) + '...' : 'missing',
        url: data.url ? data.url.substring(0, 50) + '...' : 'missing',
      });
      
      // Validar que la respuesta tenga los campos requeridos
      if (!data.token || !data.url) {
        logger.error('Respuesta de Flow incompleta', {
          received: Object.keys(data),
          data,
          responseText,
        });
        throw new Error('La respuesta de Flow no contiene los campos requeridos (token, url)');
      }
      
      return {
        token: data.token,
        url: data.url,
        flowOrder: data.flowOrder || data.floworder || null,
      };
    } catch (parseError) {
      logger.error('Error parseando respuesta de Flow', {
        responseText,
        parseError,
      });
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

    const responseText = await response.text();
    let errorData: any = { message: 'Error desconocido' };

    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { message: responseText || `Error ${response.status}` };
    }

    if (!response.ok) {
      logger.error('Flow getStatus Error', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
        url: `${this.baseUrl}/payment/getStatus?${queryString.substring(0, 100)}...`,
      });
      
      if (response.status === 401) {
        throw new Error('Error de autenticación con Flow. Verifica tus credenciales.');
      } else if (response.status === 404) {
        throw new Error('Token de pago no encontrado en Flow.');
      } else {
        throw new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
    }

    try {
      const parsedResponse = JSON.parse(responseText);
      
      // Log detallado de la respuesta de Flow
      logger.debug('Respuesta completa de Flow getStatus', {
        status: parsedResponse.status,
        statusType: typeof parsedResponse.status,
        hasPaymentData: !!parsedResponse.paymentData,
        paymentData: parsedResponse.paymentData,
        commerceOrder: parsedResponse.commerceOrder,
        amount: parsedResponse.amount,
        currency: parsedResponse.currency,
      });
      
      return parsedResponse;
    } catch {
      throw new Error('Respuesta inválida de Flow API');
    }
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

    const responseText = await response.text();
    let errorData: any = { message: 'Error desconocido' };

    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { message: responseText || `Error ${response.status}` };
    }

    if (!response.ok) {
      logger.error('Flow getStatusByCommerceOrder Error', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });

      if (response.status === 401) {
        throw new Error('Error de autenticación con Flow. Verifica tus credenciales.');
      } else if (response.status === 404) {
        throw new Error('Orden de comercio no encontrada en Flow.');
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
   * Obtiene el listado de transacciones realizadas en un día
   * Según documentación: https://developers.flow.cl/api#tag/payment/paths/~1payment~1getTransactions/get
   */
  async getTransactions(params: FlowTransactionsParams): Promise<FlowTransactionsResponse> {
    // Validar fecha (formato YYYY-MM-DD)
    if (!params.date || !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      throw new Error('La fecha debe estar en formato YYYY-MM-DD');
    }

    const requestParams: Record<string, any> = {
      date: params.date,
    };

    // Agregar parámetros opcionales de paginación
    if (params.start !== undefined) {
      requestParams.start = params.start;
    }
    if (params.limit !== undefined) {
      // Validar que limit no exceda 100
      requestParams.limit = Math.min(params.limit, 100);
    }

    const signedParams = prepareFlowParams(
      requestParams,
      this.config.apiKey,
      this.config.secretKey
    );

    const queryString = new URLSearchParams(
      Object.entries(signedParams).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const response = await fetch(`${this.baseUrl}/payment/getTransactions?${queryString}`, {
      method: 'GET',
    });

    const responseText = await response.text();
    let errorData: any = { message: 'Error desconocido' };

    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { message: responseText || `Error ${response.status}` };
    }

    if (!response.ok) {
      logger.error('Flow getTransactions Error', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
        date: params.date,
      });

      if (response.status === 401) {
        throw new Error('Error de autenticación con Flow. Verifica tus credenciales.');
      } else if (response.status === 400) {
        throw new Error(errorData.message || 'Parámetros inválidos. Verifica la fecha y los parámetros de paginación.');
      } else {
        throw new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
    }

    try {
      const data = JSON.parse(responseText);
      
      // Si data es un string (JSON stringificado), parsearlo de nuevo
      if (typeof data.data === 'string') {
        try {
          data.data = JSON.parse(data.data);
        } catch {
          logger.warn('No se pudo parsear data.data como JSON');
        }
      }

      return data;
    } catch {
      throw new Error('Respuesta inválida de Flow API');
    }
  }

  /**
   * Crea un reembolso
   * Según documentación: https://developers.flow.cl/api#operation/createRefund
   */
  async createRefund(refund: FlowRefundRequest): Promise<FlowRefundResponse> {
    if (!refund.token) {
      throw new Error('Token de pago requerido para crear reembolso');
    }

    const params: Record<string, any> = {
      token: refund.token,
    };

    // Agregar amount solo si está definido
    if (refund.amount !== undefined && refund.amount !== null) {
      params.amount = Math.round(Number(refund.amount));
    }

    // Agregar comment solo si está definido
    if (refund.comment) {
      params.comment = String(refund.comment);
    }

    const signedParams = prepareFlowParams(
      params,
      this.config.apiKey,
      this.config.secretKey
    );

    const formData = new URLSearchParams();
    Object.entries(signedParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
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

    const responseText = await response.text();
    let errorData: any = { message: 'Error desconocido' };

    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { message: responseText || `Error ${response.status}` };
    }

    if (!response.ok) {
      logger.error('Flow createRefund Error', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });

      if (response.status === 401) {
        throw new Error('Error de autenticación con Flow. Verifica tus credenciales.');
      } else if (response.status === 400) {
        throw new Error(errorData.message || 'Parámetros inválidos para crear reembolso.');
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
   * Obtiene el estado de un reembolso
   * Según documentación: https://developers.flow.cl/api#operation/getRefundStatus
   */
  async getRefundStatus(token: string): Promise<any> {
    if (!token) {
      throw new Error('Token de reembolso requerido');
    }

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

    const responseText = await response.text();
    let errorData: any = { message: 'Error desconocido' };

    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { message: responseText || `Error ${response.status}` };
    }

    if (!response.ok) {
      logger.error('Flow getRefundStatus Error', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });

      if (response.status === 401) {
        throw new Error('Error de autenticación con Flow. Verifica tus credenciales.');
      } else if (response.status === 404) {
        throw new Error('Token de reembolso no encontrado en Flow.');
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
   * Cancela un reembolso
   * Según documentación: https://developers.flow.cl/api#operation/cancelRefund
   */
  async cancelRefund(token: string): Promise<any> {
    if (!token) {
      throw new Error('Token de reembolso requerido');
    }

    const params = prepareFlowParams(
      { token },
      this.config.apiKey,
      this.config.secretKey
    );

    const formData = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await fetch(`${this.baseUrl}/refund/cancel`, {
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
      errorData = { message: responseText || `Error ${response.status}` };
    }

    if (!response.ok) {
      logger.error('Flow cancelRefund Error', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });

      if (response.status === 401) {
        throw new Error('Error de autenticación con Flow. Verifica tus credenciales.');
      } else if (response.status === 404) {
        throw new Error('Token de reembolso no encontrado en Flow.');
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

