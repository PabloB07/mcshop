import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment.service';
import { logger } from '@/lib/logger';

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
      logger.error('Flow credentials not configured');
      return NextResponse.json(
        { error: 'Configuración de Flow no encontrada. Por favor verifica las variables de entorno.' },
        { status: 500 }
      );
    }

    const paymentService = new PaymentService();
    const paymentData = await paymentService.createPayment({
      commerceOrder,
      subject,
      amount,
      email,
      urlReturn,
      urlConfirmation,
    });

    return NextResponse.json(paymentData);
  } catch (error) {
    logger.error('Error creating payment', error);
    
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al crear el pago';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

