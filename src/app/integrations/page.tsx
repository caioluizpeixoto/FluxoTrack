
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, RefreshCw, CheckCircle2, Trash2, ArrowRight, Zap, Building2, Target, LogIn } from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc, useAuth } from "@/firebase";
import { collection, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import LinkNext from "next/link";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function IntegrationsPage() {
  const { user } = useUser();
  const auth = useAuth();
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
      { accountId: "act_123456", name: "Conta Principal - Ecom", currency: "BRL", status: "ACTIVE", businessName: "Vendas Online BM" },
      { accountId: "act_789012", name: "Backup - Tráfego Direto", currency: "BRL", status: "ACTIVE", businessName: "Vendas Online BM" }
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
      toast({ title: "Sincronização concluída", description: `${mockAccounts.length} contas encontradas.` });
    }, 1000);
  };

  const handleMetaConnect = async () => {
    setLoading(true);
    let currentUser = user;

    try {
      // 1. Se não estiver logado no app, solicita login primeiro
      if (!currentUser) {
        toast({ title: "Autenticação necessária", description: "Por favor, faça login com o Google para continuar." });
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
      }

      // 2. Com o usuário logado, salva as credenciais da Meta
      if (currentUser) {
        const ref = doc(db, "users", currentUser.uid);
        const data = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          metaConnected: true,
          metaAccessToken: "EAAB_MOCK_TOKEN_" + Math.random().toString(36).substring(7),
          lastMetaAuth: new Date().toISOString(),
          updatedAt: serverTimestamp()
        };

        // setDoc com merge garante que o documento seja criado se não existir
        setDoc(ref, data, { merge: true })
          .then(() => {
            toast({ title: "Facebook Conectado!", description: "Sua conta foi vinculada com sucesso." });
            handleSyncAccounts(currentUser!.uid);
          })
          .catch(async (err) => {
            console.error("Firestore Error:", err);
            const permissionError = new FirestorePermissionError({
              path: ref.path,
              operation: 'write',
              requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let msg = "Não foi possível autorizar a conta.";
      if (error.code === 'auth/popup-blocked') msg = "O pop-up de login foi bloqueado pelo navegador.";
      if (error.code === 'auth/cancelled-popup-request') msg = "A autorização foi cancelada.";
      
      toast({ variant: "destructive", title: "Erro na conexão", description: msg });
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
    
    toast({ title: current ? "Monitoramento pausado" : "Monitoramento ativado" });
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
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline">Integrações</h1>
          <p className="text-muted-foreground">Conecte suas fontes de tráfego e dados para uma atribuição perfeita.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className={cn(
              "glass-card transition-all duration-500",
              isConnected ? "border-green-500/20 bg-green-500/5" : "border-primary/20 bg-primary/5"
            )}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                    isConnected ? "bg-green-600 glow-accent" : "bg-blue-600 glow-primary"
                  )}>
                    <Facebook className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="font-headline">Facebook Ads</CardTitle>
                    <CardDescription>Importe gastos e métricas de campanhas automaticamente.</CardDescription>
                  </div>
                </div>
                <Badge className={cn(
                  "px-3 py-1 border-none font-bold",
                  isConnected ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {isConnected ? "CONECTADO" : "DESCONECTADO"}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                {isConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-white/5">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-sm">Sincronização de dados ativa via API Graph v18.0</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4 mr-2" /> Desconectar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Zap className="w-8 h-8 text-primary mb-4 animate-pulse" />
                    <h3 className="text-lg font-bold mb-2">{user ? "Conecte sua conta Meta" : "Entre para começar"}</h3>
                    <p className="text-sm text-muted-foreground max-w-md mb-6">
                      {user 
                        ? "Ao autorizar, o AdPulse poderá ler seus gastos diários para calcular o ROAS real no seu dashboard."
                        : "Você precisa estar logado com sua conta Google antes de vincular o Facebook Ads."
                      }
                    </p>
                    <Button 
                      onClick={handleMetaConnect} 
                      disabled={loading} 
                      className="glow-primary h-14 px-10 font-bold gap-3 text-lg rounded-2xl transition-all hover:scale-[1.02]"
                    >
                      {loading ? (
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      ) : user ? (
                        <Facebook className="w-6 h-6" />
                      ) : (
                        <LogIn className="w-6 h-6" />
                      )}
                      {user ? "Autorizar Facebook Ads" : "Fazer Login com Google"}
                    </Button>
                  </div>
                )}
              </CardContent>
              {isConnected && (
                <CardFooter className="border-t border-white/5 pt-6 bg-white/5 rounded-b-lg">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground">
                      Última autorização: {profile?.lastMetaAuth ? new Date(profile.lastMetaAuth).toLocaleString('pt-BR') : 'Nunca'}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => user && handleSyncAccounts(user.uid)} disabled={syncing} className="gap-2 border-primary/20 text-primary">
                      <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                      Sincronizar BMs e Contas
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {isConnected && accounts && accounts.length > 0 && (
              <Card className="glass-card animate-in slide-in-from-bottom-4 duration-500">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Contas de Anúncio Encontradas
                  </CardTitle>
                  <CardDescription>Selecione quais contas você deseja monitorar no AdPulse.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {accounts.map((acc: any) => (
                    <div key={acc.accountId} className="flex items-center justify-between p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{acc.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{acc.businessName} • {acc.accountId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-[10px]">{acc.currency}</Badge>
                        <Button 
                          onClick={() => toggleMonitoring(acc.accountId, acc.monitored)}
                          variant={acc.monitored ? "default" : "outline"}
                          size="sm"
                          className={cn("h-8 rounded-lg transition-all", acc.monitored && "bg-green-600 hover:bg-green-700")}
                        >
                          {acc.monitored ? "Ativo" : "Monitorar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Segurança dos Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Seus tokens de acesso são criptografados e nunca compartilhados com terceiros.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">O AdPulse solicita apenas permissão de leitura para métricas e anúncios.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-accent">Configuração do Pixel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Lembre-se: Para o ROAS ser calculado, você também precisa ter o **Pixel AdPulse** instalado na sua página.
                </p>
                <LinkNext href="/pixel">
                  <Button variant="link" className="p-0 h-auto text-accent text-xs group">
                    Ir para configuração do Pixel <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </LinkNext>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
