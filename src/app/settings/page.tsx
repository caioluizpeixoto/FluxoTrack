"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useDoc, isFirebaseConfigured } from "@/firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Shield, Code, Save, Database, AlertTriangle, Key, Hammer, UserPlus } from "lucide-react";
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
        description: "Ative o login no console primeiro.",
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
        description: "Verifique se você está logado.",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1 text-white">Configurações de Conexão</h1>
          <p className="text-muted-foreground">Gerencie o banco de dados e o seu perfil.</p>
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
                    Status da Conexão
                  </CardTitle>
                  {!isConfig && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                </div>
                <CardDescription>O AdPulse é integrado ao Firebase para segurança máxima.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Chaves de API:</span>
                    <span className={isConfig ? "text-green-500 font-bold" : "text-yellow-500 font-bold"}>
                      {isConfig ? "CARREGADAS" : "PENDENTES"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Autenticação:</span>
                    <span className={user ? "text-green-500 font-bold" : "text-muted-foreground font-bold"}>
                      {user ? "CONECTADO" : "DESCONECTADO"}
                    </span>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Hammer className="w-4 h-4" /> 
                    Como ativar o login (E-mail/Senha):
                  </h4>
                  <div className="space-y-3 text-xs text-muted-foreground">
                    <p>Siga estes passos exatos no seu <b>Firebase Console</b>:</p>
                    <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                      <li>Procure o ícone de <b>Martelo (Build/Criação)</b> no menu lateral esquerdo.</li>
                      <li>Clique em <b>Authentication</b>.</li>
                      <li>Clique no botão <b>Começar (Get Started)</b> no centro da tela.</li>
                      <li>Na aba <b>Método de Login</b>, escolha <b>E-mail/Senha</b>.</li>
                      <li>Ative a primeira opção e clique em <b>Salvar</b>.</li>
                    </ol>
                  </div>
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
                  Salvar Alterações
                </Button>
                {!user && (
                  <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-center">
                    <p className="text-[11px] text-yellow-500 leading-tight">
                      Para salvar dados no banco, você precisa clicar em <b>"Entrar"</b> na barra lateral após ativar o provedor no console.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Segurança Granular
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  Diferente do Supabase, o AdPulse utiliza as <b>Firebase Security Rules</b> para garantir que seus dados de faturamento e anúncios nunca sejam acessados por outros usuários.
                </p>
                <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-primary/70">
                   allow read, write: if request.auth.uid == userId;
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-none bg-gradient-to-br from-accent/10 to-transparent">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase text-accent flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> 
                  Pronto para escalar?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Assim que o login estiver ativo, você poderá registrar seus Pixels, Webhooks de checkout e usar a IA para mapear conversões órfãs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
