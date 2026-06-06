
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

/**
 * Receptor Genérico de Webhooks (Kiwify, Hotmart, etc.)
 * Este endpoint recebe as vendas das plataformas e salva no Firestore.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id: webhookId } = params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const body = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'UserID não fornecido na URL' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();

    // 1. Verificar se o webhook existe
    const webhookRef = doc(firestore, 'users', userId, 'webhooks', webhookId);
    const webhookSnap = await getDoc(webhookRef);

    if (!webhookSnap.exists()) {
      return NextResponse.json({ error: 'Configuração de webhook não encontrada' }, { status: 404 });
    }

    const webhookConfig = webhookSnap.data();

    // 2. Normalizar dados da plataforma (Exemplo simples para Kiwify/Hotmart)
    // Aqui você pode adicionar lógica específica para cada plataforma baseada em webhookConfig.platform
    const conversionData = {
      externalId: body.order_id || body.transaction || body.id || 'unknown',
      value: parseFloat(body.amount || body.price || body.full_price || 0) / (webhookConfig.platform === 'kiwify' ? 100 : 1), // Kiwify envia em centavos
      status: (body.order_status || body.status || 'approved').toLowerCase(),
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      platform: webhookConfig.platform,
      webhookName: webhookConfig.name,
      customerEmail: body.customer?.email || body.email || '',
      rawData: body // Salva o payload completo para depuração
    };

    // 3. Salvar a conversão
    const conversionsRef = collection(firestore, 'users', userId, 'conversions');
    await addDoc(conversionsRef, conversionData);

    // 4. Também salvar como um evento de tracking para o funil
    const eventsRef = collection(firestore, 'users', userId, 'events');
    await addDoc(eventsRef, {
      eventType: 'purchase',
      url: 'webhook-integration',
      utmSource: body.utm_source || '',
      utmMedium: body.utm_medium || '',
      utmCampaign: body.utm_campaign || '',
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: 'Conversão registrada' });
  } catch (error) {
    console.error('Erro no processamento do Webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
