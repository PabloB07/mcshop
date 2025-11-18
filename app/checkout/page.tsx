'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { useCheckout } from '@/hooks/useCheckout';
import { MinecraftUsernameInput } from '@/components/minecraft-username-input';
import type { ProductType } from '@/types/database';

interface User {
  id: string;
  email?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const { checkout, loading, error: checkoutError } = useCheckout();
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [minecraftUuid, setMinecraftUuid] = useState<string | null>(null);
  const [minecraftValid, setMinecraftValid] = useState(false);

  // Verificar si hay productos que requieren usuario de Minecraft
  const needsMinecraftUser = items.some(
    (item) => 
      item.product.product_type === 'rank' || 
      item.product.product_type === 'item' || 
      item.product.product_type === 'money'
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.email) {
        setEmail(user.email);
      }
    };
    getUser();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Tu carrito está vacío');
      return;
    }

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Validar usuario de Minecraft si es necesario
    if (needsMinecraftUser && (!minecraftValid || !minecraftUuid)) {
      setError('Por favor ingresa un usuario de Minecraft válido');
      return;
    }

    try {
      await checkout(email, user.id, minecraftUsername, minecraftUuid);
      // Si checkout es exitoso, redirige a Flow (no llegamos aquí)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el pago';
      setError(errorMessage);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
        <Button onClick={() => router.push('/products')}>
          Ver Productos
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {needsMinecraftUser && (
                  <div>
                    <MinecraftUsernameInput
                      value={minecraftUsername}
                      onChange={(value) => {
                        setMinecraftUsername(value);
                        setError(null);
                      }}
                      onValidationChange={(valid, uuid) => {
                        setMinecraftValid(valid);
                        setMinecraftUuid(uuid || null);
                      }}
                      required
                      label="Usuario de Minecraft"
                      placeholder="Ingresa el nombre de usuario de Minecraft"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Este usuario recibirá el rango/item/dinero en el servidor
                    </p>
                  </div>
                )}
                {(error || checkoutError) && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error || checkoutError}</span>
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Pagar con Flow'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>
                      {item.product.name} x{item.quantity}
                    </span>
                    <span>{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t pt-4 flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(getTotal())}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

