import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { supabase } from '@/lib/supabase/client';
import { validateEmail } from '@/lib/validators';

interface UseCheckoutReturn {
  checkout: (email: string, userId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook personalizado para manejar el proceso de checkout
 */
export function useCheckout(): UseCheckoutReturn {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (email: string, userId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Validar email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.error || 'Email inválido');
      }

      if (items.length === 0) {
        throw new Error('Tu carrito está vacío');
      }

      const total = getTotal();

      // Crear orden
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          total,
          status: 'pending',
          commerce_order: `ORDER-${Date.now()}`,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Crear items de la orden
      const orderItemsWithOrderId = orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsWithOrderId);

      if (itemsError) throw itemsError;

      // Crear orden de pago en Flow
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commerceOrder: order.commerce_order,
          subject: `Compra MCShop - ${order.commerce_order}`,
          amount: total,
          email: email,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al crear el pago');
      }

      // Validar respuesta
      if (!responseData.token || !responseData.url) {
        throw new Error('La respuesta de Flow no contiene los datos necesarios');
      }

      // Actualizar orden con token de Flow (no bloquear si falla)
      try {
        await supabase
          .from('orders')
          .update({
            flow_token: responseData.token,
            flow_order: responseData.flowOrder,
          })
          .eq('id', order.id);
      } catch (updateErr) {
        // Continuar con la redirección aunque falle el update
        // No loguear en cliente, es opcional
      }

      // Redirigir a Flow
      let flowUrl = responseData.url;
      if (responseData.token && !flowUrl.includes('token=')) {
        flowUrl = flowUrl.includes('?')
          ? `${flowUrl}&token=${responseData.token}`
          : `${flowUrl}?token=${responseData.token}`;
      }

      window.location.replace(flowUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setLoading(false);
      throw err; // Re-lanzar para que el componente pueda manejarlo
    }
  };

  return { checkout, loading, error };
}

