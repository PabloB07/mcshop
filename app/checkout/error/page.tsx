'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, AlertCircle } from 'lucide-react';

function CheckoutErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const token = searchParams.get('token');

  const getErrorMessage = () => {
    if (error) {
      // Decodificar el mensaje de error si viene codificado
      try {
        return decodeURIComponent(error);
      } catch {
        return error;
      }
    }
    if (token) {
      return 'El pago fue cancelado o rechazado';
    }
    return 'Ocurrió un error al procesar tu pago';
  };

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="w-16 h-16 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-red-600">Error en el Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">{getErrorMessage()}</p>
          </div>
          
          {token && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                Token: {token}
              </p>
            </div>
          )}

          {error?.includes('localhost') && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <p className="font-semibold mb-2">⚠️ Nota para desarrollo:</p>
              <p>
                Flow no puede redirigir a localhost. Para probar el flujo completo:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Usa ngrok para exponer tu servidor local</li>
                <li>Actualiza NEXT_PUBLIC_APP_URL con la URL de ngrok</li>
                <li>O verifica el estado del pago manualmente en tu dashboard</li>
              </ol>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push('/checkout')} className="w-full">
              Intentar Nuevamente
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/products')}
              className="w-full"
            >
              Volver a Productos
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Ver Mis Pedidos
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
            <AlertCircle className="w-16 h-16 text-gray-400 animate-pulse" />
          </div>
          <CardTitle className="text-2xl">Procesando...</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function CheckoutErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutErrorContent />
    </Suspense>
  );
}

