
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Webhook, 
  Copy, 
  Check, 
  CircleDollarSign,
  Plus,
  Trash2,
  Info,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

const platforms = [
  { id: 'kiwify', name: 'Kiwify', icon: '🥝' },
  { id: 'hotmart', name: 'Hotmart', icon: '🔥' },
  { id: 'cartpanda', name: 'CartPanda', icon: '🐼' },
  { id: 'perfectpay', name: 'PerfectPay', icon: '💎' },
  { id: 'custom', name: 'API Custom', icon: '⚙️' },
];

export default function WebhooksPage() {
  const { user } = useUser();
  const db = useFirestore();
  
  const [newWebhookName, setNewWebhookName] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("kiwify");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const webhooksQuery = useMemo(() => {
    if (!db || !user) return null;
    return collection(db, "users", user.uid, "webhooks");
  }, [db, user]);

  const { data: webhooks, loading } = useCollection(webhooksQuery);

  const handleAddWebhook = async () => {
    if (!user) return;
    if (!newWebhookName) {
      toast({ variant: "destructive", title: "Erro", description: "Dê um nome para sua integração." });
      return;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "webhooks"), {
        name: newWebhookName,
        platform: selectedPlatform,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
      
      setNewWebhookName("");
      setIsDialogOpen(false);
      toast({ title: "Sucesso!", description: "Integração cadastrada com sucesso." });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o webhook." });
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "webhooks", id));
      toast({ title: "Removido", description: "Integração excluída com sucesso." });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao excluir." });
    }
  };

  const copyUrl = (id: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/${id}?userId=${user?.uid}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copiado!", description: "Link do webhook pronto para uso." });
  };

  return (
    <div className="flex min-h-screen bg-background text-white">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">Integrações de Checkout</h1>
            <p className="text-muted-foreground">Cadastre e gerencie seus links de webhook para receber vendas.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 glow-primary">
                <Plus className="w-4 h-4" />
                Novo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121212] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-headline">Cadastrar Integração</DialogTitle>
                <DialogDescription>Escolha a plataforma e dê um nome para identificar este link.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Integração</Label>
                  <Input 
                    placeholder="Ex: Minha Loja Kiwify" 
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plataforma de Checkout</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      {platforms.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddWebhook} className="bg-primary hover:bg-primary/90">Salvar e Gerar Link</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-primary" />
                  Seus Webhooks Ativos
                </CardTitle>
                <CardDescription>Links gerados para suas plataformas de pagamento.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!loading && webhooks && webhooks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead>Integração</TableHead>
                        <TableHead>Link do Webhook</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhooks.map((wh: any) => (
                        <TableRow key={wh.id} className="border-white/5 hover:bg-white/5">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold">{wh.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                {platforms.find(p => p.id === wh.platform)?.icon} {wh.platform}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 max-w-[300px]">
                              <div className="flex-1 p-2 rounded bg-black/40 border border-white/5 font-mono text-[10px] truncate">
                                {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/${wh.id}?userId=${user?.uid}`}
                              </div>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-primary"
                                onClick={() => copyUrl(wh.id)}
                              >
                                {copiedId === wh.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteWebhook(wh.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-20 text-center border-t border-white/5">
                    {loading ? (
                      <div className="animate-pulse text-muted-foreground">Carregando integrações...</div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-muted-foreground">Nenhum webhook cadastrado ainda.</p>
                        <Button variant="outline" className="border-white/10" onClick={() => setIsDialogOpen(true)}>Cadastrar minha primeira plataforma</Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                  <CircleDollarSign className="w-5 h-5 text-primary" />
                  Últimas Vendas Recebidas
                </CardTitle>
                <CardDescription>Histórico de eventos capturados via API.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Horário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-white/5">
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                        Aguardando as primeiras vendas...
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Instruções Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <p>Para cada checkout que você usa (ex: Kiwify para o curso A e Hotmart para o curso B), crie um novo webhook aqui.</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Clique em <b>Novo Webhook</b>.</li>
                  <li>Dê um nome e selecione a plataforma.</li>
                  <li>Copie o link gerado na lista ao lado.</li>
                  <li>Cole este link na área de <b>Webhooks</b> da sua plataforma de vendas.</li>
                </ol>
                <div className="pt-4 flex flex-col gap-2">
                  <Button variant="link" className="p-0 h-auto text-primary justify-start text-[10px]">
                    Tutorial Kiwify <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button variant="link" className="p-0 h-auto text-primary justify-start text-[10px]">
                    Tutorial Hotmart <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Por que separar?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Ao cadastrar webhooks individuais, você consegue identificar exatamente de qual conta e produto cada venda está vindo, facilitando o cálculo de ROI por oferta.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
