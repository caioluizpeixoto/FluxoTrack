"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Escuta o evento da sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/auth/reset-password");
      } else if (session) {
        // Verificar o hash da URL para redirecionamento específico de recuperação
        if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
          router.replace("/auth/reset-password");
        } else {
          router.replace("/");
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
        router.replace("/auth/reset-password");
      } else if (session) {
        router.replace("/");
      } else {
        const timeout = setTimeout(() => {
          router.replace("/");
        }, 2000);
        return () => clearTimeout(timeout);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1115] text-slate-200">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Autenticando...</p>
      </div>
    </div>
  );
}
