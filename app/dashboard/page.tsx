'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { getMinecraftAvatarUrl } from '@/lib/minecraft/api';
import { Loader2 } from 'lucide-react';

interface Order {
  id: string;
  total: number;
  status: string;
  commerce_order: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [minecraftAvatar, setMinecraftAvatar] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      // Obtener avatar de Minecraft si existe
      if (user?.user_metadata?.minecraft_uuid) {
        const avatar = getMinecraftAvatarUrl(user.user_metadata.minecraft_uuid, 128);
        setMinecraftAvatar(avatar);
      }

      // Obtener órdenes del usuario
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        setOrders(ordersData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Mi Cuenta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Mis Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-gray-500">No tienes pedidos aún.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border rounded-lg p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold">{order.commerce_order}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('es-CL')}
                        </p>
                        <span
                          className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                            order.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {order.status === 'paid'
                            ? 'Pagado'
                            : order.status === 'pending'
                            ? 'Pendiente'
                            : order.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(order.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {minecraftAvatar && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={minecraftAvatar}
                      alt="Avatar de Minecraft"
                      className="w-24 h-24 rounded-lg border-2 border-primary-500"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <p>
                    <span className="font-semibold">Email:</span> {user?.email}
                  </p>
                  {user?.user_metadata?.minecraft_username && (
                    <p>
                      <span className="font-semibold">Usuario Minecraft:</span>{' '}
                      {user.user_metadata.minecraft_username}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

