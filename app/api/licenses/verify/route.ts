import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, product_id } = body;

    if (!license_key) {
      return NextResponse.json(
        { error: 'license_key es requerido' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Buscar licencia
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*, product:products(*)')
      .eq('license_key', license_key)
      .single();

    if (licenseError || !license) {
      return NextResponse.json(
        { valid: false, error: 'Licencia no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la licencia esté activa
    if (license.status !== 'active') {
      return NextResponse.json({
        valid: false,
        error: `Licencia ${license.status}`,
        status: license.status,
      });
    }

    // Verificar expiración si existe
    if (license.expires_at) {
      const expiresAt = new Date(license.expires_at);
      if (new Date() > expiresAt) {
        // Actualizar estado a expirado
        await supabase
          .from('licenses')
          .update({ status: 'expired' })
          .eq('id', license.id);

        return NextResponse.json({
          valid: false,
          error: 'Licencia expirada',
          status: 'expired',
        });
      }
    }

    // Si se proporciona product_id, verificar que coincida
    if (product_id && license.product_id !== product_id) {
      return NextResponse.json({
        valid: false,
        error: 'La licencia no corresponde a este producto',
      });
    }

    // Licencia válida
    return NextResponse.json({
      valid: true,
      license: {
        id: license.id,
        product_id: license.product_id,
        product_name: license.product?.name,
        status: license.status,
        expires_at: license.expires_at,
      },
    });
  } catch (error) {
    logger.error('Error verificando licencia', error);
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : 'Error al verificar la licencia' },
      { status: 500 }
    );
  }
}

