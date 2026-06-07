import { NextResponse } from 'next/server';
import { buildFacebookOAuthUrl } from '@/lib/metaApi';

/**
 * GET /api/meta/connect
 * Gera a URL OAuth do Facebook e redireciona o usuário.
 * O App Secret NUNCA sai do servidor.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      throw new Error('Usuário não identificado. Por favor, faça login.');
    }

    // Passa o userId no state (codificado) para recuperarmos no callback
    const stateObj = { userId, nonce: crypto.randomUUID() };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

    const oauthUrl = buildFacebookOAuthUrl(state);
    return NextResponse.redirect(oauthUrl);
  } catch (err: any) {
    const msg = encodeURIComponent(err.message ?? 'Erro ao iniciar conexão com o Facebook.');
    return NextResponse.redirect(
      `http://localhost:9002/meta-ads?error=${msg}`
    );
  }
}
