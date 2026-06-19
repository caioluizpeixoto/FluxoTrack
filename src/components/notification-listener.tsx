"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/firebase";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";

export function NotificationListener() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    // Conecta ao canal realtime do Supabase para ouvir inserções em product_events
    const channel = supabase
      .channel(`realtime:product_events:user:${user.uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "product_events",
        },
        async (payload: any) => {
          const newEvent = payload.new;
          if (!newEvent) return;

          // Recupera configurações do localStorage
          const notificationsEnabled = localStorage.getItem("notifications_enabled") !== "false";
          const notifyApproved = localStorage.getItem("notify_approved") !== "false";
          const notifyPending = localStorage.getItem("notify_pending") !== "false";
          const soundEnabled = localStorage.getItem("sound_enabled") !== "false";
          const soundType = localStorage.getItem("sound_type") || "default";

          const isApproved = newEvent.status === "approved";
          const isPending = newEvent.status === "pending";

          // Filtra se deve notificar com base no status do evento
          if ((isApproved && notifyApproved) || (isPending && notifyPending)) {
            // 1. Toca o Som
            if (soundEnabled) {
              try {
                let audioUrl = "/sounds/notification.mp3";
                if (soundType === "custom") {
                  const customBase64 = localStorage.getItem("custom_sound_base64");
                  if (customBase64) {
                    audioUrl = customBase64;
                  }
                }
                const audio = new Audio(audioUrl);
                audio.volume = 1.0;
                await audio.play();
              } catch (soundErr) {
                console.warn("[Notifications] Falha ao tocar áudio (requer interação do usuário):", soundErr);
              }
            }

            // 2. Envia notificação push via OneSignal (funciona em mobile/PWA mesmo com app fechado)
            if (notificationsEnabled) {
              const formattedPrice = formatCurrency(newEvent.event_value, newEvent.currency);
              const title = isApproved ? `💰 Venda Aprovada: ${formattedPrice}` : `⏳ Venda Pendente: ${formattedPrice}`;
              const message = `Cliente: ${newEvent.customer_name || newEvent.customer_email || "Não informado"}`;

              fetch("/api/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, message, url: "/events" }),
              }).catch((err) =>
                console.warn("[OneSignal] Falha ao enviar notificação:", err)
              );
            }


            // 3. Exibe Toast em tela dentro do App
            const toastPrice = formatCurrency(newEvent.event_value, newEvent.currency);
            toast({
              title: isApproved ? `💰 Venda Aprovada: ${toastPrice}` : `⏳ Venda Pendente: ${toastPrice}`,
              description: `Cliente: ${newEvent.customer_name || newEvent.customer_email || "Não informado"}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
