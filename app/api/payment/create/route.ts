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
    return NextResponse.json(
      { error: error.message || 'Error al crear el pago' },
      { status: 500 }
    );
  }
}

