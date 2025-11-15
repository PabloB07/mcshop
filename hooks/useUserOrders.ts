import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Order } from '@/types/database';

/**
 * Hook para obtener las órdenes del usuario
 */
export function useUserOrders(userId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (ordersError) {
          setError('Error al cargar las órdenes');
          return;
        }

        setOrders(data || []);
      } catch (err) {
        setError('Error al cargar las órdenes');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]);

  return { orders, loading, error };
}

