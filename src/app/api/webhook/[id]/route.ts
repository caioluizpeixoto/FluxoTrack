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
      .select('id, user_id, name, currency')
      .eq('id', productId)
      .maybeSingle();
    if (!product) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 404 });
    }

    // Get Raw JSON
    let rawBody = await req.json();
    const body = rawBody.data ? { ...rawBody, ...rawBody.data } : rawBody;

    // Standardize Hotmart UTM Tracking
    if (body.purchase?.tracking) {
      body.tracking = body.tracking || {};
      body.tracking.utm_source = body.purchase.tracking.source || body.purchase.tracking.utm_source || body.tracking.utm_source || '';
      body.tracking.utm_campaign = body.purchase.tracking.campaign || body.purchase.tracking.utm_campaign || body.tracking.utm_campaign || '';
      body.tracking.utm_medium = body.purchase.tracking.medium || body.purchase.tracking.utm_medium || body.tracking.utm_medium || '';
      body.tracking.utm_content = body.purchase.tracking.content || body.purchase.tracking.utm_content || body.tracking.utm_content || '';
    }
    
    body.tracking = body.tracking || {};
    body.tracking.utm_source = body.tracking.utm_source || body.utm_source || body.src || body.sck || body.purchase?.sck || body.purchase?.src || '';
    body.tracking.utm_campaign = body.tracking.utm_campaign || body.utm_campaign || '';
    body.tracking.utm_medium = body.tracking.utm_medium || body.utm_medium || '';
    body.tracking.utm_content = body.tracking.utm_content || body.utm_content || '';

    // Agnostic parser (Tries common fields from Kiwify, Hotmart, PerfectPay, Wiapy, generic)
    const eventType = body.event || body.event_type || body.type || body.status || body.payment?.status || 'unknown';
    
    const cleanValue = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      // Remove R$, spaces, and format decimal separator
      const clean = val.toString().replace(/[^\d.,]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };

    let rawCurrency = body.currency || body.currency_code || body.currency_iso || 
      body.Commissions?.currency || 
      body.purchase?.price?.currency_value || body.purchase?.price?.currency_code || body.purchase?.price?.currency || 
      body.payment?.currency || body.transaction?.currency || body.Order?.currency || 
      body.sale_currency || body.payment_currency ||
      (body.commissions && Array.isArray(body.commissions) && body.commissions.length > 0 ? (body.commissions.find((c: any) => c.source === 'PRODUCER')?.currency_value || body.commissions[0].currency_value) : null) ||
      'BRL';

    let currency = String(rawCurrency).trim().toUpperCase();

    // Parse Value
    let rawValue = 0;
    if (body.commissions && Array.isArray(body.commissions)) {
      const prodComm = body.commissions.find((c: any) => c.source === 'PRODUCER') || body.commissions[0];
      if (prodComm) {
        rawValue = cleanValue(prodComm.value);
        if (prodComm.currency_value) currency = String(prodComm.currency_value).trim().toUpperCase();
      }
    } else if (body.payment?.amount !== undefined) {
      rawValue = cleanValue(body.payment.amount);
      if (body.payment.fee !== undefined && body.checkout?.id) {
         rawValue = (rawValue - cleanValue(body.payment.fee)) / 100;
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
    } else if (body.Commissions?.my_commission !== undefined) {
      rawValue = cleanValue(body.Commissions.my_commission) / 100;
    } else if (body.Commissions?.charge_amount !== undefined) {
      rawValue = cleanValue(body.Commissions.charge_amount) / 100;
    } else {
      rawValue = cleanValue(body.value || body.amount || body.price || body.full_price || body.comission || body.liquid || 0);
    }
    let eventValue = rawValue;

    // Parse Email
    const customerEmail = body.customer?.email || body.Customer?.email || body.buyer?.email || body.email || body.customer_email || '';

    // Parse Name
    const customerName = body.customer?.name || body.Customer?.name || body.buyer?.name || body.name || body.customer_name || '';

    // Parse Transaction ID
    const transactionId = body.payment?.id || body.Order?.order_id || body.purchase?.transaction || body.sale_id || body.transaction_id || body.transaction || body.id || '';

    // Removed currency assignment from here since it is now before value extraction.

    const targetCurrency = product.currency || 'BRL';
    
    if (currency.toUpperCase() !== targetCurrency.toUpperCase()) {
      try {
        const xrRes = await fetch(`https://economia.awesomeapi.com.br/json/last/${currency.toUpperCase()}-${targetCurrency.toUpperCase()}`);
        if (xrRes.ok) {
          const xrData = await xrRes.json();
          const pair = `${currency.toUpperCase()}${targetCurrency.toUpperCase()}`;
          if (xrData[pair] && xrData[pair].ask) {
            const rate = parseFloat(xrData[pair].ask);
            eventValue = eventValue * rate;
            currency = targetCurrency;
          }
        }
      } catch (e) {
        console.error("Erro na conversao de moeda do webhook", e);
      }
    }

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
    } else if (normalizedEvent.includes('pending') || normalizedEvent.includes('pendente') || normalizedEvent.includes('waiting') || normalizedEvent.includes('aguardando') || normalizedEvent.includes('generated') || normalizedEvent.includes('gerado') || normalizedEvent.includes('unpaid') || normalizedEvent.includes('processing') || normalizedEvent.includes('processando') || normalizedEvent.includes('analise') || normalizedEvent.includes('review')) {
       status = 'pending';
    } else if (normalizedEvent.includes('approved') || normalizedEvent.includes('paid') || normalizedEvent.includes('completed') || normalizedEvent.includes('concluido') || normalizedEvent.includes('aprovado') || normalizedEvent.includes('sucesso')) {
       status = 'approved';
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

    // Ignore empty sales completely
    if (eventValue === 0) {
      return NextResponse.json({ success: true, message: 'Ignored zero value sale' }, { status: 200 });
    }

    let existingEvent = null;
    let isNewApproval = false;

    if (transactionId) {
      const { data } = await supabaseAdmin.from('product_events')
        .select('id, status')
        .eq('product_id', productId)
        .eq('transaction_id', transactionId)
        .maybeSingle();
      existingEvent = data;
    }

    if (existingEvent) {
      // Update existing record
      const { error } = await supabaseAdmin.from('product_events').update({
        event_type: finalType,
        event_value: Number(eventValue),
        currency: currency,
        status: status,
        customer_email: customerEmail,
        customer_name: customerName,
        raw_payload: body
      }).eq('id', existingEvent.id);

      if (error) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
      }
      
      // If it was not approved before, but is now
      if (existingEvent.status !== 'approved' && status === 'approved') {
         isNewApproval = true;
      }
    } else {
      // Insert new record
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
      
      if (status === 'approved') isNewApproval = true;
    }

    // Trigger integrations only if it's a new insert, or if a pending turned into approved.
    const shouldTriggerCAPI = finalType === 'purchase' && isNewApproval;
    const shouldTriggerPush = finalType === 'purchase' && (!existingEvent || isNewApproval);

    // ----------------------------------------------------------------------
    // Integração Facebook API de Conversões (CAPI)
    // ----------------------------------------------------------------------
    if (shouldTriggerCAPI) {
      try {
        const { data: pixelInfo } = await supabaseAdmin.from('product_pixels').select('*').eq('product_id', productId).maybeSingle();
        
        if (pixelInfo && pixelInfo.access_token && pixelInfo.pixel_id) {
          // Extrair IP para tentar cruzar com o tracking do FluxoFy Pixel
          const clientIp = body.tracking?.ip || body.client_ip || body.ip || body.customer?.ip || body.customerIp || '';
          
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
              event_id: transactionId,
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
          const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pixelInfo.pixel_id}/events?access_token=${pixelInfo.access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(capiEvent)
          });
          
          if (!fbRes.ok) {
            const fbResText = await fbRes.text();
            console.error('Erro no disparo CAPI do Facebook:', fbResText, 'Payload:', JSON.stringify(capiEvent));
          }
        }
      } catch(e) {
        console.error('Erro no disparo CAPI do Facebook:', e);
      }
    }

    // ----------------------------------------------------------------------
    // Disparo de Notificação Push OneSignal (Background)
    // ----------------------------------------------------------------------
    if (shouldTriggerPush) {
      try {
        const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const onesignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
        if (onesignalAppId && onesignalApiKey) {
          const title = status === 'approved' 
            ? `Venda Aprovada: ${currency} ${eventValue.toFixed(2)} 💰` 
            : `Venda Pendente: ${currency} ${eventValue.toFixed(2)} ⏳`;
          const custName = customerName ? `\nCliente: ${customerName}` : '';
          const msg = `Produto: ${product.name}${custName}`;
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
