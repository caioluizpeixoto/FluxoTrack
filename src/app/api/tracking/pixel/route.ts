
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import crypto from 'crypto';

/**
 * Endpoint receptor para o Pixel AdPulse.
 * Processa eventos de PageView, Clicks e UTMs vindos do script JS.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userId, 
      productId,
      eventType, 
      url, 
      utmSource, 
      utmMedium, 
      utmCampaign, 
      fbclid, 
      gclid, 
      fbp, 
      fbc, 
      visitorId, 
      sessionId,
      referrer,
      userAgent
    } = body;

    if (!userId || !eventType) {
      return NextResponse.json({ error: 'Missing mandatory fields' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Registrar o evento na tabela do Supabase
    const { error } = await supabaseAdmin
      .from('tracking_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        url: url || '',
        utm_source: utmSource || '',
        utm_medium: utmMedium || '',
        utm_campaign: utmCampaign || '',
        fbclid: fbclid || '',
        gclid: gclid || '',
        fbp: fbp || '',
        fbc: fbc || '',
        visitor_id: visitorId || '',
        session_id: sessionId || '',
        referrer: referrer || '',
        user_agent: userAgent || '',
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      });

    if (error) throw error;

    // ----------------------------------------------------------------------
    // Disparo CAPI opcional para eventos de Front-End (InitiateCheckout / PageView)
    // ----------------------------------------------------------------------
    if (productId && (eventType === 'InitiateCheckout' || eventType === 'PageView')) {
      try {
        const { data: pixelInfo } = await supabaseAdmin.from('product_pixels').select('*').eq('product_id', productId).maybeSingle();
        
        if (pixelInfo && pixelInfo.access_token && pixelInfo.pixel_id) {
          const clientIp = request.headers.get('x-forwarded-for') || '';
          
          const capiEvent = {
            data: [{
              event_name: eventType,
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: url || '',
              user_data: {
                client_ip_address: clientIp || undefined,
                client_user_agent: userAgent || '',
                fbc: fbc || undefined,
                fbp: fbp || undefined
              }
            }]
          };

          // Limpa undefineds para não quebrar a API
          if(!capiEvent.data[0].user_data.client_ip_address) delete capiEvent.data[0].user_data.client_ip_address;
          if(!capiEvent.data[0].user_data.fbc) delete capiEvent.data[0].user_data.fbc;
          if(!capiEvent.data[0].user_data.fbp) delete capiEvent.data[0].user_data.fbp;

          // Envio Assíncrono para o Facebook (não trava o response do cliente)
          fetch(`https://graph.facebook.com/v19.0/${pixelInfo.pixel_id}/events?access_token=${pixelInfo.access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(capiEvent)
          }).catch(err => console.error("Erro CAPI FrontEnd:", err));
        }
      } catch(e) {
        console.error("Falha ao buscar pixel CAPI:", e);
      }
    }

    return NextResponse.json({ success: true, eventId: Date.now().toString() });
  } catch (error) {
    console.error('AdPulse Pixel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

