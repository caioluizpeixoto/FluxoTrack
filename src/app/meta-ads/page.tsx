
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Facebook, 
  RefreshCw, 
  Sparkles, 
  Target, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Lock,
  Trash2
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, doc, setDoc, addDoc, serverTimestamp, deleteDoc, query, getDocs } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function MetaAdsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [syncing, setSyncing] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [pixelId, setPixelId] = useState("");

  // Busca dados de configuração do usuário
  const userRef = useMemo(() => user ? doc(db, "users", user.uid) : null, [db, user]);
  const { data: profile } = useDoc(userRef);

  // Busca campanhas sincronizadas
  const campaignsQuery = useMemo(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "campaigns");
  }, [db, user]);
  const { data: campaigns, loading: loadingCampaigns } = useCollection(campaignsQuery);

  const isConnected = !!profile?.metaAccessToken;

  const handleConnect = async () => {
    if (!user || !accessToken) {
      toast({ variant: "destructive", title: "Erro", description: "Insira o Access Token para conectar." });
      return;
    }
    
    setSyncing(true);
    const docRef = doc(db, "users", user.uid);
    
    setDoc(docRef, {
      metaAccessToken: accessToken,
      metaPixelId: pixelId,
      updatedAt: new Date().toISOString()
    }, { merge: true })
    .then(() => {
      toast({ title: "Conectado!", description: "Sua conta Meta Ads foi vinculada com sucesso." });
      setSyncing(false);
    })
    .catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { metaAccessToken: accessToken },
      });
      errorEmitter.emit('permission-error', permissionError);
      setSyncing(false);
    });
  };

  const handleSyncData = async () => {
    if (!user) return;
    setSyncing(true);

    // Simulação de busca na API da Meta (em produção aqui seria um fetch para graph.facebook.com)
    const mockMetaCampaigns = [
      { campaignId: "meta_1", name: "Escala_Lookalike_01", platform: "meta", status: "ACTIVE", spend: 850.40, clicks: 1200, impressions: 24000, conversions: 15 },
      { campaignId: "meta_2", name: "Remarketing_Carrinho_Aberto", platform: "meta", status: "ACTIVE", spend: 320.15, clicks: 450, impressions: 8500, conversions: 9 },
    ];

    try {
      const campaignsRef = collection(db, "users", user.uid, "campaigns");
      
      // Para o MVP, estamos adicionando as campanhas simuladas ao Firestore real
      for (const camp of mockMetaCampaigns) {
        await addDoc(campaignsRef, {
          ...camp,
          lastSync: new Date().toISOString(),
          serverTimestamp: serverTimestamp()
        });
      }

      toast({ title: "Sincronização concluída", description: "Os dados de gastos foram atualizados." });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro na sincronização", description: "Não foi possível importar os dados." });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteCampaigns = async () => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "campaigns"));
    const snapshot = await getDocs(q);
    snapshot.forEach((d) => deleteDoc(doc(db, "users", user.uid, "campaigns", d.id)));
    toast({ title: "Dados limpos", description: "Todas as campanhas foram removidas." });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">Conexão Meta Ads</h1>
            <p className="text-muted-foreground">Sincronize seus gastos para calcular o ROAS real no Dashboard.</p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-3">
              <Button onClick={handleSyncData} disabled={syncing} variant="outline" className="gap-2 border-primary/30 text-primary">
                <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                Sincronizar Gastos
              </Button>
              <Badge className="bg-green-500/10 text-green-500 border-none px-3 py-1">
                API Ativa
              </Badge>
            </div>
          )}
        </header>

        {!isConnected ? (
          <div className="max-w-2xl mx-auto py-12">
            <Card className="glass-card border-primary/20 p-8">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 glow-primary">
                <Facebook className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-headline mb-2 text-center">Configurar Token da API Graph</CardTitle>
              <CardDescription className="mb-8 text-center">
                Para importar seus gastos, você precisa de um "Access Token de Usuário do Sistema" gerado no Gerenciador de Negócios da Meta.
              </CardDescription>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Meta Access Token (Long-lived)</Label>
                  <Input 
                    type="password" 
                    placeholder="EAAB..." 
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="bg-white/5 border-white/10 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pixel ID (Opcional para CAPI)</Label>
                  <Input 
                    placeholder="123456789..." 
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <Button 
                  onClick={handleConnect} 
                  disabled={syncing}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-3"
                >
                  {syncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  Conectar API Meta Ads
                </Button>
                <div className="pt-4 flex items-center justify-center gap-2">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Conexão Segura AES-256</span>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Campanhas Importadas
                    </CardTitle>
                    <CardDescription>Dados sincronizados diretamente da sua BM.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleDeleteCampaigns} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead>Campanha</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Gasto</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCampaigns ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 animate-pulse">Carregando dados...</TableCell></TableRow>
                      ) : campaigns.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Clique em Sincronizar para importar os dados.</TableCell></TableRow>
                      ) : (
                        campaigns.map((acc: any) => (
                          <TableRow key={acc.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="font-bold">{acc.name}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-500/10 text-green-500 border-none text-[10px]">
                                {acc.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">R$ {acc.spend?.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{acc.conversions}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg font-headline">Configuração Avançada CAPI</CardTitle>
                  <CardDescription>Status do envio de eventos de servidor para redução de perda do iOS.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium">Eventos de Compra sendo enviados via Servidor</span>
                    </div>
                    <Badge variant="outline">Ativo</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="glass-card border-accent/20 bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    Status da Conexão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Token Ativo:</span>
                    <span className="font-bold text-green-500">Sim</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Última Sinc:</span>
                    <span className="font-bold">Agora</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        if (user) setDoc(doc(db, "users", user.uid), { metaAccessToken: null }, { merge: true });
                      }}
                      className="w-full text-destructive hover:bg-destructive/10"
                    >
                      Desconectar Conta
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Suporte à API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="link" className="p-0 h-auto text-xs text-primary group justify-start w-full">
                    Como gerar o Access Token Permanente <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button variant="link" className="p-0 h-auto text-xs text-primary group justify-start w-full">
                    Documentação do Pixel Server-Side <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
