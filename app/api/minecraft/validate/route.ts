import { NextRequest, NextResponse } from 'next/server';
import { validateMinecraftUsername } from '@/lib/minecraft/api';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { error: 'Username es requerido' },
      { status: 400 }
    );
  }

  try {
    const result = await validateMinecraftUsername(username);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error validando usuario de Minecraft', error);
    return NextResponse.json(
      { error: 'Error al validar el usuario' },
      { status: 500 }
    );
  }
}

