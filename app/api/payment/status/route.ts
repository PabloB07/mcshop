import { NextRequest, NextResponse } from 'next/server';
import { createFlowAPI } from '@/lib/flow/api';

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

    const flowAPI = createFlowAPI();
    let paymentStatus;

    if (token) {
      paymentStatus = await flowAPI.getPaymentStatus(token);
    } else {
      paymentStatus = await flowAPI.getPaymentStatusByCommerceOrder(commerceOrder!);
    }

    return NextResponse.json(paymentStatus);
  } catch (error: any) {
    console.error('Error getting payment status:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener el estado del pago' },
      { status: 500 }
    );
  }
}

