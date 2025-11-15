'use client';

import { Suspense, useEffect, useState } from 'react';
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
  const error = searchParams.get('error');
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'success' | 'error'>('checking');

  useEffect(() => {
    // Si hay un error explícito, redirigir a la página de error
    if (error) {
      router.push(`/checkout/error?error=${encodeURIComponent(error)}${token ? `&token=${token}` : ''}`);
      return;
    }

    // Primero verificar si Flow envió el status en la URL
    const statusFromUrl = searchParams.get('status');
    
    // Si Flow envió status 2 (cancelado) o 3 (rechazado) directamente, redirigir a error
    if (statusFromUrl === '2') {
      setPaymentStatus('error');
      router.push(`/checkout/error?error=El pago fue cancelado. Si completaste el pago, puede tardar unos minutos en procesarse.${token ? `&token=${token}` : ''}`);
      return;
    }
    
    if (statusFromUrl === '3') {
      setPaymentStatus('error');
      router.push(`/checkout/error?error=El pago fue rechazado. Por favor intenta nuevamente.${token ? `&token=${token}` : ''}`);
      return;
    }

    // Si hay token, verificar el estado del pago con la API
    if (token) {
      const verifyPayment = async () => {
        try {
          const response = await fetch(`/api/payment/status?token=${encodeURIComponent(token)}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(errorData.error || `Error ${response.status}`);
          }
          
          const data = await response.json();
          
          // Log temporal para diagnóstico
          console.log('🔍 Estado del pago recibido:', {
            status: data.status,
            statusType: typeof data.status,
            hasPaymentData: !!data.paymentData,
            fullData: data,
          });
          
          // Verificar si hay un error en la respuesta
          if (data.error) {
            throw new Error(data.error);
          }
          
          // Convertir status a número si viene como string
          const status = typeof data.status === 'string' ? parseInt(data.status, 10) : data.status;
          
          // IMPORTANTE: Si hay paymentData con date, el pago fue exitoso independientemente del status
          // Flow puede devolver status=2 con paymentData si el pago fue exitoso
          // Según documentación de Flow:
          // status 0 = pendiente, 1 = pagado, 2 = cancelado, 3 = rechazado
          if (data.paymentData && data.paymentData.date) {
            // Pago exitoso - tiene paymentData con date
            console.log('✅ Pago exitoso detectado por paymentData:', {
              date: data.paymentData.date,
              amount: data.paymentData.amount,
              media: data.paymentData.media,
            });
            setPaymentStatus('success');
            clearCart();
          } else if (status === 1) {
            // Pago exitoso - status 1
            console.log('✅ Pago exitoso (status 1)');
            setPaymentStatus('success');
            clearCart();
          } else if (status === 2) {
            // Pago cancelado por el usuario (sin paymentData)
            console.log('❌ Pago cancelado (status 2 sin paymentData)');
            setPaymentStatus('error');
            router.push(`/checkout/error?error=El pago fue cancelado. Si completaste el pago, puede tardar unos minutos en procesarse.&token=${token}`);
          } else if (status === 3) {
            // Pago rechazado
            console.log('❌ Pago rechazado (status 3)');
            setPaymentStatus('error');
            router.push(`/checkout/error?error=El pago fue rechazado. Por favor intenta nuevamente.&token=${token}`);
          } else if (status === 0 || status === undefined || status === null) {
            // Estado pendiente - el pago aún se está procesando
            console.log('⏳ Pago pendiente (status 0 o undefined)');
            setPaymentStatus('success');
            // No limpiar carrito aún, esperar confirmación del webhook
          } else {
            // Estado desconocido - mostrar como pendiente
            console.log('⚠️ Estado desconocido:', status);
            setPaymentStatus('success');
          }
        } catch (err: any) {
          let errorMessage = err.message || 'Error al verificar el estado del pago';
          
          if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
            errorMessage = 'Error de conexión. Si estás usando localhost, Flow no puede acceder. Usa ngrok para desarrollo.';
          } else if (err.message?.includes('401') || err.message?.includes('autenticación')) {
            errorMessage = 'Error de autenticación con Flow. Verifica tus credenciales.';
          } else if (err.message?.includes('404') || err.message?.includes('no encontrado')) {
            errorMessage = 'Token de pago no encontrado. El pago puede haber sido cancelado.';
          }
          
          router.push(`/checkout/error?error=${encodeURIComponent(errorMessage)}&token=${token}`);
        }
      };
      
      verifyPayment();
    } else {
      // Si no hay token ni status, asumir error
      setPaymentStatus('error');
      router.push('/checkout/error?error=No se recibió confirmación del pago. Por favor verifica el estado de tu orden.');
    }
  }, [token, error, clearCart, router, searchParams]);

  // Mostrar loading mientras se verifica el pago
  if (paymentStatus === 'checking') {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <CardTitle className="text-2xl">Redireccionando...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Por favor espera mientras verificamos tu pago.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si hay error, no mostrar nada (se redirige en el useEffect)
  if (error || paymentStatus === 'error') {
    return null;
  }

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

