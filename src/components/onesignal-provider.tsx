"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";

import { useUser } from "@/firebase";

let initialized = false;

export function OneSignalProvider() {
  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn("[OneSignal] NEXT_PUBLIC_ONESIGNAL_APP_ID não configurado.");
      return;
    }

    OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: "/OneSignalSDKWorker.js",
    })
      .then(() => {
        console.log("[OneSignal] Inicializado com sucesso.");
        // Pede permissão automaticamente de forma não intrusiva
        OneSignal.Slidedown.promptPush();
      })
      .catch((err) => {
        console.error("[OneSignal] Erro ao inicializar:", err);
      });
  }, []);

  const { user } = useUser();
  useEffect(() => {
    if (initialized && user?.uid) {
       OneSignal.login(user.uid).catch(console.error);
    } else if (initialized && !user) {
       OneSignal.logout().catch(console.error);
    }
  }, [user]);

  return null;
}
