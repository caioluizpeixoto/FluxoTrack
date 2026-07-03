import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { updateCampaign, updateAdSet } from '@/lib/metaApi';

const META_API_VERSION = 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, id, action, value, productId, salesBefore, roiBefore } = body; 
    // action: 'percentage_increase', 'percentage_decrease', 'fixed'
    // type: 'campaign', 'adset'
    
    if (!userId || !type || !id || !action || value === undefined) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: conn } = await supabaseAdmin.from('meta_connections').select('access_token').eq('user_id', userId).single();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'No Meta connection found' }, { status: 404 });
    }

    const token = conn.access_token;

    // 1. Descobrir o orçamento atual e a moeda da conta
    const getUrl = `${META_BASE_URL}/${id}?fields=daily_budget,lifetime_budget,account_id&access_token=${token}`;
    const getRes = await fetch(getUrl);
    const getData = await getRes.json();

    if (getData.error) {
      return NextResponse.json({ error: getData.error.message }, { status: 400 });
    }

    let currency = 'BRL';
    if (getData.account_id) {
       const accountUrl = `${META_BASE_URL}/act_${getData.account_id}?fields=currency&access_token=${token}`;
       const accountRes = await fetch(accountUrl);
       const accountData = await accountRes.json();
       if (accountData.currency) {
         currency = accountData.currency.toUpperCase();
       }
    }

    let usdToBrlRate = 5.0;
    if (currency === 'USD') {
      try {
        const exchangeRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
        const exchangeData = await exchangeRes.json();
        if (exchangeData?.USDBRL?.bid) {
          usdToBrlRate = parseFloat(exchangeData.USDBRL.bid);
        }
      } catch (e) {
        console.error('Erro ao buscar cotação USD-BRL:', e);
      }
    }

    if (!getData.daily_budget && !getData.lifetime_budget) {
      if (type === 'campaign') {
         return NextResponse.json({ error: 'Esta campanha não possui orçamento ativo no nível de campanha (ABO). Altere o orçamento diretamente nos Conjuntos de Anúncios.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Este item não possui um orçamento definido.' }, { status: 400 });
    }

    if (getData.lifetime_budget && !getData.daily_budget) {
      return NextResponse.json({ error: 'Este item usa Orçamento Vitalício. Atualmente o sistema só suporta alterar Orçamento Diário.' }, { status: 400 });
    }

    let newBudgetInMetaCents = 0; // Para enviar à Meta
    let localBudgetInBrl = 0;     // Para salvar no DB local

    if (action === 'fixed') {
      // value é BRL
      localBudgetInBrl = value;
      if (currency === 'USD') {
        newBudgetInMetaCents = Math.round((value / usdToBrlRate) * 100);
      } else {
        newBudgetInMetaCents = Math.round(value * 100);
      }
    } else {
      const currentBudgetMetaCents = Number(getData.daily_budget);
      const percentValue = value / 100;
      
      if (action === 'percentage_increase') {
        newBudgetInMetaCents = Math.round(currentBudgetMetaCents * (1 + percentValue));
      } else if (action === 'percentage_decrease') {
        newBudgetInMetaCents = Math.round(currentBudgetMetaCents * (1 - percentValue));
      }

      const metaValueUnit = newBudgetInMetaCents / 100;
      localBudgetInBrl = currency === 'USD' ? metaValueUnit * usdToBrlRate : metaValueUnit;
    }

    if (newBudgetInMetaCents <= 0) {
      return NextResponse.json({ error: 'Orçamento calculado inválido' }, { status: 400 });
    }

    // 2. Aplicar novo orçamento
    const valueForMeta = newBudgetInMetaCents / 100;
    if (type === 'campaign') {
       await updateCampaign(id, token, { daily_budget: valueForMeta });
    } else if (type === 'adset') {
       await updateAdSet(id, token, { daily_budget: valueForMeta });
    }

    // 3. Atualizar localmente em BRL unitário (não em centavos)
    const tableMap: Record<string, string> = { campaign: 'meta_campaigns', adset: 'meta_adsets' };
    const idMap: Record<string, string> = { campaign: 'campaign_id', adset: 'adset_id' };
    
    if (tableMap[type]) {
      const currentBudgetMetaCents = Number(getData.daily_budget) || 0;
      const metaValueUnitBefore = currentBudgetMetaCents / 100;
      const oldBudgetInBrl = currency === 'USD' ? metaValueUnitBefore * usdToBrlRate : metaValueUnitBefore;

      await supabaseAdmin.from(tableMap[type]).update({ daily_budget: localBudgetInBrl }).eq(idMap[type], id);

      if (productId) {
        await supabaseAdmin.from('budget_history').insert({
          user_id: userId,
          product_id: productId,
          entity_type: type,
          entity_id: id,
          old_budget: oldBudgetInBrl,
          new_budget: localBudgetInBrl,
          sales_before: salesBefore || 0,
          roi_before: roiBefore || 0
        });
      }
    }

    return NextResponse.json({ success: true, new_budget: localBudgetInBrl });

  } catch (error: any) {
    console.error('Meta Budget Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
