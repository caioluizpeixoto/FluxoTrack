import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { userId, adId } = await request.json();

    if (!userId || !adId) {
      return NextResponse.json({ error: 'Missing userId or adId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Recupera token ativo do usuário
    const { data: conn, error: connErr } = await supabase
      .from('meta_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Conta Meta não conectada' }, { status: 401 });
    }

    // Busca o preview do anúncio usando a Graph API
    // Para ver todos os formatos: ad_format=DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, etc.
    const url = `https://graph.facebook.com/v19.0/${adId}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${conn.access_token}`;
    
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    if (data.data && data.data.length > 0) {
      // Retorna o iframe HTML gerado pelo Meta
      return NextResponse.json({ success: true, body: data.data[0].body });
    }

    return NextResponse.json({ error: 'Nenhuma prévia encontrada' }, { status: 404 });

  } catch (err: any) {
    console.error('[Meta Ads Preview API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
