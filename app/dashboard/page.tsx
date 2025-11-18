'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { getMinecraftAvatarUrl } from '@/lib/minecraft/api';
import { Loader2, Download, Package, CreditCard } from 'lucide-react';
import { useUserOrders } from '@/hooks/useUserOrders';
import { useUserProducts } from '@/hooks/useUserProducts';
import { useToast, ToastContainer } from '@/components/ui/toast';

interface Order {
  id: string;
  total: number;
  status: string;
  commerce_order: string;
  flow_token?: string;
  flow_order?: number;
  created_at: string;
}

interface UserProduct {
  id: string;
  product_id: string;
  order_id?: string;
  license_id?: string;
  purchased_at: string;
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

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    minecraft_uuid?: string;
    minecraft_username?: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [minecraftAvatar, setMinecraftAvatar] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toasts, error: showError, removeToast } = useToast();

  // Usar hooks personalizados
  const { orders, loading: ordersLoading } = useUserOrders(user?.id || null);
  const { userProducts, loading: productsLoading } = useUserProducts(user?.id || null);

  const loading = ordersLoading || productsLoading;

  useEffect(() => {
    const fetchUser = async () => {
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
    };

    fetchUser();
  }, [router]);

  const handleDownload = async (productId: string, productName: string) => {
    setDownloading(productId);
    try {
      const response = await fetch('/api/downloads/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: productId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar URL de descarga');
      }

      // Abrir URL de descarga en nueva pestaña
      window.open(data.download_url, '_blank');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError('Error al generar descarga: ' + errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Mi Cuenta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Mis Productos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Mis Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userProducts.length === 0 ? (
                <p className="text-gray-500">No has comprado ningún producto aún.</p>
              ) : (
                <div className="space-y-4">
                  {userProducts.map((userProduct) => {
                    const productType = (userProduct.product as any).product_type || 'plugin';
                    const isPlugin = productType === 'plugin';
                    const isRank = productType === 'rank';
                    const isItem = productType === 'item';
                    const isMoney = productType === 'money';

                    return (
                      <div
                        key={userProduct.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {userProduct.product.name}
                              </h3>
                              {isRank && (
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                                  Rango
                                </span>
                              )}
                              {isItem && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                  Item
                                </span>
                              )}
                              {isMoney && (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                                  Dinero
                                </span>
                              )}
                              {isPlugin && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                  Plugin
                                </span>
                              )}
                            </div>
                            {userProduct.product.plugin_version && (
                              <p className="text-sm text-gray-500">
                                Versión: {userProduct.product.plugin_version}
                              </p>
                            )}
                            {userProduct.product.minecraft_versions && 
                             userProduct.product.minecraft_versions.length > 0 && (
                              <p className="text-sm text-gray-500">
                                Minecraft: {userProduct.product.minecraft_versions.join(', ')}
                              </p>
                            )}
                            {userProduct.license && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-400 font-mono">
                                  Licencia: {userProduct.license.license_key}
                                </p>
                                <span
                                  className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                                    userProduct.license.status === 'active'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {userProduct.license.status === 'active' ? 'Activa' : userProduct.license.status}
                                </span>
                              </div>
                            )}
                            {(isRank || isItem || isMoney) && (
                              <p className="text-sm text-green-600 mt-2">
                                ✓ Aplicado en el servidor
                              </p>
                            )}
                          </div>
                          {isPlugin && (
                            <Button
                              onClick={() => handleDownload(userProduct.product.id, userProduct.product.name)}
                              disabled={downloading === userProduct.product.id}
                              className="flex items-center gap-2"
                            >
                              {downloading === userProduct.product.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Generando...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  Descargar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Comprado el {new Date(userProduct.purchased_at).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mis Pedidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Mis Pedidos
              </CardTitle>
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
                        {order.flow_order && (
                          <p className="text-xs text-gray-400 mt-1">
                            Flow Order: {order.flow_order}
                          </p>
                        )}
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
    </>
  );
}
