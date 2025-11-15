import { NextRequest, NextResponse } from 'next/server';
import { createFlowAPI } from '@/lib/flow/api';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const commerceOrder = searchParams.get('commerceOrder');

    if (!token && !commerceOrder) {
      return NextResponse.json(
        { error: 'Token o commerceOrder requerido' },
        { status: 400 }
      );
    }

    // Validar credenciales de Flow
    if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY) {
      logger.error('Flow credentials not configured');
      return NextResponse.json(
        { error: 'Configuración de Flow no encontrada' },
        { status: 500 }
      );
    }

    const flowAPI = createFlowAPI();
    let paymentStatus;

    try {
      if (token) {
        paymentStatus = await flowAPI.getPaymentStatus(token);
      } else {
        paymentStatus = await flowAPI.getPaymentStatusByCommerceOrder(commerceOrder!);
      }
    } catch (flowError) {
      logger.error('Error llamando a Flow API', flowError);
      return NextResponse.json(
        { 
          error: flowError instanceof Error ? flowError.message : 'Error al obtener el estado del pago desde Flow',
          details: process.env.NODE_ENV === 'development' && flowError instanceof Error ? flowError.stack : undefined
        },
        { status: 500 }
      );
    }

    // Validar que paymentStatus tenga la estructura esperada
    if (!paymentStatus || typeof paymentStatus.status === 'undefined') {
      logger.error('Respuesta inválida de Flow', paymentStatus);
      return NextResponse.json(
        { error: 'Respuesta inválida de Flow' },
        { status: 500 }
      );
    }

    logger.debug('Estado del pago desde Flow', {
      status: paymentStatus.status,
      statusType: typeof paymentStatus.status,
      hasPaymentData: !!paymentStatus.paymentData,
      commerceOrder: paymentStatus.commerceOrder,
      amount: paymentStatus.amount,
    });

    return NextResponse.json(paymentStatus);
  } catch (error) {
    logger.error('Error getting payment status', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error al obtener el estado del pago',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
