
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

    const { firestore } = initializeFirebase();
    
    // Adicionar o evento na coleção do usuário
    const eventRef = collection(firestore, 'users', userId, 'events');
    await addDoc(eventRef, {
      eventType,
      url: url || '',
      utmSource: utmSource || '',
      utmMedium: utmMedium || '',
      utmCampaign: utmCampaign || '',
      fbc: fbc || '',
      fbp: fbp || '',
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || ''
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API de Tracking:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
