'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      // Limpiar carrito después de pago exitoso
      clearCart();
    }
  }, [token, clearCart]);

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">¡Pago Exitoso!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Tu pago ha sido procesado correctamente. Recibirás un email con los detalles de tu compra.
          </p>
          {token && (
            <p className="text-sm text-gray-500">
              Token: {token}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => router.push('/dashboard')} className="flex-1">
              Ver Mis Pedidos
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/products')}
              className="flex-1"
            >
              Seguir Comprando
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <CardTitle className="text-2xl">Procesando...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Cargando información del pago...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

