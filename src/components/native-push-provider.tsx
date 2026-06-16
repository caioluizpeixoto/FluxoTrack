"use client";

import { useEffect } from "react";
import { useUser } from "@/firebase";

export function NativePushProvider() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.uid) return;

    // Apenas executa no browser e se suportar service worker/push
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      registerAndSubscribe(user.uid).catch(console.error);
    }
  }, [user]);

  return null;
}

async function registerAndSubscribe(userId: string) {
  try {
    // 1. Pede permissão nativa se ainda não foi pedida
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[NativePush] Permissão negada pelo usuário.");
      return;
    }

    // 2. Registra o Service Worker (o SW já gerencia PWA e agora Push)
    // Muitos PWA já usam o /sw.js, vamos garantir que ele está atualizado
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    // Aguarda o worker ficar pronto
    await navigator.serviceWorker.ready;

    // 3. Pega a VAPID public key
    const response = await fetch("/api/push/vapid-public-key");
    const { publicKey } = await response.json();
    if (!publicKey) return;

    // Converte a chave VAPID para Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 4. Assina o gerenciador de push do navegador
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // 5. Envia a assinatura para o nosso backend salvar no Supabase
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
      }),
    });

    console.log("[NativePush] Assinatura concluída e salva no banco.");
  } catch (err) {
    console.error("[NativePush] Erro ao assinar Web Push:", err);
  }
}

// Utilitário para converter a chave VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
