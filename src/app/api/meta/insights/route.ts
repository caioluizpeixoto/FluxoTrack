import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { getInsights, getAccountDetails, getCampaigns, getAdSets, getAds } from '@/lib/metaApi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, accountId, level, datePreset, timeRange, targetCurrency } = body;
    const finalTargetCurrency = targetCurrency || 'BRL';

    if (!userId || !accountId) {
      return NextResponse.json({ error: 'Missing userId or accountId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
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
    let accountError = null;
    let exchangeRate = 1;
    let accountCurrency = 'BRL';

    if (level === 'account' || level === 'all') {
      try {
        const details = await getAccountDetails(accountId, token);
        accountCurrency = details.currency || 'BRL';
        
        let prepaid_balance = null;
        if (details.funding_source_details?.display_string) {
          // Extracts amounts like "R$49,99" or "R$ 49,99" or "US$ 10.50"
          const match = details.funding_source_details.display_string.match(/[\d.,]+/);
          if (match) {
            // Converts "49,99" to 49.99
            prepaid_balance = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
          }
        }
        details.prepaid_balance = prepaid_balance;
        accountData = details;
        
        // Opcional: já atualizar o supabase_admin com esse balance.
        await supabaseAdmin.from('meta_ad_accounts').update({
          balance: details.balance || 0,
          amount_spent: details.amount_spent || 0,
          spend_cap: details.spend_cap || 0,
          account_status: details.account_status?.toString(),
          currency: details.currency,
        }).eq('account_id', accountId.replace('act_', ''));
      } catch (e: any) {
        console.error("Erro ao buscar detalhes da conta", e);
        accountError = e.message;
      }
    }

    if (accountCurrency && accountCurrency.toUpperCase() !== finalTargetCurrency.toUpperCase()) {
      try {
        const xrRes = await fetch(`https://economia.awesomeapi.com.br/json/last/${accountCurrency.toUpperCase()}-${finalTargetCurrency.toUpperCase()}`);
        if (xrRes.ok) {
          const xrData = await xrRes.json();
          const pair = `${accountCurrency.toUpperCase()}${finalTargetCurrency.toUpperCase()}`;
          if (xrData[pair] && xrData[pair].ask) {
            exchangeRate = parseFloat(xrData[pair].ask);
          }
        }
      } catch (e) {
        console.error("Erro ao buscar taxa de cambio", e);
      }
    }

    if (accountData && exchangeRate !== 1) {
      if (accountData.balance) accountData.balance = (Number(accountData.balance) * exchangeRate).toString();
      if (accountData.amount_spent) accountData.amount_spent = (Number(accountData.amount_spent) * exchangeRate).toString();
      if (accountData.prepaid_balance) accountData.prepaid_balance = Number(accountData.prepaid_balance) * exchangeRate;
    }

    const convert = (val: string | number | undefined) => {
      if (val === undefined || val === null) return val;
      const num = Number(val);
      if (isNaN(num)) return val;
      return (num * exchangeRate).toString();
    };

    const applyExchangeRate = (arr: any[]) => {
      if (exchangeRate === 1) return arr;
      return arr.map(item => {
        const newItem = { ...item };
        if (newItem.spend) newItem.spend = convert(newItem.spend);
        if (newItem.cpc) newItem.cpc = convert(newItem.cpc);
        if (newItem.cpm) newItem.cpm = convert(newItem.cpm);
        if (newItem.daily_budget) newItem.daily_budget = convert(newItem.daily_budget);
        if (newItem.lifetime_budget) newItem.lifetime_budget = convert(newItem.lifetime_budget);
        if (newItem.action_values) {
           newItem.action_values = newItem.action_values.map((a: any) => ({ ...a, value: convert(a.value) }));
        }
        return newItem;
      });
    };

    // Busca as métricas pro nível desejado
    let insights = [];
    if (level !== 'account_only') {
      const realLevel = level === 'all' ? 'campaign' : level; // fallback se necessário, ou faremos múltiplas chamadas no cliente se ele pedir all. 
      // O Meta API não permite level=all. Se a UI precisa de campanhas, conjuntos e anúncios simultâneos, a UI chamará 3x ou faremos 3 chamadas aqui.
      
      if (level === 'all') {
        const [c, a, ad, cStruct, aStruct, adStruct] = await Promise.all([
           getInsights(accountId, token, 'campaign', dateParams),
           getInsights(accountId, token, 'adset', dateParams),
           getInsights(accountId, token, 'ad', dateParams),
           getCampaigns(accountId, token),
           getAdSets(accountId, token),
           getAds(accountId, token)
        ]);

        // Merge structure into insights
        const merge = (insArr: any[], structArr: any[], idKeyIns: string, idKeyStruct: string) => {
           // We want to return structural data EVEN IF there are no insights (spend = 0)
           const merged = [...structArr].map(struct => {
              const ins = insArr.find(i => i[idKeyIns] === struct[idKeyStruct]);
              return { ...struct, ...ins, [idKeyIns]: struct[idKeyStruct], [`${idKeyIns.replace('_id', '')}_name`]: struct.name };
           });
           return merged;
        };

        insights = { 
           campaigns: applyExchangeRate(merge(c, cStruct, 'campaign_id', 'id')), 
           adsets: applyExchangeRate(merge(a, aStruct, 'adset_id', 'id')), 
           ads: applyExchangeRate(merge(ad, adStruct, 'ad_id', 'id')) 
        } as any;
      } else {
        const rawInsights = await getInsights(accountId, token, realLevel as any, dateParams);
        insights = applyExchangeRate(rawInsights);
      }
    }

    return NextResponse.json({ success: true, insights, accountData, accountError });

  } catch (error: any) {
    console.error('Meta Insights Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
