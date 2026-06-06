
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
  Lock
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function MetaAdsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    // Simulação de autenticação com Meta
    setTimeout(() => {
      setIsConnected(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">Conexão Meta Ads</h1>
            <p className="text-muted-foreground">Sincronize seus gastos de anúncios para calcular o ROI real.</p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2 border-primary/30 text-primary">
                <RefreshCw className="w-4 h-4" />
                Sincronizar Agora
              </Button>
              <Badge className="bg-green-500/10 text-green-500 border-none px-3 py-1">
                Conectado
              </Badge>
            </div>
          )}
        </header>

        {!isConnected ? (
          <div className="max-w-2xl mx-auto py-12">
            <Card className="glass-card border-primary/20 text-center p-8">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 glow-primary">
                <Facebook className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-headline mb-2">Conectar conta do Facebook</CardTitle>
              <CardDescription className="mb-8">
                Precisamos de acesso à sua conta de anúncios para importar os gastos diários e cruzar com as vendas identificadas pelo nosso pixel.
              </CardDescription>
              <div className="space-y-4">
                <Button 
                  onClick={handleConnect} 
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-3"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Facebook className="w-5 h-5" />}
                  Conectar via Facebook Login
                </Button>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-2">
                  <Lock className="w-3 h-3" />
                  Seus dados são criptografados e nunca compartilhados.
                </p>
              </div>
              
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {[
                  { title: "Gasto Real", desc: "Importação direta da API da Meta." },
                  { title: "ROAS Preciso", desc: "Cruzamento com vendas de checkout." },
                  { title: "API de Conversão", desc: "Envio de eventos para reduzir perdas." },
                ].map((feat, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h4 className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{feat.title}</h4>
                    <p className="text-[10px] text-muted-foreground">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg font-headline flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Contas de Anúncios Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead>Conta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Gasto (Hoje)</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { name: "BM_01_PRODUTO_X", status: "Ativa", spend: "R$ 1.240,00" },
                        { name: "BM_02_REMARKETING", status: "Ativa", spend: "R$ 450,00" },
                      ].map((acc, i) => (
                        <TableRow key={i} className="border-white/5">
                          <TableCell className="font-bold">{acc.name}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-500/10 text-green-500 border-none text-[10px]">
                              {acc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{acc.spend}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-primary h-8">Ver Campanhas</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg font-headline">Configurações da API de Conversão</CardTitle>
                  <CardDescription>Envie eventos diretamente para os servidores da Meta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Token de Acesso da API (CAPI)</Label>
                    <Input type="password" placeholder="EAAB..." className="bg-white/5 border-white/10 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>ID do Pixel</Label>
                    <Input placeholder="1234567890..." className="bg-white/5 border-white/10" />
                  </div>
                  <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar Configurações de API
                  </Button>
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
                    <span className="text-muted-foreground">Token Expira em:</span>
                    <span className="font-bold">59 dias</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Última Sincronização:</span>
                    <span className="font-bold">12:45h</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10">
                      Desconectar Conta
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Ajuda Técnica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="link" className="p-0 h-auto text-xs text-primary group justify-start w-full">
                    Como gerar o Access Token <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button variant="link" className="p-0 h-auto text-xs text-primary group justify-start w-full">
                    O que é API de Conversão? <ExternalLink className="w-3 h-3 ml-1" />
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
