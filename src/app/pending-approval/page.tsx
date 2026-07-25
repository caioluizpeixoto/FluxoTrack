"use client";

import { useUser } from "@/firebase";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Clock, ShieldAlert, LogOut, RefreshCw, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function PendingApprovalPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        router.replace("/login");
        return;
      }
      
      const email = sessionData.session.user.email;
      const { data } = await supabase
        .from("authorized_users")
        .select("status")
        .ilike("email", email || "")
        .maybeSingle();

      if (data?.status === "approved" || email === "caioluispeixotos@gmail.com") {
        toast({ title: "Cadastro aprovado!", description: "Redirecionando para a aplicação..." });
        router.replace("/");
      } else {
        toast({
          title: "Ainda em análise",
          description: "Seu cadastro continua aguardando aprovação do administrador.",
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f1115] px-4 text-slate-100">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 ring-1 ring-amber-500/30">
          <Clock className="h-10 w-10 text-amber-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Cadastro em Análise</h1>
          <p className="text-sm text-slate-400">
            Seu cadastro foi realizado com sucesso, mas o acesso à plataforma precisa ser aprovado pelo administrador.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl text-left space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
            <span>
              Solicitação enviada para o administrador: <strong className="text-amber-200">caioluispeixotos@gmail.com</strong>
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-slate-200">E-mail cadastrado:</p>
            <p className="font-mono bg-black/30 p-2 rounded-lg border border-white/5 text-primary break-all">
              {user?.email || "Seu e-mail"}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full h-11 bg-primary hover:bg-primary/90 font-semibold gap-2 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              Verificar se fui aprovado
            </Button>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full h-11 border-white/10 hover:bg-white/10 font-semibold gap-2 rounded-xl text-slate-300"
            >
              <LogOut className="h-4 w-4" />
              Sair / Entrar com outra conta
            </Button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          FluxoFy &copy; {new Date().getFullYear()} &bull; Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
