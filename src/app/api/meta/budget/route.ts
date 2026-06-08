import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { updateCampaign, updateAdSet } from '@/lib/metaApi';

const META_API_VERSION = 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, id, action, value } = body; 
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

    // 1. Descobrir o orçamento atual
    const getUrl = `${META_BASE_URL}/${id}?fields=daily_budget,lifetime_budget&access_token=${token}`;
    const getRes = await fetch(getUrl);
    const getData = await getRes.json();

    if (getData.error) {
      return NextResponse.json({ error: getData.error.message }, { status: 400 });
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

    let newBudget = 0;
    
    if (action === 'fixed') {
      newBudget = Math.round(value * 100); // Converte para centavos reais
    } else {
      // Legacy code support just in case
      const currentBudgetStr = getData.daily_budget; 
      const currentBudget = Number(currentBudgetStr);
      const percentValue = value / 100;
      
      if (action === 'percentage_increase') {
        newBudget = Math.round(currentBudget * (1 + percentValue));
      } else if (action === 'percentage_decrease') {
        newBudget = Math.round(currentBudget * (1 - percentValue));
      }
    }

    if (newBudget <= 0) {
      return NextResponse.json({ error: 'Orçamento calculado inválido' }, { status: 400 });
    }

    // 2. Aplicar novo orçamento
    // NOTA: updateCampaign/updateAdSet já multiplicam por 100 internamente,
    // então passamos o valor em R$ (não em centavos)
    const valueInBRL = action === 'fixed' ? value : newBudget / 100;
    if (type === 'campaign') {
       await updateCampaign(id, token, { daily_budget: valueInBRL });
    } else if (type === 'adset') {
       await updateAdSet(id, token, { daily_budget: valueInBRL });
    }

    // 3. Atualizar localmente
    const tableMap: Record<string, string> = { campaign: 'meta_campaigns', adset: 'meta_adsets' };
    const idMap: Record<string, string> = { campaign: 'campaign_id', adset: 'adset_id' };
    
    if (tableMap[type]) {
      await supabaseAdmin.from(tableMap[type]).update({ daily_budget: newBudget }).eq(idMap[type], id);
    }

    return NextResponse.json({ success: true, new_budget: newBudget });

  } catch (error: any) {
    console.error('Meta Budget Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
