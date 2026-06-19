import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import webpush from "web-push";

/**
 * Endpoint chamado pelo Supabase Database Webhook
 * quando um novo registro é inserido em product_events.
 *
 * Funciona mesmo com o app completamente fechado no celular,
 * pois é o servidor do Supabase que dispara a chamada.
 */
export async function POST(request: Request) {
  try {
    // Verifica o segredo do webhook para segurança
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const body = await request.json();

    // Supabase envia { type, table, record, old_record, schema }
    const record = body.record;
    if (!record) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const status = record.status;
    const isPending = status === "pending";
    const isApproved = status === "approved";

    // Só notifica para vendas pendentes ou aprovadas
    if (!isPending && !isApproved) {
      return NextResponse.json({ skipped: true, reason: "Status não notificável" });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: prod } = await supabaseAdmin.from('products').select('name, user_id').eq('id', record.product_id).single();
    const productName = prod?.name || "Produto";
    const productOwnerId = prod?.user_id;

    if (!productOwnerId) {
       console.error("[Webhook] Produto sem dono, não é possível notificar.");
       return NextResponse.json({ error: "Produto sem dono" }, { status: 400 });
    }

    // Formata a mensagem de notificação com o nome do produto
    const title = isApproved ? `Venda Aprovada! - ${productName}` : `Venda Efetuada! - ${productName}`;
    const valueStr = Number(record.event_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const message = `Valor: R$${valueStr}`;

    // Busca a assinatura de push do usuário
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', productOwnerId);

    if (!subs || subs.length === 0) {
      console.log(`[Webhook] Nenhuma assinatura de push encontrada para o usuário ${productOwnerId}`);
      return NextResponse.json({ success: true, message: "Webhook recebido, mas usuário não tem push configurado." });
    }

    const payload = JSON.stringify({
      title: title,
      body: message,
      icon: "https://i.ibb.co/BVb9Ltpc/Chat-GPT-Image-15-de-jun-de-2026-23-15-33.png",
      url: "/dashboards"
    });

    // Configura o web-push com as chaves VAPID
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:suporte@fluxofy.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    } else {
      console.error("[Webhook] Chaves VAPID não configuradas. O push não será enviado.");
    }

    // Envia o push para todos os aparelhos registrados deste usuário
    const pushPromises = subs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // A assinatura expirou ou o usuário revogou, deletar do banco
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error("[Webhook] Erro ao enviar push para", sub.endpoint, err);
        }
      }
    });

    await Promise.all(pushPromises);

    console.log(`[Webhook] Notificação nativa enviada para venda ${record.id} (${status})`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Webhook] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
