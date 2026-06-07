
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useDoc, isFirebaseConfigured } from "@/firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Shield, Code, Save, Database, AlertTriangle, Key } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const isConfig = isFirebaseConfigured();
  
  const userRef = useMemo(() => {
    return user ? doc(db, "users", user.uid) : null;
  }, [db, user]);

  const { data: profile } = useDoc(userRef);

  const [storeUrl, setStoreUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) {
      setStoreUrl(profile.storeUrl || "");
      setDisplayName(profile.displayName || "");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!userRef || !isConfig) {
      toast({
        variant: "destructive",
        title: "Firebase não conectado",
        description: "Configure seu projeto no console do Firebase primeiro.",
      });
      return;
    }
    try {
      await updateDoc(userRef, {
        storeUrl,
        displayName,
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: "Perfil atualizado!",
        description: "Suas configurações foram salvas com sucesso.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "O banco de dados rejeitou a alteração. Verifique se você está logado.",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1 text-white">Configurações de Conexão</h1>
          <p className="text-muted-foreground">Gerencie a saúde do seu banco de dados e perfil.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className={cn(
              "glass-card border-l-4",
              isConfig ? "border-l-green-500" : "border-l-yellow-500"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Status do Firebase
                  </CardTitle>
                  {!isConfig && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                </div>
                <CardDescription>Verificação de infraestrutura em tempo real.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Chaves de API:</span>
                    <span className={isConfig ? "text-green-500 font-bold" : "text-yellow-500 font-bold"}>
                      {isConfig ? "CONECTADO" : "PENDENTE"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Autenticação:</span>
                    <span className={user ? "text-green-500 font-bold" : "text-muted-foreground font-bold"}>
                      {user ? "USUÁRIO LOGADO" : "DESCONECTADO"}
                    </span>
                  </div>
                </div>

                {!isConfig && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl space-y-2">
                    <p className="text-xs text-yellow-200 leading-relaxed">
                      <strong>Atenção:</strong> Suas variáveis de ambiente do Firebase não foram detectadas. 
                      Certifique-se de que você vinculou o projeto correto no Firebase Studio.
                    </p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                   <h4 className="text-xs font-bold uppercase text-muted-foreground">Guia de Ativação:</h4>
                   <ol className="text-[11px] text-muted-foreground list-decimal pl-4 space-y-1">
                     <li>Vá ao <strong>Firebase Console</strong> do seu projeto.</li>
                     <li>Clique em <strong>Authentication</strong> &gt; <strong>Sign-in method</strong>.</li>
                     <li>Se não houver nada, clique em <strong>Add new provider</strong>.</li>
                     <li>Escolha <strong>E-mail/Senha</strong> e ative.</li>
                   </ol>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Perfil do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome de Exibição</Label>
                  <Input 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu Nome"
                    className="bg-white/5 border-white/10"
                    disabled={!user}
                  />
                </div>
                <Button onClick={handleSaveProfile} className="w-full gap-2 glow-primary" disabled={!user}>
                  <Save className="w-4 h-4" />
                  Salvar Perfil no Firestore
                </Button>
                {!user && (
                  <p className="text-[10px] text-center text-muted-foreground">
                    Faça login na barra lateral para liberar a edição do perfil.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Segurança de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  O AdPulse usa <strong>Regras de Segurança Granulares</strong>. 
                  Qualquer tentativa de acesso a dados que não pertencem ao seu UID será rejeitada pelo servidor.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px]">
                   allow read, write: if request.auth.uid == userId;
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
