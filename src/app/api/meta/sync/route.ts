import { NextResponse } from 'next/server';
import {
  getCampaignInsights,
  getCampaigns,
  getAdSets,
  getAds,
  extractAction,
  extractRoas,
  MetaApiError,
  type DatePreset,
} from '@/lib/metaApi';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * POST /api/meta/sync
 * Sincroniza métricas reais da Meta Marketing API.
 *
 * Body: { userId: string; datePreset?: DatePreset }
 */
export async function POST(request: Request) {
  try {
    const { userId, datePreset = 'last_30d' } = (await request.json()) as {
      userId: string;
      datePreset?: DatePreset;
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // ── 1. Busca a conexão ativa do usuário ───────────────────────────────────
    const { data: conn, error: connErr } = await supabase
      .from('meta_connections')
      .select('id, access_token, status')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (connErr || !conn) {
      return NextResponse.json(
        { error: 'Conta Meta não conectada. Conecte sua conta primeiro.', code: 'NOT_CONNECTED' },
        { status: 401 }
      );
    }

    const accessToken = conn.access_token;
    const connectionId = conn.id;

    // ── 2. Busca contas de anúncio cadastradas ────────────────────────────────
    const { data: accounts } = await supabase
      .from('meta_ad_accounts')
      .select('account_id, account_name')
      .eq('user_id', userId)
      .eq('connection_id', connectionId);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma conta de anúncio encontrada. Reconecte sua conta.', code: 'NO_ACCOUNTS' },
        { status: 404 }
      );
    }

    let totalSynced = 0;
    const errors: string[] = [];

    // ── 3. Itera cada conta e busca insights ──────────────────────────────────
    for (const account of accounts) {
      try {
        const rows = await getCampaignInsights(
          account.account_id,
          accessToken,
          datePreset
        );

        for (const row of rows) {
          const purchases = extractAction(row.actions, 'purchase') || extractAction(row.actions, 'omni_purchase');
          const purchaseValue = extractAction(row.action_values, 'purchase') || extractAction(row.action_values, 'omni_purchase');
          const leads = extractAction(row.actions, 'lead') || extractAction(row.actions, 'onsite_conversion.lead_grouped');
          const roas = extractRoas(row.purchase_roas) || (purchaseValue > 0 && parseFloat(row.spend) > 0
            ? purchaseValue / parseFloat(row.spend)
            : 0);
          const costPerLead = leads > 0 ? parseFloat(row.spend) / leads : 0;

          await supabase.from('meta_campaign_metrics').upsert({
            user_id: userId,
            connection_id: connectionId,
            ad_account_id: account.account_id,
            campaign_id: row.campaign_id,
            campaign_name: row.campaign_name,
            date_start: row.date_start,
            date_stop: row.date_stop,
            spend: parseFloat(row.spend ?? '0'),
            impressions: parseInt(row.impressions ?? '0', 10),
            clicks: parseInt(row.clicks ?? '0', 10),
            ctr: parseFloat(row.ctr ?? '0'),
            cpc: parseFloat(row.cpc ?? '0'),
            cpm: parseFloat(row.cpm ?? '0'),
            reach: parseInt(row.reach ?? '0', 10),
            frequency: parseFloat(row.frequency ?? '0'),
            purchases: Math.round(purchases),
            purchase_value: purchaseValue,
            leads: Math.round(leads),
            cost_per_lead: costPerLead,
            roas,
            raw_data: row as any,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,ad_account_id,campaign_id,date_start,date_stop',
          });

          totalSynced++;
        }

        // --- Sincronizar Estrutura (Campanhas, AdSets, Ads) ---
        const fbCampaigns = await getCampaigns(account.account_id, accessToken);
        for (const c of fbCampaigns) {
          await supabase.from('meta_campaigns').upsert({
            user_id: userId,
            connection_id: connectionId,
            ad_account_id: account.account_id,
            campaign_id: c.id,
            name: c.name,
            status: c.status,
            daily_budget: c.daily_budget ? parseFloat(c.daily_budget)/100 : null,
            lifetime_budget: c.lifetime_budget ? parseFloat(c.lifetime_budget)/100 : null,
            objective: c.objective,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,ad_account_id,campaign_id' });
        }

        const fbAdsets = await getAdSets(account.account_id, accessToken);
        for (const a of fbAdsets) {
          await supabase.from('meta_adsets').upsert({
            user_id: userId,
            connection_id: connectionId,
            ad_account_id: account.account_id,
            campaign_id: a.campaign_id,
            adset_id: a.id,
            name: a.name,
            status: a.status,
            daily_budget: a.daily_budget ? parseFloat(a.daily_budget)/100 : null,
            lifetime_budget: a.lifetime_budget ? parseFloat(a.lifetime_budget)/100 : null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,ad_account_id,adset_id' });
        }

        const fbAds = await getAds(account.account_id, accessToken);
        for (const ad of fbAds) {
          await supabase.from('meta_ads').upsert({
            user_id: userId,
            connection_id: connectionId,
            ad_account_id: account.account_id,
            campaign_id: ad.campaign_id,
            adset_id: ad.adset_id,
            ad_id: ad.id,
            name: ad.name,
            status: ad.status,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,ad_account_id,ad_id' });
        }

      } catch (err: any) {
        const msg = err instanceof MetaApiError ? err.userMessage() : err.message;
        errors.push(`${account.account_name} (${account.account_id}): ${msg}`);
        console.error('[Sync] Erro na conta', account.account_id, msg);

        // Se token expirou, marca a conexão como expirada
        if (err instanceof MetaApiError && err.isExpired()) {
          await supabase.from('meta_connections').update({ status: 'expired' }).eq('id', connectionId);
          return NextResponse.json(
            { error: err.userMessage(), code: 'TOKEN_EXPIRED' },
            { status: 401 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedCampaigns: totalSynced,
      syncedAt: new Date().toISOString(),
      datePreset,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[Meta Sync] Erro geral:', err);
    return NextResponse.json({ error: 'Falha interna na sincronização.' }, { status: 500 });
  }
}
