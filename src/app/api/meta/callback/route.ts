/**
 * Este endpoint foi movido para /auth/facebook/callback
 * Mantido apenas para compatibilidade — redireciona automaticamente
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const qs = searchParams.toString();
  return NextResponse.redirect(
    `${origin}/auth/facebook/callback${qs ? '?' + qs : ''}`
  );
}
