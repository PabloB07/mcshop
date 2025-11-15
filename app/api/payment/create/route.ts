import { NextRequest, NextResponse } from 'next/server';
import { createFlowAPI } from '@/lib/flow/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commerceOrder, subject, amount, email, urlReturn, urlConfirmation } = body;

    if (!commerceOrder || !subject || !amount || !email) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Validar que las credenciales de Flow estén configuradas
    if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY) {
      console.error('Flow credentials not configured');
      return NextResponse.json(
        { error: 'Configuración de Flow no encontrada. Por favor verifica las variables de entorno.' },
        { status: 500 }
      );
    }

    const flowAPI = createFlowAPI();
    const paymentData = await flowAPI.createPaymentOrder({
      commerceOrder,
      subject,
      amount,
      email,
      currency: 'CLP',
      urlReturn: urlReturn || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
      urlConfirmation: urlConfirmation || `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`,
    });

    return NextResponse.json(paymentData);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    console.error('Error stack:', error.stack);
    
    // Extraer mensaje de error más detallado
    let errorMessage = 'Error al crear el pago';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response) {
      errorMessage = `Error de Flow: ${error.response.status} - ${error.response.statusText}`;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

