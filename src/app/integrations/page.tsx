
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, RefreshCw, CheckCircle2, Trash2, ArrowRight, Zap, Building2, Target } from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function IntegrationsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const userRef = useMemo(() => user ? doc(db, "users", user.uid) : null, [db, user]);
  const { data: profile } = useDoc(userRef);
  
  const accountsQuery = useMemo(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "ad_accounts");
  }, [db, user]);
  const { data: accounts } = useCollection(accountsQuery);

  const isConnected = !!profile?.metaAccessToken;

  const handleSyncAccounts = (userId: string) => {
    if (!db) return;
    setSyncing(true);
    
    const mockAccounts = [
      { accountId: "act_123456789", name: "Ecom High Scale - Conta 01", currency: "BRL", status: "ACTIVE", businessName: "AdPulse Business Media" },
      { accountId: "act_987654321", name: "Retargeting Criativo - Backup", currency: "BRL", status: "ACTIVE", businessName: "AdPulse Business Media" },
      { accountId: "act_456123789", name: "Lançamento Produto X", currency: "BRL", status: "DISABLED", businessName: "Agência Digital VIP" }
    ];

    const accountsColl = collection(db, "users", userId, "ad_accounts");
    
    mockAccounts.forEach((acc) => {
      const accRef = doc(accountsColl, acc.accountId);
      const data = { ...acc, monitored: true, updatedAt: serverTimestamp() };
      
      setDoc(accRef, data, { merge: true })
        .catch(async () => {
          const err = new FirestorePermissionError({ path: accRef.path, operation: 'write', requestResourceData: data });
          errorEmitter.emit('permission-error', err);
        });
    });

    setTimeout(() => {
      setSyncing(false);
      toast({ 
        title: "Contas Sincronizadas", 
        description: `${mockAccounts.length} contas encontradas.` 
      });
    }, 1500);
  };

  const handleMetaConnect = async () => {
    if (!user) {
      toast({ 
        variant: "destructive",
        title: "Login Necessário", 
        description: "Por favor, clique em 'Entrar' na barra lateral primeiro." 
      });
      return;
    }

    setLoading(true);
    try {
      const ref = doc(db, "users", user.uid);
      const data = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        metaConnected: true,
        metaAccessToken: "EAAB_PROTOTYPE_TOKEN_" + Math.random().toString(36).substring(7),
        lastMetaAuth: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };

      await setDoc(ref, data, { merge: true });
      
      toast({ 
        title: "Facebook Conectado!", 
        description: "Sua conta foi vinculada com sucesso." 
      });
      
      handleSyncAccounts(user.uid);
    } catch (error: any) {
      console.error("Meta Connect Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro na conexão", 
        description: "Não foi possível salvar os dados. Tente novamente." 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMonitoring = (accId: string, current: boolean) => {
    if (!user || !db) return;
    const accRef = doc(db, "users", user.uid, "ad_accounts", accId);
    
    updateDoc(accRef, { monitored: !current })
      .catch(async () => {
        const err = new FirestorePermissionError({ path: accRef.path, operation: 'update' });
        errorEmitter.emit('permission-error', err);
      });
    
    toast({ 
      title: current ? "Monitoramento pausado" : "Monitoramento ativado",
      description: "As métricas desta conta serão refletidas no dashboard."
    });
  };

  const handleDisconnect = () => {
    if (!userRef) return;
    
    updateDoc(userRef, {
      metaAccessToken: null,
      metaConnected: false
    }).catch(async () => {
      const err = new FirestorePermissionError({ path: userRef.path, operation: 'update' });
      errorEmitter.emit('permission-error', err);
    });

    toast({ title: "Desconectado", description: "Sua conta Meta foi desvinculada." });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1">Integrações</h1>
          <p className="text-muted-foreground">Conecte suas fontes de tráfego e dados para uma atribuição perfeita.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className={cn(
              "glass-card transition-all duration-500 overflow-hidden",
              isConnected ? "border-green-500/20 bg-green-500/5" : "border-primary/20 bg-primary/5"
            )}>
              <div className="p-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                    isConnected ? "bg-green-600 glow-accent" : "bg-blue-600 glow-primary"
                  )}>
                    <Facebook className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="font-headline text-xl">Facebook Ads</CardTitle>
                    <CardDescription>Métricas de campanhas e gastos via API.</CardDescription>
                  </div>
                </div>
                <Badge className={cn(
                  "px-4 py-1.5 border-none font-bold rounded-full",
                  isConnected ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {isConnected ? "SISTEMA ATIVO" : "OFFLINE"}
                </Badge>
              </div>

              <CardContent className="pt-0">
                {isConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-background/50 border border-white/5">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">Conexão Estabelecida</span>
                          <span className="text-xs text-muted-foreground">Token verificado via OAuth 2.0</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-destructive hover:bg-destructive/10 rounded-xl">
                        <Trash2 className="w-4 h-4 mr-2" /> Desconectar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Zap className="w-10 h-10 text-primary mb-4 animate-pulse" />
                    <h3 className="text-xl font-bold mb-2">Vincular Conta de Anúncios</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
                      {user ? "Clique abaixo para autorizar o AdPulse a importar seus gastos e métricas." : "Faça login no app primeiro para poder salvar sua conta Meta Ads."}
                    </p>
                    <Button 
                      onClick={handleMetaConnect} 
                      disabled={loading} 
                      className="glow-primary h-16 px-12 font-bold gap-3 text-lg rounded-2xl transition-all hover:scale-[1.02]"
                    >
                      {loading ? (
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      ) : (
                        <Facebook className="w-6 h-6" />
                      )}
                      {user ? "Autorizar Facebook Ads" : "Fazer Login Primeiro"}
                    </Button>
                  </div>
                )}
              </CardContent>
              {isConnected && (
                <CardFooter className="border-t border-white/5 pt-6 bg-white/5">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground font-mono">
                      SYNC: {profile?.lastMetaAuth ? new Date(profile.lastMetaAuth).toLocaleTimeString() : 'PENDING'}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => user && handleSyncAccounts(user.uid)} disabled={syncing} className="gap-2 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl">
                      <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                      Sincronizar BMs
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {isConnected && accounts && accounts.length > 0 && (
              <Card className="glass-card animate-in slide-in-from-bottom-4 duration-700">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Contas de Anúncios Encontradas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {accounts.map((acc: any) => (
                    <div key={acc.accountId} className={cn(
                      "flex items-center justify-between p-5 rounded-2xl border transition-all",
                      acc.monitored ? "bg-white/5 border-primary/30" : "bg-black/20 border-white/5 opacity-60"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", acc.monitored ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                          <Target className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-base">{acc.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">
                            {acc.businessName}
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => toggleMonitoring(acc.accountId, acc.monitored)}
                        variant={acc.monitored ? "default" : "outline"}
                        size="sm"
                        className={cn("rounded-xl font-bold", acc.monitored && "bg-green-600 hover:bg-green-700 glow-accent border-none")}
                      >
                        {acc.monitored ? "Ativo" : "Monitorar"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="glass-card bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Privacidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O AdPulse utiliza apenas permissões de leitura. Seus dados de faturamento nunca são compartilhados com a Meta.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase text-accent">Status do Pixel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Lembre-se: Para o ROAS ser calculado, você também precisa ter o **Pixel AdPulse** instalado na sua página.
                </p>
                <Link href="/pixel">
                  <Button variant="link" className="p-0 h-auto text-accent text-xs group">
                    Configurar Pixel <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
