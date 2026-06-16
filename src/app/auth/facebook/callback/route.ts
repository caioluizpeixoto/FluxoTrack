import { NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getMetaMe,
  getMetaBusinesses,
  getMetaAdAccounts,
  getMetaPixels,
  MetaApiError,
} from '@/lib/metaApi';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * GET /auth/facebook/callback
 * Recebe o `code` do Facebook após autorização OAuth.
 * Fluxo completo:
 *   1. Troca code → short-lived token
 *   2. Troca → long-lived token (~60 dias)
 *   3. Busca /me, /me/businesses, /me/adaccounts, pixels
 *   4. Salva tudo no Supabase
 *   5. Redireciona para /integrations
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // ── Erros vindos do Facebook (usuário cancelou, permissão negada, etc.) ──
  const fbError = searchParams.get('error');
  const fbErrorReason = searchParams.get('error_reason');

  if (fbError) {
    let msg = 'Conexão cancelada.';
    if (fbError === 'access_denied' || fbErrorReason === 'user_denied') {
      msg = 'Você cancelou a autorização do Facebook.';
    }
    return NextResponse.redirect(
      `${origin}/integrations?error=${encodeURIComponent(msg)}`
    );
  }

  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(
      `${origin}/integrations?error=${encodeURIComponent('Código de autorização ausente ou inválido.')}`
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    // ── 1. code → short-lived token ──────────────────────────────────────────
    const shortToken = await exchangeCodeForToken(code);

    // ── 2. short-lived → long-lived token ────────────────────────────────────
    const longToken = await exchangeForLongLivedToken(shortToken.access_token);
    const accessToken = longToken.access_token;
    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
      : null;

    // ── 3. /me ────────────────────────────────────────────────────────────────
    const metaUser = await getMetaMe(accessToken);

    // ── 4. Identificar o usuário através do "state" do OAuth ───────────────
    const stateStr = searchParams.get('state');
    let supabaseUserId: string | null = null;

    if (stateStr) {
      try {
        const decoded = Buffer.from(stateStr, 'base64url').toString('utf-8');
        const stateObj = JSON.parse(decoded);
        supabaseUserId = stateObj.userId;
      } catch (err) {
        console.warn('[Callback] Falha ao parsear state:', err);
      }
    }

    // Fallback: busca pelo facebook_id (re-conexão)
    if (!supabaseUserId) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('facebook_id', metaUser.id)
        .maybeSingle();
      supabaseUserId = existing?.id ?? null;
    }

    if (!supabaseUserId) {
      return NextResponse.redirect(
        `${origin}/integrations?error=${encodeURIComponent('Você precisa estar logado no FluxoFy para conectar o Facebook.')}`
      );
    }

    // ── 5. Atualiza profile ───────────────────────────────────────────────────
    await supabase.from('profiles').update({
      meta_access_token: accessToken,
      meta_connected: true,
      facebook_id: metaUser.id,
      facebook_name: metaUser.name,
      meta_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', supabaseUserId);

    // ── 6. Upsert meta_connections ────────────────────────────────────────────
    const { data: conn } = await supabase
      .from('meta_connections')
      .upsert({
        user_id: supabaseUserId,
        facebook_user_id: metaUser.id,
        facebook_name: metaUser.name,
        access_token: accessToken,
        token_type: longToken.token_type ?? 'bearer',
        expires_at: expiresAt,
        scopes: ['ads_read', 'business_management', 'pages_show_list', 'pages_read_engagement'],
        status: 'connected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,facebook_user_id' })
      .select('id')
      .single();

    const connectionId = conn?.id;

    if (!connectionId) {
      throw new Error('Falha ao salvar a conexão no banco de dados.');
    }

    // ── 7. Businesses ────────────────────────────────────────────────────────
    let businesses: Awaited<ReturnType<typeof getMetaBusinesses>> = [];
    try {
      businesses = await getMetaBusinesses(accessToken);
      for (const biz of businesses) {
        await supabase.from('meta_businesses').upsert({
          user_id: supabaseUserId,
          connection_id: connectionId,
          business_id: biz.id,
          name: biz.name,
          verification_status: biz.verification_status ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,business_id' });
      }
    } catch (e) {
      console.warn('[Callback] Business Managers:', (e as Error).message);
    }

    // ── 8. Ad Accounts ───────────────────────────────────────────────────────
    const adAccounts = await getMetaAdAccounts(accessToken);
    let totalPixels = 0;

    for (const acc of adAccounts) {
      const rawId = acc.account_id ?? acc.id.replace('act_', '');

      await supabase.from('meta_ad_accounts').upsert({
        user_id: supabaseUserId,
        connection_id: connectionId,
        business_id: acc.business?.id ?? null,
        account_id: rawId,
        account_name: acc.name,
        currency: acc.currency,
        timezone_name: acc.timezone_name ?? null,
        account_status: String(acc.account_status),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,account_id' });

      // ── 9. Pixels por conta ─────────────────────────────────────────────
      const pixels = await getMetaPixels(rawId, accessToken);
      totalPixels += pixels.length;

      for (const px of pixels) {
        await supabase.from('meta_pixels').upsert({
          user_id: supabaseUserId,
          connection_id: connectionId,
          ad_account_id: rawId,
          pixel_id: px.id,
          pixel_name: px.name ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,pixel_id' });
      }
    }

    const params = new URLSearchParams({
      connected: 'true',
      accounts: String(adAccounts.length),
      pixels: String(totalPixels),
      businesses: String(businesses.length),
    });

    return NextResponse.redirect(`${origin}/integrations?${params.toString()}`);
  } catch (err: any) {
    console.error('[Facebook Callback] Erro:', err);

    let msg = 'Falha ao conectar conta Facebook.';
    if (err instanceof MetaApiError) msg = err.userMessage();

    return NextResponse.redirect(
      `${origin}/integrations?error=${encodeURIComponent(msg)}`
    );
  }
}
