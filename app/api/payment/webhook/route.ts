import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createFlowAPI } from '@/lib/flow/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    // Verificar estado del pago en Flow
    const flowAPI = createFlowAPI();
    const paymentStatus = await flowAPI.getPaymentStatus(token);

    const supabase = createServerClient();

    // Buscar orden por token
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('flow_token', token)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Actualizar estado de la orden según el estado del pago
    // status 1 = pagado, 2 = cancelado, 3 = rechazado
    let orderStatus = 'pending';
    if (paymentStatus.status === 1) {
      orderStatus = 'paid';
    } else if (paymentStatus.status === 2) {
      orderStatus = 'cancelled';
    }

    await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('id', order.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar webhook' },
      { status: 500 }
    );
  }
}

