import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createFlowAPI } from '@/lib/flow/api';
import { parseFlowWebhookBody, extractFlowToken } from '@/lib/flow/webhook-parser';
import { logAuditEvent, getRequestInfo } from '@/lib/audit-log';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import type { Order } from '@/types/database';
import type { FlowPaymentStatus } from '@/lib/flow/types';

type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'rejected';

/**
 * Servicio para procesar webhooks de Flow
 */
export class WebhookService {
  private supabase = createServerClient();

  /**
   * Procesa un webhook de Flow
   */
  async processWebhook(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await parseFlowWebhookBody(request);
      const token = extractFlowToken(body, request.nextUrl.searchParams);

      if (!token) {
        logger.error('Webhook recibido sin token', {
          method: request.method,
          contentType: request.headers.get('content-type'),
          body,
          searchParams: Object.fromEntries(request.nextUrl.searchParams),
          url: request.url,
        });
        return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
      }

      logger.info('Webhook recibido', {
        method: request.method,
        token: token.substring(0, 20) + '...',
      });

      // Buscar orden
      const order = await this.findOrder(token);
      if (!order) {
        return NextResponse.json(
          {
            error: 'Orden no encontrada',
            token: token.substring(0, 20) + '...',
          },
          { status: 404 }
        );
      }

      // Obtener estado del pago
      const paymentStatus = await this.getPaymentStatus(token);

      // Determinar estado de la orden
      const orderStatus = this.determineOrderStatus(paymentStatus);

      // Actualizar orden
      const updatedOrder = await this.updateOrderStatus(order.id, orderStatus);

      // Procesar orden pagada
      if (orderStatus === 'paid') {
        await this.processPaidOrder(updatedOrder);
      }

      // Registrar auditoría
      await this.logAuditEvent(updatedOrder, orderStatus, request);

      return NextResponse.json({
        success: true,
        status: orderStatus,
        orderId: updatedOrder.id,
        commerceOrder: updatedOrder.commerce_order,
      });
    } catch (error) {
      logger.error('Error procesando webhook', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Error al procesar webhook' },
        { status: 500 }
      );
    }
  }

  /**
   * Busca una orden por token o commerceOrder
   */
  private async findOrder(token: string): Promise<Order | null> {
    // Primero intentar buscar por flow_token
    let { data: order, error: orderError } = await this.supabase
      .from('orders')
      .select('*')
      .eq('flow_token', token)
      .single();

    logger.debug('Búsqueda por flow_token', {
      found: !!order,
      error: orderError?.code,
      errorMessage: orderError?.message,
    });

    // Si no se encuentra, buscar por commerceOrder desde Flow
    if (orderError || !order) {
      logger.info('Orden no encontrada por token, intentando obtener commerceOrder desde Flow');

      try {
        const flowAPI = createFlowAPI();
        const paymentStatus = await flowAPI.getPaymentStatus(token);

        logger.debug('Estado del pago desde Flow en webhook', {
          status: paymentStatus.status,
          commerceOrder: paymentStatus.commerceOrder,
          hasPaymentData: !!paymentStatus.paymentData,
        });

        if (paymentStatus?.commerceOrder) {
          logger.debug('Buscando orden por commerceOrder', {
            commerceOrder: paymentStatus.commerceOrder,
          });

          const { data: orderByCommerce, error: commerceError } = await this.supabase
            .from('orders')
            .select('*')
            .eq('commerce_order', paymentStatus.commerceOrder)
            .single();

          logger.debug('Búsqueda por commerceOrder', {
            found: !!orderByCommerce,
            error: commerceError?.code,
            errorMessage: commerceError?.message,
            commerceOrder: paymentStatus.commerceOrder,
          });

          if (orderByCommerce) {
            order = orderByCommerce;
            logger.info('Orden encontrada por commerceOrder', { orderId: order.id });

            // Actualizar la orden con el flow_token si no lo tiene
            if (!order.flow_token) {
              const { error: updateTokenError } = await this.supabase
                .from('orders')
                .update({ flow_token: token })
                .eq('id', order.id);

              if (updateTokenError) {
                logger.error('Error actualizando flow_token', updateTokenError);
              } else {
                logger.info('Orden actualizada con flow_token');
              }
            }
          } else {
            logger.error('Orden no encontrada por commerceOrder', {
              commerceOrder: paymentStatus.commerceOrder,
              error: commerceError,
            });
          }
        }
      } catch (flowErr) {
        logger.error('Error obteniendo commerceOrder desde Flow', flowErr);
      }
    }

    return order || null;
  }

  /**
   * Obtiene el estado del pago desde Flow
   */
  private async getPaymentStatus(token: string): Promise<FlowPaymentStatus> {
    try {
      const flowAPI = createFlowAPI();
      return await flowAPI.getPaymentStatus(token);
    } catch (error) {
      logger.error('Error obteniendo estado de Flow', error);
      throw error;
    }
  }

  /**
   * Determina el estado de la orden basado en el estado del pago
   */
  private determineOrderStatus(paymentStatus: FlowPaymentStatus): OrderStatus {
    // Si tiene paymentData con date, el pago fue exitoso
    if (paymentStatus.paymentData?.date) {
      logger.info('Pago exitoso detectado por paymentData', {
        date: paymentStatus.paymentData.date,
        amount: paymentStatus.paymentData.amount,
        media: paymentStatus.paymentData.media,
      });
      return 'paid';
    }

    // Mapear status de Flow a estado de orden
    switch (paymentStatus.status) {
      case 1:
        return 'paid';
      case 2:
        return 'cancelled';
      case 3:
        return 'rejected';
      case 0:
      default:
        return 'pending';
    }
  }

  /**
   * Actualiza el estado de una orden
   */
  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<Order> {
    const { data: updatedOrder, error: updateError } = await this.supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error actualizando orden', updateError);
      throw new Error('Error al actualizar la orden');
    }

    logger.info('Orden actualizada exitosamente', {
      id: updatedOrder.id,
      status: updatedOrder.status,
      commerceOrder: updatedOrder.commerce_order,
    });

    return updatedOrder;
  }

  /**
   * Procesa una orden pagada: crea licencias, user_products y URLs de descarga
   */
  private async processPaidOrder(order: Order): Promise<void> {
    try {
      // Obtener items de la orden
      const { data: orderItems, error: itemsError } = await this.supabase
        .from('order_items')
        .select('*, product:products(*)')
        .eq('order_id', order.id);

      if (itemsError) {
        logger.error('Error obteniendo items de orden', itemsError);
        return;
      }

      if (!orderItems || orderItems.length === 0) {
        logger.warn('Orden pagada sin items', { orderId: order.id });
        return;
      }

      // Obtener usuario
      const { data: { user } } = await this.supabase.auth.getUserById(order.user_id);

      for (const item of orderItems) {
        // Crear licencia
        const license = await this.createLicense(order, item);
        if (!license) continue;

        // Crear user_product
        await this.createUserProduct(order, item, license.id);

        // Generar URL de descarga
        if (user?.email) {
          await this.generateDownloadUrl(order, item, license.id, user.email);
        }
      }
    } catch (error) {
      logger.error('Error procesando productos comprados', error);
      // No fallar el webhook si hay error aquí
    }
  }

  /**
   * Crea una licencia para un producto
   */
  private async createLicense(order: Order, item: any): Promise<any | null> {
    const licenseKey = this.generateLicenseKey();

    const { data: license, error: licenseError } = await this.supabase
      .from('licenses')
      .insert({
        user_id: order.user_id,
        product_id: item.product_id,
        order_id: order.id,
        license_key: licenseKey,
        status: 'active',
      })
      .select()
      .single();

    if (licenseError) {
      logger.error('Error creando licencia', licenseError);
      return null;
    }

    return license;
  }

  /**
   * Crea un user_product
   */
  private async createUserProduct(order: Order, item: any, licenseId: string): Promise<void> {
    const { error: userProductError } = await this.supabase
      .from('user_products')
      .insert({
        user_id: order.user_id,
        product_id: item.product_id,
        order_id: order.id,
        license_id: licenseId,
      });

    if (userProductError) {
      logger.error('Error creando user_product', userProductError);
    }
  }

  /**
   * Genera una URL de descarga para un producto
   */
  private async generateDownloadUrl(
    order: Order,
    item: any,
    licenseId: string,
    userEmail: string
  ): Promise<void> {
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const downloadUrl = `${baseUrl}/api/downloads/${downloadToken}`;

    const { data: downloadData, error: downloadError } = await this.supabase
      .from('product_downloads')
      .insert({
        user_id: order.user_id,
        product_id: item.product_id,
        order_id: order.id,
        license_id: licenseId,
        download_token: downloadToken,
        download_url: downloadUrl,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        used: false,
      })
      .select()
      .single();

    if (downloadError) {
      logger.error('Error creando registro de descarga', downloadError);
    } else {
      logger.info('URL de descarga generada', {
        email: userEmail,
        product: item.product?.name,
        downloadUrl: downloadUrl,
      });
      // TODO: Enviar email con la URL de descarga
    }
  }

  /**
   * Genera una license key única
   */
  private generateLicenseKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i === 7 || i === 15 || i === 23) {
        result += '-';
      }
    }
    return result;
  }

  /**
   * Registra un evento de auditoría
   */
  private async logAuditEvent(
    order: Order,
    orderStatus: OrderStatus,
    request: NextRequest
  ): Promise<void> {
    const { ip, userAgent } = getRequestInfo(request);
    await logAuditEvent({
      user_id: order.user_id,
      action: orderStatus === 'paid' ? 'order_paid' : 'order_created',
      resource_type: 'order',
      resource_id: order.id,
      details: {
        commerce_order: order.commerce_order,
        status: orderStatus,
        total: order.total,
      },
      ip_address: ip || undefined,
      user_agent: userAgent || undefined,
    });
  }
}

