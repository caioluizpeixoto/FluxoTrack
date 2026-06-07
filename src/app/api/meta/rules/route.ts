import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { getInsights } from '@/lib/metaApi';

export async function POST(req: NextRequest) {
  try {
    const { userId, productId } = await req.json();
    if (!userId || !productId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    // Get rules
    const { data: rules } = await supabaseAdmin.from('product_rules').select('*').eq('product_id', productId);
    if (!rules || rules.length === 0) return NextResponse.json({ success: true, actionsTaken: 0, message: 'No rules found' });

    // Get product ad account
    const { data: accLink } = await supabaseAdmin.from('product_ad_accounts').select('ad_account_id').eq('product_id', productId).single();
    if (!accLink) return NextResponse.json({ success: true, actionsTaken: 0, message: 'No ad account linked' });

    // Get token
    const { data: conn } = await supabaseAdmin.from('meta_connections').select('access_token').eq('user_id', userId).single();
    if (!conn) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 });

    // Fetch live metrics (Today)
    const metrics = await getInsights(conn.access_token, accLink.ad_account_id, 'campaign', 'today');
    
    let actionsTaken = 0;

    for (const rule of rules) {
       for (const camp of metrics) {
         if (camp.status !== 'ACTIVE') continue;

         let metricValue = 0;
         const spend = Number(camp.spend || 0);

         if (rule.condition_metric === 'spend') metricValue = spend;
         else if (rule.condition_metric === 'cpa') {
            let purchases = 0;
            const pAct = camp.actions?.find((a:any) => a.action_type === 'purchase');
            if (pAct) purchases = Number(pAct.value || 0);
            metricValue = purchases > 0 ? spend / purchases : spend; // If 0 purchases, CPA is essentially the spend
         }
         else if (rule.condition_metric === 'roas') {
            let rev = 0;
            const pRev = camp.action_values?.find((a:any) => a.action_type === 'purchase');
            if (pRev) rev = Number(pRev.value || 0);
            metricValue = spend > 0 ? rev / spend : 0;
         }

         let conditionMet = false;
         if (rule.condition_operator === '>' && metricValue > rule.condition_value) conditionMet = true;
         if (rule.condition_operator === '<' && metricValue < rule.condition_value) conditionMet = true;

         if (conditionMet) {
            console.log(`[Rule Exec] Rule ${rule.name} matched for Campaign ${camp.campaign_name}. Metric: ${metricValue}`);
            // Execute action
            if (rule.action_type === 'pause_campaign') {
               await fetch(`https://graph.facebook.com/v18.0/${camp.campaign_id}`, {
                  method: 'POST',
                  body: new URLSearchParams({ status: 'PAUSED', access_token: conn.access_token })
               });
               actionsTaken++;
            }
            else if (rule.action_type === 'increase_budget' && rule.action_value) {
               // Get current budget first
               const bRes = await fetch(`https://graph.facebook.com/v18.0/${camp.campaign_id}?fields=daily_budget&access_token=${conn.access_token}`);
               const bData = await bRes.json();
               if (bData.daily_budget) {
                  const currentBudget = Number(bData.daily_budget);
                  const newBudget = Math.floor(currentBudget * (1 + (rule.action_value / 100)));
                  await fetch(`https://graph.facebook.com/v18.0/${camp.campaign_id}`, {
                    method: 'POST',
                    body: new URLSearchParams({ daily_budget: newBudget.toString(), access_token: conn.access_token })
                  });
                  actionsTaken++;
               }
            }
         }
       }
    }

    return NextResponse.json({ success: true, actionsTaken });

  } catch (error: any) {
    console.error('Rules error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
