import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { UserProduct } from '@/types/database';

interface UserProductWithDetails extends UserProduct {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    plugin_version?: string;
    minecraft_versions?: string[];
  };
  license?: {
    id: string;
    license_key: string;
    status: string;
  };
}

/**
 * Hook para obtener los productos comprados del usuario
 */
export function useUserProducts(userId: string | null) {
  const [userProducts, setUserProducts] = useState<UserProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        const { data, error: productsError } = await supabase
          .from('user_products')
          .select(`
            *,
            product:products(id, name, description, price, plugin_version, minecraft_versions),
            license:licenses(id, license_key, status)
          `)
          .eq('user_id', userId)
          .order('purchased_at', { ascending: false });

        if (productsError) {
          setError('Error al cargar los productos');
          return;
        }

        setUserProducts(data || []);
      } catch (err) {
        setError('Error al cargar los productos');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [userId]);

  return { userProducts, loading, error };
}

