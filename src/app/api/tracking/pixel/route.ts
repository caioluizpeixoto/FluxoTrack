
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

    const { firestore } = initializeFirebase();
    
    // 1. Registrar o evento na coleção de rastreamento do usuário
    const eventsRef = collection(firestore, 'users', userId, 'events');
    await addDoc(eventsRef, {
      eventType,
      url: url || '',
      utmSource: utmSource || '',
      utmMedium: utmMedium || '',
      utmCampaign: utmCampaign || '',
      fbclid: fbclid || '',
      gclid: gclid || '',
      fbp: fbp || '',
      fbc: fbc || '',
      visitorId: visitorId || '',
      sessionId: sessionId || '',
      referrer: referrer || '',
      userAgent: userAgent || '',
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // 2. Se for um evento de checkout ou compra, podemos disparar lógica adicional aqui
    // Ex: Notificações, logs de sincronização, etc.

    return NextResponse.json({ success: true, eventId: Date.now().toString() });
  } catch (error) {
    console.error('AdPulse Pixel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
