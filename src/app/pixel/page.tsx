
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code2, Copy, Check, ExternalLink, Activity, Info, Globe, AlertCircle } from "lucide-react";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function PixelPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [copied, setCopied] = useState(false);

  // Busca os últimos 10 eventos reais do Pixel
  const eventsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("timestamp", "desc"),
      limit(10)
    );
  }, [db, user]);

  const { data: events, loading: loadingEvents } = useCollection(eventsQuery);

  const pixelCode = `<!-- AdPulse Tracking Pixel -->
<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    w[l].push({'adpulse.start': new Date().getTime(),event:'gtm.js'});
    var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
    j.src='https://pixel.adpulse.io/v1/pixel.js?id='+i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','adPulse','${user?.uid || 'SEU_ID_AQUI'}');
</script>
<!-- End AdPulse Tracking Pixel -->`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(pixelCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Código copiado!", description: "Cole-o na tag <head> do seu site." });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline">Pixel AdPulse</h1>
          <p className="text-muted-foreground">Instale o pixel para capturar fbp, fbc, UTMs e comportamentos do usuário.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" />
                  Seu Código de Instalação
                </CardTitle>
                <CardDescription>Copie e cole este código em todas as páginas que deseja rastrear.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative group">
                  <pre className="p-6 rounded-2xl bg-black/50 text-[11px] font-mono leading-relaxed overflow-x-auto border border-white/5 h-[220px]">
                    {pixelCode}
                  </pre>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="absolute top-4 right-4"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <Info className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    O pixel deve ser instalado dentro da tag <code>&lt;head&gt;</code> para garantir que UTMs e IDs de sessão sejam capturados antes do carregamento da página.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Atividade em Tempo Real
                  </CardTitle>
                  <CardDescription>Últimos eventos capturados pelo pixel.</CardDescription>
                </div>
                <Badge variant="outline" className="animate-pulse border-green-500/30 text-green-500">Live Listening</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead>Evento</TableHead>
                      <TableHead>Página / URL</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Horário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingEvents ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 animate-pulse">Buscando eventos...</TableCell></TableRow>
                    ) : events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                          Nenhum evento detectado. Instale o pixel e atualize seu site.
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((e: any) => (
                        <TableRow key={e.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell>
                            <Badge className={cn(
                              "capitalize border-none",
                              e.eventType === 'purchase' ? "bg-green-500/10 text-green-500" :
                              e.eventType === 'checkout_start' ? "bg-yellow-500/10 text-yellow-500" :
                              "bg-primary/10 text-primary"
                            )}>
                              {e.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {e.url || '/'}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-bold">{e.utmSource || 'Direto'}</span>
                          </TableCell>
                          <TableCell className="text-right text-[10px] text-muted-foreground">
                            {new Date(e.timestamp).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Eventos Rastreados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "PageView", desc: "Capturado automaticamente em cada carga." },
                  { name: "ButtonClick", desc: "Rastreia cliques em botões de CTA." },
                  { name: "CheckoutStarted", desc: "Identifica redirecionamentos para checkout." },
                  { name: "UTMs & GCLID", desc: "Extrai origens e IDs de campanha." },
                  { name: "FBP & FBC", desc: "Coleta cookies persistentes da Meta." }
                ].map((ev, i) => (
                  <div key={i} className="flex flex-col gap-1 pb-3 border-b border-white/5 last:border-none">
                    <span className="text-xs font-bold text-primary">{ev.name}</span>
                    <span className="text-[10px] text-muted-foreground">{ev.desc}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Conversion API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  O AdPulse já está enviando os dados capturados para o servidor. Ative a CAPI na página de integrações para reenviar esses eventos à Meta e contornar o iOS 14+.
                </p>
                <Button variant="outline" className="w-full border-accent/30 text-accent hover:bg-accent/10 h-10 text-xs">
                  Configurar CAPI
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
