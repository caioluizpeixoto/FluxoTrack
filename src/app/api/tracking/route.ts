
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

/**
 * Endpoint de API para receber eventos de tracking.
 * Este endpoint simula o que um script JS externo chamaria no site do cliente.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, eventType, url, utmSource, utmMedium, utmCampaign, fbc, fbp } = body;

    if (!userId || !eventType) {
      return NextResponse.json({ error: 'Faltam dados obrigatórios' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Adicionar o evento na tabela do Supabase
    const { error } = await supabaseAdmin
      .from('tracking_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        url: url || '',
        utm_source: utmSource || '',
        utm_medium: utmMedium || '',
        utm_campaign: utmCampaign || '',
        fbc: fbc || '',
        fbp: fbp || '',
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || ''
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API de Tracking:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

