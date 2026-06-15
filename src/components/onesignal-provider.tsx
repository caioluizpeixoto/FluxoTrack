"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";

import { useUser } from "@/firebase";

let initialized = false;
let sdkReady = false;

export function OneSignalProvider() {
  const { user } = useUser();

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn("[OneSignal] NEXT_PUBLIC_ONESIGNAL_APP_ID não configurado.");
      return;
    }

    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      console.warn("[OneSignal] Inicialização ignorada no localhost para evitar erros de domínio. (Can only be used on: https://fluxo-track.vercel.app)");
      return;
    }

    OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: "/OneSignalSDKWorker.js",
    })
      .then(() => {
        console.log("[OneSignal] Inicializado com sucesso.");
        sdkReady = true;
        // Pede permissão automaticamente de forma não intrusiva
        OneSignal.Slidedown.promptPush();
        
        // Se o usuário já estiver logado quando inicializar, loga no OneSignal
        if (user?.uid) {
          OneSignal.login(user.uid).catch(console.error);
        }
      })
      .catch((err) => {
        console.error("[OneSignal] Erro ao inicializar:", err);
      });
  }, [user]); // Adicionado user nas dependências caso ele logue antes da inicialização concluir

  useEffect(() => {
    if (!sdkReady) return;
    if (user?.uid) {
       OneSignal.login(user.uid).catch(console.error);
    } else {
       OneSignal.logout().catch(console.error);
    }
  }, [user]);

  return null;
}
