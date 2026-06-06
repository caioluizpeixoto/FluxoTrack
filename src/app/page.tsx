
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { StatCard } from "@/components/dashboard/stat-card";
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  ShoppingCart, 
  Target, 
  MousePointer2, 
  Eye, 
  CreditCard, 
  ShoppingBag, 
  Smartphone,
  RefreshCw,
  Pencil,
  Info,
  LayoutGrid,
  Menu,
  ArrowRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";

const allMetrics = [
  { id: 'revenue', label: 'Faturamento', icon: DollarSign, tooltip: "Soma de todas as vendas aprovadas." },
  { id: 'spend', label: 'Investimento', icon: TrendingUp, tooltip: "Total gasto em campanhas de anúncios." },
  { id: 'profit', label: 'Lucro', icon: ShoppingBag, tooltip: "Faturamento menos o investimento." },
  { id: 'roas', label: 'ROAS', icon: Target, tooltip: "Retorno sobre o gasto com anúncios (Faturamento / Investimento)." },
  { id: 'cpa', label: 'CPA', icon: CreditCard, tooltip: "Custo por Aquisição (Gasto / Vendas)." },
  { id: 'cpc', label: 'CPC', icon: MousePointer2, tooltip: "Custo médio por clique." },
  { id: 'ctr', label: 'CTR', icon: Percent, tooltip: "Click-Through Rate (Cliques / Impressões)." },
  { id: 'cpm', label: 'CPM', icon: Eye, tooltip: "Custo por mil impressões." },
  { id: 'purchases', label: 'Compras', icon: ShoppingBag, tooltip: "Número total de vendas aprovadas." },
  { id: 'checkout', label: 'Checkout Iniciado', icon: ShoppingCart, tooltip: "Visitantes que chegaram ao checkout." },
  { id: 'pix', label: 'PIX Gerado', icon: Smartphone, tooltip: "Número de pedidos com PIX gerado." },
  { id: 'conv_rate', label: 'Taxa de Conversão', icon: TrendingUp, tooltip: "Percentual de visitantes que compraram." },
];

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(allMetrics.slice(0, 8).map(m => m.id));
  const [dateRange, setDateRange] = useState("hoje");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Queries para dados reais
  const conversionsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, "users", user.uid, "conversions"), limit(500));
  }, [db, user]);

  const campaignsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, "users", user.uid, "campaigns"), limit(100));
  }, [db, user]);

  const eventsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, "users", user.uid, "events"), limit(1000));
  }, [db, user]);

  const { data: conversions } = useCollection(conversionsQuery);
  const { data: campaigns } = useCollection(campaignsQuery);
  const { data: events } = useCollection(eventsQuery);

  // Cálculo de Métricas em Tempo Real
  const stats = useMemo(() => {
    const totalRevenue = conversions.reduce((acc, curr: any) => acc + (curr.value || 0), 0);
    const totalSpend = campaigns.reduce((acc, curr: any) => acc + (curr.spend || 0), 0);
    const totalPurchases = conversions.filter((c: any) => c.status === 'approved' || c.status === 'approved').length;
    const totalImpressions = campaigns.reduce((acc, curr: any) => acc + (curr.impressions || 0), 0);
    const totalClicks = campaigns.reduce((acc, curr: any) => acc + (curr.clicks || 0), 0);
    
    const checkouts = events.filter((e: any) => e.eventType === 'checkout_start' || e.eventType === 'START_CHECKOUT').length;
    const pixs = events.filter((e: any) => e.eventType === 'pix_generated' || e.eventType === 'PIX_GENERATED').length;
    const pageViews = events.filter((e: any) => e.eventType === 'page_view').length;

    const roas = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;
    const cpa = totalPurchases > 0 ? (totalSpend / totalPurchases) : 0;
    const cpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const convRate = pageViews > 0 ? (totalPurchases / pageViews) * 100 : 0;

    return {
      revenue: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      spend: `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      profit: `R$ ${(totalRevenue - totalSpend).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      roas: roas.toFixed(2),
      cpa: `R$ ${cpa.toFixed(2)}`,
      cpc: `R$ ${cpc.toFixed(2)}`,
      ctr: `${ctr.toFixed(2)}%`,
      cpm: `R$ ${cpm.toFixed(2)}`,
      purchases: totalPurchases.toString(),
      checkout: checkouts.toString(),
      pix: pixs.toString(),
      conv_rate: `${convRate.toFixed(2)}%`,
      // Funnel values
      impressions: totalImpressions,
      clicks: totalClicks,
      pageViews,
      checkouts,
      pixs,
      sales: totalPurchases
    };
  }, [conversions, campaigns, events]);

  const toggleMetric = (id: string) => {
    setVisibleMetrics(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      <DashboardSidebar />
      
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8 transition-all">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-headline font-bold text-sm lg:text-base uppercase tracking-tight text-muted-foreground">AdPulse Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-white/5 text-primary">
                  <Pencil className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#121212] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="font-headline">Personalizar Dashboard</DialogTitle>
                  <DialogDescription>Escolha as métricas que deseja ver nos cards principais.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {allMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <Checkbox 
                        id={metric.id} 
                        checked={visibleMetrics.includes(metric.id)}
                        onCheckedChange={() => toggleMetric(metric.id)}
                        className="border-white/20 data-[state=checked]:bg-primary"
                      />
                      <label htmlFor={metric.id} className="text-sm font-medium leading-none cursor-pointer flex-1">
                        {metric.label}
                      </label>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" className="hover:bg-white/5" onClick={() => window.location.reload()}>
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <Card className="bg-[#121212] border-none rounded-2xl p-6 mb-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 relative z-10">
            <div>
              <h2 className="text-2xl font-bold font-headline mb-1">Resumo de Performance</h2>
              <p className="text-muted-foreground text-xs">Dados sincronizados em tempo real com {campaigns.length} campanhas ativas.</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-8 rounded-xl h-12 transition-all glow-primary gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar Agora
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Período</span>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="bg-black/20 border-white/10 rounded-xl h-12">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="ontem">Ontem</SelectItem>
                  <SelectItem value="sete_dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="trinta_dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="este_mes">Este mês</SelectItem>
                  <SelectItem value="mes_passado">Mês passado</SelectItem>
                  <SelectItem value="maximo">Máximo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {['Conta', 'Plataforma', 'Produto'].map((f) => (
              <div key={f} className="space-y-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{f}</span>
                <Select defaultValue="all">
                  <SelectTrigger className="bg-black/20 border-white/10 rounded-xl h-12">
                    <SelectValue placeholder={`Todos(as)`} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="all">Todos(as)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Card>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {allMetrics.filter(m => visibleMetrics.includes(m.id)).map((metric) => (
            <StatCard 
              key={metric.id}
              label={metric.label} 
              value={(stats as any)[metric.id]} 
              change={0}
              icon={metric.icon}
              trend="neutral"
              tooltip={metric.tooltip}
              className="bg-[#121212] border-none rounded-2xl h-36 hover:bg-[#1a1a1a] transition-all"
            />
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 bg-[#121212] border-none rounded-2xl overflow-hidden shadow-xl">
             <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground font-headline flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Faturamento x Gasto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Seg', revenue: 400, spend: 240 },
                    { name: 'Ter', revenue: 300, spend: 139 },
                    { name: 'Qua', revenue: 200, spend: 980 },
                    { name: 'Qui', revenue: 278, spend: 390 },
                    { name: 'Sex', revenue: 189, spend: 480 },
                    { name: 'Sáb', revenue: 239, spend: 380 },
                    { name: 'Dom', revenue: 349, spend: 430 },
                  ]}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                    <Area type="monotone" dataKey="spend" name="Investimento" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#121212] border-none rounded-2xl shadow-xl flex flex-col">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground font-headline">Funil de Atribuição</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col justify-between">
              {[
                { label: 'Impressões', val: stats.impressions, color: 'bg-muted' },
                { label: 'Cliques', val: stats.clicks, color: 'bg-primary/40' },
                { label: 'Visitas', val: stats.pageViews, color: 'bg-primary/60' },
                { label: 'Checkout', val: stats.checkouts, color: 'bg-primary/80' },
                { label: 'PIX Gerado', val: stats.pixs, color: 'bg-accent' },
                { label: 'Compras', val: stats.sales, color: 'bg-green-500' },
              ].map((step, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{step.label}</span>
                    <span className="text-xs font-black font-headline">{step.val.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden flex items-center">
                    <div 
                      className={cn("h-full transition-all duration-1000 rounded-full", step.color)}
                      style={{ width: `${Math.min(100, (step.val / (stats.impressions || 1)) * 100)}%` }} 
                    />
                  </div>
                  {i < 5 && (
                    <div className="flex justify-center -mb-2">
                       <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90 opacity-20" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
