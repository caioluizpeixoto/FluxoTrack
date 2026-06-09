import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, url } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "title e message são obrigatórios" }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      return NextResponse.json({ error: "OneSignal não configurado" }, { status: 500 });
    }

    const payload = {
      app_id: appId,
      included_segments: ["All"], // Envia para todos os assinantes
      headings: { pt: title, en: title },
      contents: { pt: message, en: message },
      url: url || "/",
      chrome_web_badge: "https://placehold.co/72x72/1877F2/FFF?text=AP",
      chrome_web_icon: "https://placehold.co/192x192/1877F2/FFF?text=AP",
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[OneSignal] Erro ao enviar notificação:", data);
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[OneSignal] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
