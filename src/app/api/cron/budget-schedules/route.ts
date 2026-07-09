import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { updateCampaign, updateAdSet } from '@/lib/metaApi';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Obter hora atual no formato HH:00 (ajustando fuso caso necessário. Assumimos que o servidor e o usuário operam em um fuso similar, ou podemos apenas pegar o HH atual do UTC e combinar)
    // O ideal seria que a action_time estivesse num timezone comum, vamos pegar a hora cheia do servidor (ex: "23:00")
    
    // Para maior precisão, o cron deve rodar no inicio de cada hora (ex: 23:00, 23:05).
    // Pegamos todos os schedules ativos.
    const { data: schedules, error: schedErr } = await supabase
      .from('budget_schedules')
      .select('*')
      .eq('is_active', true);

    if (schedErr || !schedules || schedules.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum agendamento ativo.' });
    }

    // Pega a hora atual do Brasil (exemplo) para cruzar com action_time (que o user preencheu em horario local)
    const now = new Date();
    // Forçamos o timezone do Brasil (America/Sao_Paulo)
    const options = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false } as const;
    const currentHourStr = new Intl.DateTimeFormat('pt-BR', options).format(now);
    
    const currentHourPrefix = `${currentHourStr}:`; // Ex: "23:"

    // Filtra os schedules cujo horário bate com a hora atual. 
    // Como a pessoa digitou "23:00" ou "23:30", vamos rodar se a HORA bater e o cron rodar dentro daquela hora.
    // (Para simplificar, se o action_time começar com "23:", a gente processa. Mas o ideal é que o cron rode 1x por hora para não duplicar).
    // Para evitar processamento duplicado, pode-se registrar num log de execução, ou assumir que a API idempotente (set_fixed) não tem problema rodar 2x.
    // Se for decrease_percent, rodar 2x é um problema! Então vamos marcar last_run_at ou apenas exigir `set_fixed`.
    
    // Como definimos `set_fixed` na UI, setar o budget múltiplas vezes para "R$ 50" não altera nada além de gastar cota de API.
    
    const schedulesToRun = schedules.filter(s => s.action_time.startsWith(currentHourPrefix));

    if (schedulesToRun.length === 0) {
      return NextResponse.json({ success: true, message: `Nenhum agendamento para a hora ${currentHourPrefix}xx` });
    }

    let actionsTaken = 0;

    // Agrupa por user_id para buscar tokens de forma otimizada
    const usersSet = new Set(schedulesToRun.map(s => s.user_id));
    const userTokens: Record<string, string> = {};

    for (const uid of Array.from(usersSet)) {
      const { data: conn } = await supabase
        .from('meta_connections')
        .select('access_token')
        .eq('user_id', uid)
        .eq('status', 'connected')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (conn?.access_token) {
        userTokens[uid] = conn.access_token;
      }
    }

    // Processa
    for (const schedule of schedulesToRun) {
      const token = userTokens[schedule.user_id];
      if (!token) continue; // Usuário sem token

      if (schedule.action_type === 'set_fixed') {
         const newBudgetCents = Math.floor(Number(schedule.action_value) * 100);
         const payload = { daily_budget: newBudgetCents };

         let res;
         if (schedule.target_level === 'campaign') {
           res = await updateCampaign(schedule.target_id, token, payload);
           if (res.success) {
              await supabase.from('meta_campaigns').update({ daily_budget: newBudgetCents }).eq('campaign_id', schedule.target_id);
           }
         } else if (schedule.target_level === 'adset') {
           res = await updateAdSet(schedule.target_id, token, payload);
           if (res.success) {
              await supabase.from('meta_adsets').update({ daily_budget: newBudgetCents }).eq('adset_id', schedule.target_id);
           }
         }
         
         if (res && res.success) {
            actionsTaken++;
         }
      }
    }

    return NextResponse.json({ success: true, actionsTaken });

  } catch (err: any) {
    console.error('[Cron Budget Schedules API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
