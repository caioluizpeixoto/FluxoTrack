import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is missing' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Verifica se o produto existe
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, user_id, name')
      .eq('id', productId)
      .maybeSingle();
    if (!product) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 404 });
    }

    // Get Raw JSON
    const body = await req.json();

    // Agnostic parser (Tries common fields from Kiwify, Hotmart, PerfectPay, Wiapy, generic)
    const eventType = body.event || body.event_type || body.type || body.status || body.payment?.status || 'unknown';
    
    const cleanValue = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      // Remove R$, spaces, and format decimal separator
      const clean = val.toString().replace(/[^\d.,]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    // Parse Value
    let rawValue = 0;
    if (body.payment?.amount !== undefined) {
      rawValue = cleanValue(body.payment.amount);
      // Wiapy sends amount in cents, identified by the presence of checkout.id and payment.fee
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
    } else {
      rawValue = cleanValue(body.value || body.amount || body.price || body.comission || body.liquid || 0);
    }
    const eventValue = rawValue;

    // Parse Email
    const customerEmail = body.customer?.email || body.Customer?.email || body.buyer?.email || body.email || body.customer_email || '';

    // Parse Name
    const customerName = body.customer?.name || body.Customer?.name || body.buyer?.name || body.name || body.customer_name || '';

    // Parse Transaction ID
    const transactionId = body.payment?.id || body.Order?.order_id || body.purchase?.transaction || body.sale_id || body.transaction_id || body.transaction || body.id || '';

    const currency = body.currency || body.purchase?.price?.currency_code || 'BRL';

    // Normalize Status by evaluating ALL possible status fields at once
    let status = 'pending';
    const statusValues = [
      body.event, body.event_type, body.type, body.status, body.order_status, body.payment?.status
    ];
    const normalizedEvent = statusValues.filter(Boolean).join(' ').toLowerCase();
    
    if (normalizedEvent.includes('refund') || normalizedEvent.includes('chargeback') || normalizedEvent.includes('reembolso') || normalizedEvent.includes('devolvido')) {
       status = 'refunded';
    } else if (normalizedEvent.includes('refused') || normalizedEvent.includes('cancel') || normalizedEvent.includes('reject') || normalizedEvent.includes('recusado')) {
       status = 'refused';
    } else if (normalizedEvent.includes('approved') || normalizedEvent.includes('paid') || normalizedEvent.includes('completed') || normalizedEvent.includes('concluido') || normalizedEvent.includes('aprovado') || normalizedEvent.includes('sucesso')) {
       status = 'approved';
    } else if (normalizedEvent.includes('pending') || normalizedEvent.includes('waiting') || normalizedEvent.includes('aguardando') || normalizedEvent.includes('generated') || normalizedEvent.includes('gerado') || normalizedEvent.includes('unpaid') || normalizedEvent.includes('billet') || normalizedEvent.includes('boleto') || normalizedEvent.includes('pix')) {
       status = 'pending';
    } else if (normalizedEvent.includes('purchase') || normalizedEvent.includes('compra')) {
       status = 'approved'; 
    } else {
       status = 'pending';
    }

    // Normalize Event Type for DB (purchase, lead, checkout)
    let finalType = 'purchase';
    if (normalizedEvent.includes('abandoned') || normalizedEvent.includes('cart') || normalizedEvent.includes('checkout')) {
      finalType = 'checkout';
    } else if (normalizedEvent.includes('lead')) {
      finalType = 'lead';
    }

    // Insert into DB
    const { error } = await supabaseAdmin.from('product_events').insert({
      product_id: productId,
      event_type: finalType,
      event_value: Number(eventValue),
      currency: currency,
      status: status,
      customer_email: customerEmail,
      customer_name: customerName,
      transaction_id: transactionId,
      raw_payload: body
    });

    if (error) {
      console.error('Error inserting event:', error);
      return NextResponse.json({ error: 'Failed to insert event' }, { status: 500 });
    }

    // ----------------------------------------------------------------------
    // Integração Facebook API de Conversões (CAPI)
    // ----------------------------------------------------------------------
    if (finalType === 'purchase' && status === 'approved') {
      try {
        const { data: pixelInfo } = await supabaseAdmin.from('product_pixels').select('*').eq('product_id', productId).maybeSingle();
        
        if (pixelInfo && pixelInfo.access_token && pixelInfo.pixel_id) {
          // Extrair IP para tentar cruzar com o tracking do AdPulse Pixel
          const clientIp = body.tracking?.ip || body.customer?.ip || body.customerIp || '';
          
          let matchedTracking = null;
          if (clientIp) {
             const { data: match } = await supabaseAdmin
               .from('tracking_events')
               .select('*')
               .eq('user_id', product.user_id)
               .eq('ip_address', clientIp)
               .order('timestamp', { ascending: false })
               .limit(1)
               .maybeSingle();
             matchedTracking = match;
          }

          const fbp = matchedTracking?.fbp || body.tracking?.fbp || undefined;
          const fbc = matchedTracking?.fbc || body.tracking?.fbc || undefined;
          const userAgent = matchedTracking?.user_agent || body.tracking?.useragent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
          const eventUrl = matchedTracking?.url || '';

          const hash = (str: string) => {
            if (!str) return undefined;
            const clean = str.trim().toLowerCase();
            return crypto.createHash('sha256').update(clean).digest('hex');
          };

          const phone = body.customer?.mobile_phone || body.customer?.phone || body.Customer?.phone || '';

          const capiEvent = {
            data: [{
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: eventUrl,
              user_data: {
                em: customerEmail ? [hash(customerEmail)] : undefined,
                ph: phone ? [hash(phone.replace(/\D/g, ''))] : undefined,
                client_ip_address: clientIp || undefined,
                client_user_agent: userAgent,
                fbc: fbc,
                fbp: fbp
              },
              custom_data: {
                currency: currency,
                value: eventValue
              }
            }]
          };

          // Limpa undefineds para não dar erro no JSON do FB
          if(!capiEvent.data[0].user_data.em) delete capiEvent.data[0].user_data.em;
          if(!capiEvent.data[0].user_data.ph) delete capiEvent.data[0].user_data.ph;
          if(!capiEvent.data[0].user_data.client_ip_address) delete capiEvent.data[0].user_data.client_ip_address;
          if(!capiEvent.data[0].user_data.fbc) delete capiEvent.data[0].user_data.fbc;
          if(!capiEvent.data[0].user_data.fbp) delete capiEvent.data[0].user_data.fbp;

          // Disparo para o Facebook
          await fetch(`https://graph.facebook.com/v19.0/${pixelInfo.pixel_id}/events?access_token=${pixelInfo.access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(capiEvent)
          });
        }
      } catch(e) {
        console.error('Erro no disparo CAPI do Facebook:', e);
      }
    }

    // ----------------------------------------------------------------------
    // Disparo de Notificação Push OneSignal (Background)
    // ----------------------------------------------------------------------
    if (finalType === 'purchase') {
      try {
        const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const onesignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
        if (onesignalAppId && onesignalApiKey) {
          const title = status === 'approved' ? 'Venda Aprovada! 💰' : 'Venda Pendente! ⏳';
          const custName = customerName ? `\nCliente: ${customerName}` : '';
          const msg = `Nova venda no produto ${product.name} no valor de ${currency} ${eventValue.toFixed(2)}${custName}`;
          await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${onesignalApiKey}`
            },
            body: JSON.stringify({
              app_id: onesignalAppId,
              include_aliases: {
                external_id: [product.user_id]
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
    }

    return NextResponse.json({ success: true, message: 'Event logged successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
