import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { getMetaAdAccounts, getInsights } from '@/lib/metaApi';

// Este endpoint precisa ser dinâmico para não cachear
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for Vercel Hobby/Pro se necessário

export async function GET(request: Request) {
  try {
    // Verificação de Segurança Opcional (Para Vercel Cron)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const userIdQuery = searchParams.get('user_id');

    // 1. Pega todas as conexões do Meta que possuem tokens válidos
    let query = supabase.from('meta_connections').select('user_id, access_token');
    if (userIdQuery) {
      query = query.eq('user_id', userIdQuery);
    }
    const { data: connections, error: connErr } = await query;

    if (connErr) throw connErr;
    if (!connections || connections.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma conexão Meta encontrada.' });
    }

    let usersUpdated = 0;
    const errors: any[] = [];

    // 2. Itera sobre cada usuário para calcular o faturamento Lifetime
    for (const conn of connections) {
      const { user_id, access_token } = conn;

      try {
        // Pega as contas de anúncio daquele usuário
        const { data: adAccounts } = await supabase
          .from('meta_ad_accounts')
          .select('account_id')
          .eq('user_id', user_id);

        if (!adAccounts || adAccounts.length === 0) continue;

        let totalLifetimeRevenue = 0;

        // Puxa os insights de cada conta (faturamento total / compras)
        for (const acc of adAccounts) {
          const insights = await getInsights(acc.account_id, access_token, 'account', '&date_preset=lifetime');
          
          if (insights && insights.data && insights.data.length > 0) {
            // O insight retorna array. Pegamos o total da conta.
            for (const item of insights.data) {
              if (item.action_values) {
                // Procurar por action_type == 'purchase' ou 'omni_purchase'
                const purchaseAction = item.action_values.find((a: any) => 
                  a.action_type === 'purchase' || a.action_type === 'omni_purchase'
                );
                if (purchaseAction) {
                  totalLifetimeRevenue += Number(purchaseAction.value || 0);
                }
              }
            }
          }
        }

        // 3. Atualiza ou insere na tabela `user_stats`
        if (totalLifetimeRevenue >= 0) {
          await supabase.from('user_stats').upsert({
            user_id: user_id,
            total_revenue: totalLifetimeRevenue,
            last_sync_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
          usersUpdated++;
        }

      } catch (err: any) {
        console.error(`Erro ao sincronizar usuário ${user_id}:`, err);
        errors.push({ user_id, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sincronização concluída', 
      usersUpdated,
      errors: errors.length > 0 ? errors : undefined 
    });

  } catch (e: any) {
    console.error('Cron Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
