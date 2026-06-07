import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getInsights, getAccountDetails } from '@/lib/metaApi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, accountId, level, datePreset, timeRange } = body;

    if (!userId || !accountId) {
      return NextResponse.json({ error: 'Missing userId or accountId' }, { status: 400 });
    }

    // Pega o token do banco
    const { data: conn } = await supabaseAdmin
      .from('meta_connections')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'No Meta connection found' }, { status: 404 });
    }

    const token = conn.access_token;

    // Constrói string de datas
    let dateParams = '';
    if (timeRange) {
      // Ex: timeRange = { since: 'YYYY-MM-DD', until: 'YYYY-MM-DD' }
      dateParams = `&time_range=${encodeURIComponent(JSON.stringify(timeRange))}`;
    } else if (datePreset) {
      dateParams = `&date_preset=${datePreset}`;
    } else {
      dateParams = '&date_preset=today';
    }

    // Se o level for account, talvez também queira o saldo real.
    let accountData = null;
    if (level === 'account' || level === 'all') {
      try {
        const details = await getAccountDetails(accountId, token);
        accountData = details;
        
        // Opcional: já atualizar o supabase_admin com esse balance.
        await supabaseAdmin.from('meta_ad_accounts').update({
          balance: details.balance || 0,
          amount_spent: details.amount_spent || 0,
          spend_cap: details.spend_cap || 0,
          account_status: details.account_status?.toString(),
          currency: details.currency,
        }).eq('account_id', accountId.replace('act_', ''));
      } catch (e) {
        console.error("Erro ao buscar detalhes da conta", e);
      }
    }

    // Busca as métricas pro nível desejado
    let insights = [];
    if (level !== 'account_only') {
      const realLevel = level === 'all' ? 'campaign' : level; // fallback se necessário, ou faremos múltiplas chamadas no cliente se ele pedir all. 
      // O Meta API não permite level=all. Se a UI precisa de campanhas, conjuntos e anúncios simultâneos, a UI chamará 3x ou faremos 3 chamadas aqui.
      
      if (level === 'all') {
        const [c, a, ad] = await Promise.all([
           getInsights(accountId, token, 'campaign', dateParams),
           getInsights(accountId, token, 'adset', dateParams),
           getInsights(accountId, token, 'ad', dateParams)
        ]);
        insights = { campaigns: c, adsets: a, ads: ad };
      } else {
        insights = await getInsights(accountId, token, realLevel as any, dateParams);
      }
    }

    return NextResponse.json({ success: true, insights, accountData });

  } catch (error: any) {
    console.error('Meta Insights Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
