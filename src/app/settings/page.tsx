
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Copy, Check, Shield, Code, Save, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const userRef = user ? doc(db, "users", user.uid) : null;
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
    if (!userRef) return;
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
        description: "Não foi possível atualizar seu perfil.",
      });
    }
  };

  const trackingScript = `
<!-- AdPulse Tracking Script -->
<script>
  (function() {
    const userId = "${user?.uid || 'SEU_ID_AQUI'}";
    const apiEndpoint = "${typeof window !== 'undefined' ? window.location.origin : ''}/api/tracking";
    
    function track(eventType, data = {}) {
      fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          eventType: eventType,
          url: window.location.href,
          referrer: document.referrer,
          utmSource: new URLSearchParams(window.location.search).get('utm_source'),
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
          fbc: document.cookie.split('; ').find(row => row.startsWith('_fbc='))?.split('=')[1],
          fbp: document.cookie.split('; ').find(row => row.startsWith('_fbp='))?.split('=')[1],
          ...data
        })
      }).catch(err => console.error('AdPulse Error:', err));
    }

    // Auto-track page view
    track('page_view');

    // Export global tracker
    window.adPulse = { track: track };
  })();
</script>
  `.trim();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(trackingScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copiado!",
      description: "Script de rastreamento copiado para a área de transferência.",
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e instale o pixel de rastreamento.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Perfil da Loja
                </CardTitle>
                <CardDescription>Informações básicas do seu dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome de Exibição</Label>
                  <Input 
                    id="name" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu Nome ou Nome da Loja"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL da Loja</Label>
                  <Input 
                    id="url" 
                    value={storeUrl} 
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="https://sualoja.com.br"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seu Tracking ID</Label>
                  <div className="p-3 rounded-lg bg-muted text-xs font-mono break-all border border-white/5">
                    {user?.uid}
                  </div>
                </div>
                <Button onClick={handleSaveProfile} className="w-full gap-2 glow-primary">
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card border-accent/20">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Code className="w-5 h-5 text-accent" />
                  Script de Instalação
                </CardTitle>
                <CardDescription>
                  Copie e cole este script na tag <code>&lt;head&gt;</code> do seu site para começar a rastrear.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative group">
                  <pre className="p-4 rounded-xl bg-black/40 text-[10px] text-accent-foreground/80 overflow-x-auto border border-white/10 font-mono leading-relaxed h-[300px]">
                    {trackingScript}
                  </pre>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-500" /> 
                  Rastreia automaticamente Page Views e UTMs.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="glass-card bg-primary/5">
              <CardHeader>
                <CardTitle className="font-headline text-sm uppercase tracking-widest text-primary">Plano Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold font-headline capitalize">{profile?.plan || 'Free'}</h3>
                    <p className="text-xs text-muted-foreground">Válido até 25 de Dez, 2024</p>
                  </div>
                  <Badge className="bg-primary text-white">Ativo</Badge>
                </div>
                <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10">
                  Fazer Upgrade
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-sm uppercase tracking-widest text-muted-foreground">Ajuda & Suporte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-between text-sm group">
                  Documentação da API <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </Button>
                <Button variant="ghost" className="w-full justify-between text-sm group">
                  Como instalar no Shopify <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </Button>
                <Button variant="ghost" className="w-full justify-between text-sm group">
                  Falar com Suporte <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
