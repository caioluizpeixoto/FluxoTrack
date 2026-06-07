import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

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

    // 1. Descobrir o orçamento atual (daily_budget)
    const getUrl = `${META_BASE_URL}/${id}?fields=daily_budget&access_token=${token}`;
    const getRes = await fetch(getUrl);
    const getData = await getRes.json();

    if (getData.error) {
      return NextResponse.json({ error: getData.error.message }, { status: 400 });
    }

    let newBudget = 0;
    const currentBudgetStr = getData.daily_budget; // in cents (e.g., 1000 = $10)

    if (action === 'fixed') {
      newBudget = Math.round(value * 100); // Converte para centavos reais
    } else {
      if (!currentBudgetStr) {
        return NextResponse.json({ error: 'Orçamento diário não encontrado no item (talvez seja lifetime_budget)' }, { status: 400 });
      }
      
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
    const postUrl = `${META_BASE_URL}/${id}`;
    const formData = new URLSearchParams();
    formData.append('daily_budget', newBudget.toString());
    formData.append('access_token', token);

    const postRes = await fetch(postUrl, {
      method: 'POST',
      body: formData
    });

    const postData = await postRes.json();

    if (postData.error) {
      return NextResponse.json({ error: postData.error.message }, { status: 400 });
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
