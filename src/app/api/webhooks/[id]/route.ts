
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * Receptor Genérico de Webhooks (Kiwify, Hotmart, etc.)
 * Este endpoint recebe as vendas das plataformas e salva no Supabase.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: webhookId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const body = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'UserID não fornecido na URL' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verificar se o webhook existe
    const { data: webhookConfig, error: webhookError } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('user_id', userId)
      .maybeSingle();

    if (webhookError || !webhookConfig) {
      return NextResponse.json({ error: 'Configuração de webhook não encontrada' }, { status: 404 });
    }

    // 2. Normalizar dados da plataforma (Exemplo simples para Kiwify/Hotmart)
    const platform = webhookConfig.platform;
    const value = parseFloat(body.amount || body.price || body.full_price || 0) / (platform === 'kiwify' ? 100 : 1);
    const status = (body.order_status || body.status || 'approved').toLowerCase();
    const externalId = body.order_id || body.transaction || body.id || 'unknown';

    const conversionData = {
      user_id: userId,
      external_id: externalId,
      value,
      status,
      timestamp: new Date().toISOString(),
    };

    // 3. Salvar a conversão
    const { error: conversionError } = await supabaseAdmin
      .from('conversions')
      .insert(conversionData);

    if (conversionError) throw conversionError;

    // 4. Também salvar como um evento de tracking para o funil
    const { error: eventError } = await supabaseAdmin
      .from('tracking_events')
      .insert({
        user_id: userId,
        event_type: 'purchase',
        url: 'webhook-integration',
        utm_source: body.utm_source || '',
        utm_medium: body.utm_medium || '',
        utm_campaign: body.utm_campaign || '',
        timestamp: new Date().toISOString(),
      });

    if (eventError) throw eventError;

    return NextResponse.json({ success: true, message: 'Conversão registrada' });
  } catch (error) {
    console.error('Erro no processamento do Webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

