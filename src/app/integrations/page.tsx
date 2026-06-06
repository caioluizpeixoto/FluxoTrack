
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, RefreshCw, CheckCircle2, AlertCircle, Trash2, ArrowRight, Zap, Building2, Target } from "lucide-react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  const isConnected = !!profile?.metaConnected;

  const handleMetaConnect = async () => {
    setLoading(true);
    // Simulação do redirecionamento OAuth Meta
    // Em produção: window.location.href = `/api/auth/meta?userId=${user?.uid}`;
    setTimeout(async () => {
      if (userRef) {
        await updateDoc(userRef, {
          metaConnected: true,
          metaAccessToken: "EAAB_MOCK_TOKEN",
          lastMetaAuth: new Date().toISOString()
        });
        toast({ title: "Facebook Conectado!", description: "Suas contas de anúncios estão prontas para importação." });
      }
      setLoading(false);
    }, 1500);
  };

  const handleSyncAccounts = async () => {
    if (!user) return;
    setSyncing(true);
    
    // Simulação de busca na API da Meta para contas de anúncios
    const mockAccounts = [
      { accountId: "act_123456", name: "Conta Principal - Ecom", currency: "BRL", status: "ACTIVE", businessName: "Vendas Online BM" },
      { accountId: "act_789012", name: "Backup - Tráfego Direto", currency: "BRL", status: "ACTIVE", businessName: "Vendas Online BM" }
    ];

    try {
      const accountsColl = collection(db, "users", user.uid, "ad_accounts");
      for (const acc of mockAccounts) {
        await setDoc(doc(accountsColl, acc.accountId), {
          ...acc,
          monitored: true,
          updatedAt: serverTimestamp()
        });
      }
      toast({ title: "Sincronização concluída", description: `${mockAccounts.length} contas encontradas.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao sincronizar", description: "Falha na comunicação com a Meta." });
    } finally {
      setSyncing(false);
    }
  };

  const toggleMonitoring = async (accId: string, current: boolean) => {
    if (!user) return;
    const accRef = doc(db, "users", user.uid, "ad_accounts", accId);
    await updateDoc(accRef, { monitored: !current });
    toast({ title: current ? "Monitoramento pausado" : "Monitoramento ativado" });
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
            <Card className="glass-card border-primary/20 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center glow-primary">
                    <Facebook className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="font-headline">Facebook Ads</CardTitle>
                    <CardDescription>Importe gastos e métricas de campanhas automaticamente.</CardDescription>
                  </div>
                </div>
                <Badge className={cn(
                  "px-3 py-1 border-none",
                  isConnected ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
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
                      <Button variant="ghost" size="sm" onClick={() => {}} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Desconectar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Zap className="w-8 h-8 text-primary mb-4 animate-pulse" />
                    <h3 className="text-lg font-bold mb-2">Conecte sua conta Meta</h3>
                    <p className="text-sm text-muted-foreground max-w-md mb-6">
                      Ao autorizar, o AdPulse poderá ler seus gastos diários para calcular o ROAS real no seu dashboard.
                    </p>
                    <Button onClick={handleMetaConnect} disabled={loading} className="glow-primary h-12 px-8 font-bold gap-2">
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Facebook className="w-5 h-5" />}
                      Autorizar Facebook Ads
                    </Button>
                  </div>
                )}
              </CardContent>
              {isConnected && (
                <CardFooter className="border-t border-white/5 pt-6 bg-white/5 rounded-b-lg">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground">
                      Última atualização: {profile?.lastMetaAuth ? new Date(profile.lastMetaAuth).toLocaleString() : 'Nunca'}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSyncAccounts} disabled={syncing} className="gap-2">
                      <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                      Sincronizar BMs e Contas
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {isConnected && accounts.length > 0 && (
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
                          className={cn("h-8 rounded-lg", acc.monitored && "bg-green-600 hover:bg-green-700")}
                        >
                          {acc.monitored ? "Ativo" : "Monitorar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button className="w-full mt-6 glow-primary font-bold">Salvar Contas Monitoradas</Button>
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
                  <Button variant="link" className="p-0 h-auto text-accent text-xs">
                    Ir para configuração do Pixel <ArrowRight className="w-3 h-3 ml-1" />
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
