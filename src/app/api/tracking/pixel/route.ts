
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * Endpoint receptor para o Pixel AdPulse.
 * Processa eventos de PageView, Clicks e UTMs vindos do script JS.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      userId, 
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

    return NextResponse.json({ success: true, eventId: Date.now().toString() });
  } catch (error) {
    console.error('AdPulse Pixel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

