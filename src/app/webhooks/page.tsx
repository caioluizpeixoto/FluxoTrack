
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Webhook, 
  Copy, 
  Check, 
  CircleDollarSign,
  Clock,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Zap,
  Info
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";

const platforms = [
  { id: 'kiwify', name: 'Kiwify', icon: '🥝' },
  { id: 'hotmart', name: 'Hotmart', icon: '🔥' },
  { id: 'cartpanda', name: 'CartPanda', icon: '🐼' },
  { id: 'perfectpay', name: 'PerfectPay', icon: '💎' },
  { id: 'custom', name: 'API Custom', icon: '⚙️' },
];

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
      description: "Cole este endereço nas configurações de webhook da sua plataforma.",
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-white">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1">Webhooks de Conversão</h1>
          <p className="text-muted-foreground">Conecte seu checkout para cruzar vendas com gastos de anúncios.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className="glass-card border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Webhook className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-headline text-lg">Sua URL Universal</CardTitle>
                      <CardDescription>Use este link em qualquer plataforma suportada.</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-none">HTTPS ATIVO</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs truncate flex items-center">
                    {webhookUrl}
                  </div>
                  <Button variant="secondary" onClick={copyUrl} className="shrink-0 h-auto">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Guia de Integração
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="kiwify" className="w-full">
                  <TabsList className="bg-white/5 border border-white/10 w-full justify-start p-1 h-14 mb-6">
                    {platforms.map(p => (
                      <TabsTrigger 
                        key={p.id} 
                        value={p.id}
                        className="data-[state=active]:bg-primary data-[state=active]:text-white h-full px-4"
                      >
                        <span className="mr-2">{p.icon}</span>
                        {p.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {platforms.map(p => (
                    <TabsContent key={p.id} value={p.id} className="animate-in fade-in zoom-in-95 duration-300">
                      <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                          <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                            Passo a passo para {p.name}
                          </h4>
                          <ol className="space-y-3 text-xs text-muted-foreground list-decimal pl-4">
                            <li>Acesse seu painel na {p.name}.</li>
                            <li>Vá em Configurações &gt; Webhooks ou API.</li>
                            <li>Clique em "Criar Novo Webhook" ou "Adicionar Endpoint".</li>
                            <li>Cole sua URL Universal no campo de URL.</li>
                            <li>Selecione os eventos: <b>Venda Aprovada</b>, <b>Venda Gerada (Boleto/PIX)</b>.</li>
                            <li>Salve e faça um teste de envio.</li>
                          </ol>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-[10px] text-blue-400">
                          <Info className="w-4 h-4" />
                          O AdPulse identifica o comprador pelo e-mail ou IP e cruza com os eventos do Pixel automaticamente.
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-primary" />
                  Últimas Vendas Recebidas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead>ID / Origem</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Atribuição</TableHead>
                      <TableHead className="text-right">Horário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: "ORD-9912", plat: "Kiwify", val: "R$ 97,00", status: "Aprovado", attr: "Facebook Ads", time: "2 min" },
                      { id: "ORD-9910", plat: "Hotmart", val: "R$ 499,00", status: "Pendente", attr: "Google Ads", time: "15 min" },
                      { id: "ORD-9888", plat: "Kiwify", val: "R$ 147,00", status: "Aprovado", attr: "Orgânico", time: "1h" },
                    ].map((row, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{row.id}</span>
                            <span className="text-[10px] text-muted-foreground">{row.plat}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.val}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "border-none text-[10px]",
                            row.status === "Aprovado" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                          )}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {row.attr}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{row.time} atrás</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Por que integrar?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sem webhooks, o AdPulse não consegue saber se um clique se tornou uma venda real. Ao integrar, você ativa:
                </p>
                <div className="space-y-3">
                  {[
                    "Cálculo exato de Lucro e ROI.",
                    "Identificação de campanhas que vendem.",
                    "Dados para a IA de Atribuição.",
                    "Sincronização com Pixel da Meta (CAPI)."
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-accent" />
                      {text}
                    </div>
                  ))}
                </div>
                <Button variant="link" className="p-0 text-accent text-xs mt-4">
                  Documentação completa <ChevronRight className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
