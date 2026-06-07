import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { updateCampaign, updateAdSet, updateAd } from '@/lib/metaApi';

export async function POST(request: Request) {
  try {
    const { userId, type, id, payload } = await request.json();

    if (!userId || !type || !id || !payload) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Recupera conexão ativa do usuário para obter o token com segurança
    const { data: conn, error: connErr } = await supabase
      .from('meta_connections')
      .select('id, access_token, status')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Conta Meta não conectada ou expirada.' }, { status: 401 });
    }

    const token = conn.access_token;
    let result;

    // Dispara a requisição de update na Graph API correspondente ao tipo de recurso
    if (type === 'campaign') {
      result = await updateCampaign(id, token, payload);
      if (result.success) {
        // Atualiza o banco local para espelhar a mudança na Meta
        await supabase.from('meta_campaigns').update({
          ...(payload.status && { status: payload.status }),
          ...(payload.name && { name: payload.name }),
          ...(payload.daily_budget !== undefined && { daily_budget: payload.daily_budget }),
          ...(payload.lifetime_budget !== undefined && { lifetime_budget: payload.lifetime_budget }),
        }).eq('campaign_id', id);
      }
    } else if (type === 'adset') {
      result = await updateAdSet(id, token, payload);
      if (result.success) {
        await supabase.from('meta_adsets').update({
          ...(payload.status && { status: payload.status }),
          ...(payload.name && { name: payload.name }),
          ...(payload.daily_budget !== undefined && { daily_budget: payload.daily_budget }),
          ...(payload.lifetime_budget !== undefined && { lifetime_budget: payload.lifetime_budget }),
        }).eq('adset_id', id);
      }
    } else if (type === 'ad') {
      result = await updateAd(id, token, payload);
      if (result.success) {
        await supabase.from('meta_ads').update({
          ...(payload.status && { status: payload.status }),
          ...(payload.name && { name: payload.name }),
        }).eq('ad_id', id);
      }
    } else {
      return NextResponse.json({ error: 'Tipo desconhecido (deve ser campaign, adset ou ad)' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[Meta Manage API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
