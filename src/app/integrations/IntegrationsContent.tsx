"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, RefreshCw, CheckCircle2, Trash2, ArrowRight, Zap, Building2, Target, AlertTriangle } from "lucide-react";
import { useUser } from "@/firebase";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { supabase } from '@/lib/supabaseClient';
import { useSearchParams, useRouter } from 'next/navigation';

export default function IntegrationsContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [connections, setConnections] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pixels, setPixels] = useState<any[]>([]);

  const isConnected = connections.length > 0 && connections[0].status === 'connected';
  const connection = connections[0] || null;

  useEffect(() => {
    // Tratativa de retornos do OAuth
    const connectedParam = searchParams?.get('connected');
    const errorParam = searchParams?.get('error');

    if (errorParam) {
      toast({ variant: 'destructive', title: 'Erro na conexão Meta', description: decodeURIComponent(errorParam) });
      router.replace('/integrations');
    } else if (connectedParam === 'true') {
      toast({ title: 'Meta Ads Conectado!', description: 'Suas contas foram importadas com sucesso.' });
      router.replace('/integrations');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (user) {
      fetchMetaInfo();
    }
  }, [user]);

  async function fetchMetaInfo() {
    if (!user) return;
    try {
      const { data: conn } = await supabase.from('meta_connections').select('*').eq('user_id', user.uid);
      setConnections(conn || []);

      const { data: accs } = await supabase.from('meta_ad_accounts').select('*').eq('user_id', user.uid);
      setAccounts(accs || []);

      const { data: pix } = await supabase.from('meta_pixels').select('*').eq('user_id', user.uid);
      setPixels(pix || []);
    } catch (e) {
      console.error(e);
    }
  }

  const handleMetaConnect = () => {
    if (!user) {
      toast({ variant: "destructive", title: "Login Necessário", description: "Por favor, faça login na barra lateral esquerda antes de conectar o Facebook." });
      return;
    }
    // Passa o userId via query param para o endpoint de connect armazenar no state do OAuth
    window.location.href = `/api/meta/connect?userId=${user.uid}`;
  };

  const handleSyncAccounts = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, datePreset: 'maximum' }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar');
      
      toast({ 
        title: "Sincronização Concluização", 
        description: `As campanhas e métricas foram importadas com sucesso.` 
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro de Sincronização', description: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    try {
      await supabase.from('meta_connections').delete().eq('user_id', user.uid);
      await supabase.from('profiles').update({ meta_connected: false, meta_access_token: null }).eq('id', user.uid);
      setConnections([]);
      setAccounts([]);
      toast({ title: "Desconectado", description: "Sua conta Meta foi desvinculada." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível desconectar." });
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1">Integrações</h1>
          <p className="text-muted-foreground">Conecte suas fontes de tráfego (Meta Ads) e gerencie suas contas de anúncios.</p>
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
                    <CardDescription>Conecte seu Business Manager para importar contas e campanhas.</CardDescription>
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
                          <span className="text-sm font-bold">Conexão Estabelecida: {connection?.facebook_name}</span>
                          <span className="text-xs text-muted-foreground">Você possui {accounts.length} contas e {pixels.length} pixels disponíveis.</span>
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
                      {user ? "Clique abaixo para autorizar o AdPulse a importar suas contas e campanhas." : "Faça login no app primeiro para poder salvar sua conta Meta Ads."}
                    </p>
                    <Button 
                      onClick={handleMetaConnect} 
                      disabled={loading} 
                      className="glow-primary h-16 px-12 font-bold gap-3 text-lg rounded-2xl transition-all hover:scale-[1.02] bg-[#1877F2] hover:bg-[#1877F2]/90 text-white border-none"
                    >
                      {loading ? (
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      ) : (
                        <Facebook className="w-6 h-6" />
                      )}
                      Conectar com Facebook Ads
                    </Button>
                  </div>
                )}
              </CardContent>
              {isConnected && (
                <CardFooter className="border-t border-white/5 pt-6 bg-white/5">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Sincronize as campanhas para que fiquem disponíveis no Dashboard.
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSyncAccounts} disabled={syncing} className="gap-2 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl">
                      <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                      {syncing ? 'Sincronizando...' : 'Sincronizar API'}
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {isConnected && accounts.length > 0 && (
              <Card className="glass-card animate-in slide-in-from-bottom-4 duration-700">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Contas de Anúncios Conectadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {accounts.map((acc: any) => (
                    <div key={acc.account_id} className="flex items-center justify-between p-5 rounded-2xl border transition-all bg-white/5 border-primary/30">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/20 text-primary">
                          <Target className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-base">{acc.account_name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">
                            ID: {acc.account_id}
                          </p>
                        </div>
                      </div>
                      <Link href={`/?create_product=${acc.account_id}`}>
                        <Button size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white glow-primary gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Integrar Conta
                        </Button>
                      </Link>
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
                  Próximos Passos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1. Conecte sua conta.<br/>
                  2. Clique em Sincronizar API.<br/>
                  3. Acesse o <strong>Dashboard</strong> e crie um <strong>Produto</strong> vinculando uma dessas contas de anúncios para visualizar as métricas de investimento, CPC e ROAS.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase text-accent">Status do Pixel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Para o ROAS ser calculado corretamente em tempo real, você também precisa ter o **Pixel AdPulse** instalado na sua página.
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
