import { NextResponse } from "next/server";

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

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      console.error("[Webhook] OneSignal não configurado.");
      return NextResponse.json({ error: "OneSignal não configurado" }, { status: 500 });
    }

    // Formata a mensagem de notificação
    const title = isApproved ? "💰 Venda Aprovada!" : "⏳ Venda Pendente!";
    const value = Number(record.event_value || 0).toFixed(2);
    const customer = record.customer_name || record.customer_email || "Cliente";
    const message = `R$ ${value} | ${customer}`;

    // Chama a API do OneSignal
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ["All"],
        headings: { pt: title, en: title },
        contents: { pt: message, en: message },
        url: "/events",
        chrome_web_icon: "https://placehold.co/192x192/1877F2/FFF?text=AP",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Webhook] Erro OneSignal:", data);
      return NextResponse.json({ error: data }, { status: 500 });
    }

    console.log(`[Webhook] Notificação enviada para venda ${record.id} (${status})`);
    return NextResponse.json({ success: true, onesignal: data });
  } catch (err) {
    console.error("[Webhook] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
