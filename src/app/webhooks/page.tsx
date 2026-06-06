"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Webhook, 
  ExternalLink, 
  Copy, 
  Check, 
  CircleDollarSign,
  Clock
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";

export default function WebhooksPage() {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks?userId=${user?.uid || 'SEU_ID'}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "URL Copiada!",
      description: "Cole este endereço nas configurações de webhook da sua plataforma de checkout.",
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1">Webhooks & Integrações</h1>
          <p className="text-muted-foreground">Conecte sua plataforma de vendas para receber conversões em tempo real.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <Card className="glass-card border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline flex items-center gap-2 text-primary">
                    <Webhook className="w-6 h-6" />
                    Sua URL de Webhook
                  </CardTitle>
                  <Badge className="bg-primary/20 text-primary border-none">HTTPS</Badge>
                </div>
                <CardDescription>
                  Use esta URL nas plataformas suportadas para enviar dados de vendas automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs truncate">
                    {webhookUrl}
                  </div>
                  <Button variant="secondary" onClick={copyUrl} className="shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-green-500" /> Suporta Kiwify
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-green-500" /> Suporta Hotmart
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-green-500" /> Suporta CartPanda
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-green-500" /> API Customizada
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-primary" />
                  Conversões Recebidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: "ORD-7721", val: "R$ 97,00", status: "Aprovado", time: "5 min atrás" },
                      { id: "ORD-7719", val: "R$ 499,90", status: "Pendente", time: "12 min atrás" },
                      { id: "ORD-7655", val: "R$ 147,00", status: "Aprovado", time: "1 hora atrás" },
                    ].map((row, i) => (
                      <TableRow key={i} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-bold">{row.id}</TableCell>
                        <TableCell>{row.val}</TableCell>
                        <TableCell>
                          <Badge className={row.status === "Aprovado" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {row.time}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="w-4 h-4 opacity-50" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="glass-card bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="font-headline text-sm uppercase tracking-widest text-accent">Configuração Rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-accent text-white rounded-full text-[10px]">1</span>
                    Acesse sua Plataforma
                  </h4>
                  <p className="text-xs text-muted-foreground pl-7">Vá em Configurações &gt; Webhooks ou API nas ferramentas de checkout.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-accent text-white rounded-full text-[10px]">2</span>
                    Cole a URL
                  </h4>
                  <p className="text-xs text-muted-foreground pl-7">Crie um novo Webhook e cole o link ao lado. Selecione &quot;Venda Aprovada&quot; e &quot;Venda Gerada&quot;.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-accent text-white rounded-full text-[10px]">3</span>
                    Sincronização Ativa
                  </h4>
                  <p className="text-xs text-muted-foreground pl-7">O AdPulse começará a atribuir as vendas automaticamente às suas UTMs.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-sm uppercase tracking-widest text-muted-foreground">Dúvidas Frequentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="link" className="p-0 h-auto text-xs text-primary group">
                  Como funciona a atribuição? <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
                <Button variant="link" className="p-0 h-auto text-xs text-primary group">
                  Segurança dos dados financeiros <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
