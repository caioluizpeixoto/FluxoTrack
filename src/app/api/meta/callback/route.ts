/**
 * Este endpoint foi movido para /auth/facebook/callback
 * Mantido apenas para compatibilidade — redireciona automaticamente
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  return NextResponse.redirect(
    `http://localhost:9002/auth/facebook/callback${qs ? '?' + qs : ''}`
  );
}
