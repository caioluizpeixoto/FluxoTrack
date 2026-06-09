
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

    const cleanValue = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const clean = val.toString().replace(/[^\d.,]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    let rawValue = 0;
    if (body.payment?.amount !== undefined) {
      rawValue = cleanValue(body.payment.amount);
      if (body.payment.fee !== undefined && body.checkout?.id) {
         rawValue = rawValue / 100;
      }
    } else if (body.Order?.price_cents !== undefined) {
      rawValue = cleanValue(body.Order.price_cents) / 100;
    } else if (body.Order?.order_approved_amount !== undefined) {
      rawValue = cleanValue(body.Order.order_approved_amount) / 100;
    } else if (body.purchase?.price?.value !== undefined) {
      rawValue = cleanValue(body.purchase.price.value);
    } else if (body.sale_value !== undefined) {
      rawValue = cleanValue(body.sale_value);
    } else if (body.value_cents !== undefined) {
      rawValue = cleanValue(body.value_cents) / 100;
    } else if (body.price_cents !== undefined) {
      rawValue = cleanValue(body.price_cents) / 100;
    } else if (body.Commissions?.charge_amount !== undefined) {
      rawValue = cleanValue(body.Commissions.charge_amount) / 100;
    } else if (body.Commissions?.my_commission !== undefined) {
      rawValue = cleanValue(body.Commissions.my_commission) / 100;
    } else {
      let fallback = cleanValue(body.value || body.amount || body.price || body.full_price || body.comission || body.liquid || 0);
      if (platform === 'kiwify' && fallback > 0 && fallback > 100 && fallback.toString().indexOf('.') === -1) {
        fallback = fallback / 100;
      }
      rawValue = fallback;
    }
    const value = rawValue;
    const externalId = body.order_id || body.transaction || body.id || 'unknown';

    const statusValues = [
      body.event, body.event_type, body.type, body.status, body.order_status, body.payment?.status
    ].filter(Boolean);
    const rawEvent = (statusValues.length > 0 ? statusValues.join(' ') : 'approved').toLowerCase();
    let status = 'pending';
    
    if (rawEvent.includes('refund') || rawEvent.includes('chargeback') || rawEvent.includes('reembolso') || rawEvent.includes('devolvido')) {
       status = 'refunded';
    } else if (rawEvent.includes('refused') || rawEvent.includes('cancel') || rawEvent.includes('reject') || rawEvent.includes('recusado')) {
       status = 'refused';
    } else if (rawEvent.includes('pending') || rawEvent.includes('pendente') || rawEvent.includes('waiting') || rawEvent.includes('aguardando') || rawEvent.includes('generated') || rawEvent.includes('gerado') || rawEvent.includes('unpaid') || rawEvent.includes('billet') || rawEvent.includes('boleto') || rawEvent.includes('pix') || rawEvent.includes('processing') || rawEvent.includes('processando') || rawEvent.includes('analise') || rawEvent.includes('review')) {
       status = 'pending';
    } else if (rawEvent.includes('approved') || rawEvent.includes('paid') || rawEvent.includes('completed') || rawEvent.includes('concluido') || rawEvent.includes('aprovado') || rawEvent.includes('sucesso')) {
       status = 'approved';
    } else if (rawEvent.includes('purchase') || rawEvent.includes('compra')) {
       status = 'approved'; 
    } else {
       status = 'pending';
    }

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

    // ----------------------------------------------------------------------
    // Disparo de Notificação Push OneSignal (Background)
    // ----------------------------------------------------------------------
    try {
      const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
      const onesignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
      if (onesignalAppId && onesignalApiKey) {
        const title = status === 'approved' ? 'Venda Aprovada! 💰' : 'Venda Pendente! ⏳';
        const msg = `Nova venda registrada na plataforma!\nValor: R$ ${value.toFixed(2)}`;
        await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${onesignalApiKey}`
          },
          body: JSON.stringify({
            app_id: onesignalAppId,
            include_aliases: {
              external_id: [userId]
            },
            target_channel: 'push',
            headings: { en: title, pt: title },
            contents: { en: msg, pt: msg }
          })
        });
      }
    } catch (e) {
      console.error('Erro no envio do OneSignal:', e);
    }

    return NextResponse.json({ success: true, message: 'Conversão registrada' });
  } catch (error) {
    console.error('Erro no processamento do Webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

