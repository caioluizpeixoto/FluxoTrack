
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Rota de API para sincronizar métricas da Meta Marketing API.
 * Busca gastos, cliques e impressões das contas monitoradas.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'UserId required' }, { status: 400 });

    const { firestore } = initializeFirebase();

    // 1. Buscar o token do usuário
    const userSnap = await getDoc(doc(firestore, 'users', userId));
    const token = userSnap.data()?.metaAccessToken;

    if (!token) return NextResponse.json({ error: 'Meta not connected' }, { status: 401 });

    // 2. Buscar as contas de anúncios marcadas como monitoradas
    const accountsRef = collection(firestore, 'users', userId, 'ad_accounts');
    const accountsQuery = query(accountsRef, where('monitored', '==', true));
    const accountsSnap = await getDocs(accountsQuery);

    if (accountsSnap.empty) return NextResponse.json({ success: true, message: 'No accounts to sync' });

    // 3. Para cada conta, simular a busca de métricas diárias (Insights API)
    // Em produção: fetch(`https://graph.facebook.com/v18.0/${accId}/insights?...`)
    const campaignsColl = collection(firestore, 'users', userId, 'campaigns');
    
    for (const accDoc of accountsSnap.docs) {
      const acc = accDoc.data();
      
      // Simulação de dados de campanhas reais
      const mockCampaigns = [
        { campaignId: `camp_${acc.accountId}_1`, name: `Estratégia Escala ${acc.name}`, spend: Math.random() * 500, impressions: 5000, clicks: 250, status: 'ACTIVE' },
        { campaignId: `camp_${acc.accountId}_2`, name: `Retargeting Dinâmico`, spend: Math.random() * 200, impressions: 2000, clicks: 80, status: 'ACTIVE' }
      ];

      for (const camp of mockCampaigns) {
        await setDoc(doc(campaignsColl, camp.campaignId), {
          ...camp,
          accountId: acc.accountId,
          lastSync: new Date().toISOString(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }

    return NextResponse.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Meta Sync Error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
