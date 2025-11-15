import { createServerClient } from '@/lib/supabase/server';
import type { Order, OrderItem } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * Servicio para gestionar órdenes
 */
export class OrderService {
  private supabase = createServerClient();

  /**
   * Crea una nueva orden
   */
  async createOrder(
    userId: string,
    items: Array<{ product_id: string; quantity: number; price: number }>,
    total: number
  ): Promise<Order> {
    const orderId = `ORDER-${Date.now()}`;

    // Crear orden
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .insert({
        user_id: userId,
        total,
        status: 'pending',
        commerce_order: orderId,
      })
      .select()
      .single();

    if (orderError) {
      logger.error('Error creando orden', orderError);
      throw new Error('Error al crear la orden');
    }

    // Crear items de la orden
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await this.supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logger.error('Error creando items de orden', itemsError);
      // Intentar eliminar la orden creada
      await this.supabase.from('orders').delete().eq('id', order.id);
      throw new Error('Error al crear los items de la orden');
    }

    logger.info('Orden creada exitosamente', {
      orderId: order.id,
      commerceOrder: order.commerce_order,
      total: order.total,
    });

    return order;
  }

  /**
   * Actualiza el token de Flow en una orden
   */
  async updateFlowToken(orderId: string, flowToken: string, flowOrder?: number): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .update({
        flow_token: flowToken,
        flow_order: flowOrder,
      })
      .eq('id', orderId);

    if (error) {
      logger.error('Error actualizando flow_token', error);
      // No lanzar error, es opcional
    }
  }

  /**
   * Obtiene una orden por ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      logger.error('Error obteniendo orden', error);
      return null;
    }

    return data;
  }

  /**
   * Obtiene las órdenes de un usuario
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error obteniendo órdenes del usuario', error);
      return [];
    }

    return data || [];
  }
}

