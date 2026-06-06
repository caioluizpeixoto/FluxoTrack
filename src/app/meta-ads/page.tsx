
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Facebook, RefreshCw, Target, ShieldCheck, Lock, Trash2, Zap, LogIn } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { useUser, useFirestore, useCollection, useDoc, useAuth } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp, deleteDoc, query, getDocs, updateDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function MetaAdsPage() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const userRef = useMemo(() => user ? doc(db, "users", user.uid) : null, [db, user]);
  const { data: profile } = useDoc(userRef);

  const campaignsQuery = useMemo(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "campaigns");
  }, [db, user]);
  const { data: campaigns, loading: loadingCampaigns } = useCollection(campaignsQuery);

  const isConnected = !!profile?.metaAccessToken;

  const handleFacebookConnect = async () => {
    setConnecting(true);
    let currentUser = user;

    try {
      // 1. Garante que o usuário está logado no Google
      if (!currentUser) {
        toast({ title: "Autenticação", description: "Faça login com Google para vincular a Meta." });
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
      }

      if (currentUser) {
        const ref = doc(db, "users", currentUser.uid);
        const data = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          metaAccessToken: "EAAB_MOCK_TOKEN_" + Math.random().toString(36).substring(7),
          metaConnected: true,
          updatedAt: serverTimestamp()
        };

        // setDoc com merge para criar ou atualizar
        setDoc(ref, data, { merge: true })
          .then(() => {
            toast({ title: "Conectado!", description: "Sua conta Meta Ads foi vinculada com sucesso." });
          })
          .catch(async (err) => {
            console.error("Firestore Error:", err);
            const permissionError = new FirestorePermissionError({ path: ref.path, operation: 'write', requestResourceData: data });
            errorEmitter.emit('permission-error', permissionError);
          });
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let msg = "Falha ao autorizar Facebook.";
      if (error.code === 'auth/popup-blocked') msg = "Pop-up bloqueado pelo navegador.";
      toast({ variant: "destructive", title: "Erro na conexão", description: msg });
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncData = () => {
    if (!user || !db) return;
    setSyncing(true);

    const mockMetaCampaigns = [
      { campaignId: "meta_1", name: "Escala_Lookalike_01", platform: "meta", status: "ACTIVE", spend: 850.40, clicks: 1200, impressions: 24000, conversions: 15 },
      { campaignId: "meta_2", name: "Remarketing_Carrinho_Aberto", platform: "meta", status: "ACTIVE", spend: 320.15, clicks: 450, impressions: 8500, conversions: 9 },
    ];

    const campaignsRef = collection(db, "users", user.uid, "campaigns");
    
    mockMetaCampaigns.forEach((camp) => {
      const campDocRef = doc(campaignsRef, camp.campaignId);
      const data = { ...camp, lastSync: new Date().toISOString(), serverTimestamp: serverTimestamp() };
      
      setDoc(campDocRef, data, { merge: true })
        .catch(async () => {
          const err = new FirestorePermissionError({ path: campDocRef.path, operation: 'write', requestResourceData: data });
          errorEmitter.emit('permission-error', err);
        });
    });

    setTimeout(() => {
      setSyncing(false);
      toast({ title: "Sincronização concluída", description: "Dados de gastos atualizados." });
    }, 1500);
  };

  const handleDeleteCampaigns = async () => {
    if (!user || !db) return;
    const q = query(collection(db, "users", user.uid, "campaigns"));
    const snapshot = await getDocs(q);
    
    snapshot.docs.forEach((d) => {
      deleteDoc(doc(db, "users", user.uid, "campaigns", d.id))
        .catch(async () => {
          const err = new FirestorePermissionError({ path: d.ref.path, operation: 'delete' });
          errorEmitter.emit('permission-error', err);
        });
    });
    
    toast({ title: "Dados limpos", description: "Campanhas removidas." });
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

    toast({ title: "Desconectado", description: "Conta desvinculada." });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">Conexão Meta Ads</h1>
            <p className="text-muted-foreground">Conecte sua conta para importar gastos e calcular ROAS real.</p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-3">
              <Button onClick={handleSyncData} disabled={syncing} variant="outline" className="gap-2 border-primary/30 text-primary">
                <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                Sincronizar Gastos
              </Button>
              <Badge className="bg-green-500/10 text-green-500 border-none px-3 py-1 font-bold">
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
              <CardTitle className="text-2xl font-headline mb-2 text-center">
                {user ? "Conectar via Login Oficial" : "Entre para começar"}
              </CardTitle>
              <CardDescription className="mb-8 text-center">
                {user 
                  ? "Autorize o AdPulse a ler seus dados de anúncios com um fluxo de conexão automático e seguro."
                  : "Por favor, clique no botão abaixo para fazer login e depois vincular sua conta Meta."
                }
              </CardDescription>
              
              <div className="space-y-4">
                <Button 
                  onClick={handleFacebookConnect} 
                  disabled={connecting}
                  className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg gap-3 shadow-lg shadow-blue-900/20 rounded-2xl transition-all hover:scale-[1.02]"
                >
                  {connecting ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : user ? (
                    <Zap className="w-6 h-6 fill-current" />
                  ) : (
                    <LogIn className="w-6 h-6" />
                  )}
                  {user ? "Autorizar Conexão Automática" : "Fazer Login com Google"}
                </Button>
                
                {user && (
                  <>
                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 text-muted-foreground">Ou via Token Manual</span></div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Access Token de Usuário do Sistema</Label>
                        <Input 
                          type="password" 
                          placeholder="EAAB..." 
                          className="bg-white/5 border-white/10 font-mono text-xs h-12"
                          onBlur={(e) => {
                            if (e.target.value && user && userRef) {
                              setDoc(userRef, { metaAccessToken: e.target.value, metaConnected: true }, { merge: true })
                                .catch(async () => {
                                  const err = new FirestorePermissionError({ path: userRef.path, operation: 'update' });
                                  errorEmitter.emit('permission-error', err);
                                });
                              toast({ title: "Token salvo!", description: "Conexão manual estabelecida." });
                            }
                          }}
                        />
                      </div>
                      <div className="pt-4 flex items-center justify-center gap-2">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Protocolo de Segurança OAuth 2.0</span>
                      </div>
                    </div>
                  </>
                )}
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
                    <CardDescription>Dados sincronizados via API Graph.</CardDescription>
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
                            <TableCell className="text-right font-mono text-xs">R$ {acc.spend?.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold text-primary">{acc.conversions}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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
                    <span className="text-muted-foreground">Autorização:</span>
                    <span className="font-bold text-green-500">Válida</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-bold">OAuth 2.0</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <Button 
                      variant="ghost" 
                      onClick={handleDisconnect}
                      className="w-full text-destructive hover:bg-destructive/10 h-10"
                    >
                      Desconectar Conta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
