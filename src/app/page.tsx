
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { StatCard } from "@/components/dashboard/stat-card";
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  ShoppingCart, 
  ArrowUpRight,
  Calendar,
  Sparkles,
  RefreshCw,
  Target,
  MousePointer2,
  Eye,
  CreditCard,
  ShoppingBag,
  Smartphone,
  ChevronRight,
  Filter,
  ArrowRight,
  Undo2,
  LayoutGrid,
  Box,
  MonitorPlay,
  Facebook,
  Chrome,
  Instagram,
  Globe
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect, useMemo } from "react";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";

const chartData = [
  { name: '00:00', revenue: 1200, spend: 800 },
  { name: '04:00', revenue: 900, spend: 600 },
  { name: '08:00', revenue: 4500, spend: 2100 },
  { name: '12:00', revenue: 8200, spend: 3400 },
  { name: '16:00', revenue: 6800, spend: 2900 },
  { name: '20:00', revenue: 9500, spend: 4100 },
  { name: '23:59', revenue: 11000, spend: 4800 },
];

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [timeFilter, setTimeFilter] = useState("Hoje");

  useEffect(() => {
    setMounted(true);
  }, []);

  const eventsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("timestamp", "desc"),
      limit(7)
    );
  }, [db, user]);

  const { data: recentEvents, loading: eventsLoading } = useCollection(eventsQuery);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        {/* Header com Filtros */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1 tracking-tight">Painel de Atribuição</h1>
            <p className="text-muted-foreground text-sm">Monitoramento de ROI e performance em tempo real.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-muted p-1 rounded-lg border border-white/5">
              {["Hoje", "Ontem", "7 dias", "30 dias", "Mês", "Personalizado"].map((filter) => (
                <Button 
                  key={filter}
                  variant={timeFilter === filter ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 px-3 text-[10px] font-bold uppercase tracking-wider",
                    timeFilter === filter ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                  onClick={() => setTimeFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
            </div>
            <Button size="sm" className="gap-2 glow-primary h-10 px-4">
              <RefreshCw className="w-4 h-4" />
              Sincronizar
            </Button>
          </div>
        </header>

        {/* 12 Cards de Métricas Principais */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <StatCard label="Faturamento" value="R$ 12.450,00" change={12.5} icon={DollarSign} trend="up" tooltip="Receita bruta total aprovada e paga." />
          <StatCard label="Investimento" value="R$ 3.640,00" change={4.1} icon={TrendingUp} trend="down" tooltip="Gasto total em anúncios sincronizado." />
          <StatCard label="Lucro" value="R$ 8.810,00" change={15.2} icon={ShoppingBag} trend="up" tooltip="Faturamento - Investimento - Custos." />
          <StatCard label="ROAS" value="3.42x" change={8.2} icon={Target} trend="up" tooltip="Retorno sobre o gasto em anúncios." />
          <StatCard label="CPA" value="R$ 29,35" change={2.5} icon={CreditCard} trend="down" tooltip="Custo por aquisição de venda aprovada." />
          <StatCard label="CPC" value="R$ 0,44" change={1.2} icon={MousePointer2} trend="down" tooltip="Custo médio por clique no anúncio." />
          <StatCard label="CTR" value="3.6%" change={0.5} icon={Percent} trend="up" tooltip="Taxa de cliques em relação às impressões." />
          <StatCard label="CPM" value="R$ 15,20" change={3.1} icon={Eye} trend="up" tooltip="Custo por mil impressões de anúncios." />
          <StatCard label="Compras" value="124" change={10.8} icon={ShoppingBag} trend="up" tooltip="Total de pedidos com status aprovado." />
          <StatCard label="Checkout" value="450" change={5.2} icon={ShoppingCart} trend="up" tooltip="Sessões que iniciaram o pagamento." />
          <StatCard label="PIX Gerado" value="82" change={12.1} icon={Smartphone} trend="up" tooltip="Pagamentos via PIX gerados no checkout." />
          <StatCard label="Taxa Conv." value="3.1%" change={0.2} icon={TrendingUp} trend="up" tooltip="Percentual de visitantes que compram." />
        </section>

        {/* Funil de Conversão e Gráfico Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 glass-card overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/2 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-headline flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Performance Temporal
                </CardTitle>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Faturamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Investimento</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                    <Area type="monotone" dataKey="spend" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorInv)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Funil de Vendas */}
          <Card className="glass-card">
            <CardHeader className="border-b border-white/5 bg-white/2 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-headline">Funil de Atribuição</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {[
                { label: 'Impressões', value: '125.400', rate: '100%' },
                { label: 'Cliques', value: '4.512', rate: '3.6%', sub: '→ CTR' },
                { label: 'Page Views', value: '4.060', rate: '90.1%', sub: '→ Retenção' },
                { label: 'Checkout', value: '450', rate: '11.1%', sub: '→ Iniciado' },
                { label: 'PIX Gerado', value: '82', rate: '18.2%', sub: '→ Gerado' },
                { label: 'Aprovada', value: '124', rate: '3.1%', sub: '→ Final' },
              ].map((step, i, arr) => (
                <div key={i} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black font-headline">{step.value}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-white/10 bg-white/5">{step.rate}</Badge>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full glow-primary transition-all duration-1000",
                        i === 0 ? "bg-primary" : i === 1 ? "bg-indigo-500" : i === 2 ? "bg-purple-500" : i === 3 ? "bg-pink-500" : i === 4 ? "bg-amber-500" : "bg-green-500"
                      )} 
                      style={{ width: step.rate === '100%' ? '100%' : step.rate }} 
                    />
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex justify-center -mb-2 mt-1">
                      <ArrowRight className="w-3 h-3 text-muted-foreground/20 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 mt-4 border-t border-white/5">
                <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                  <div className="flex items-center justify-between text-[10px] font-bold text-primary mb-1">
                    <span>CONVERSÃO GLOBAL</span>
                    <span>3.1%</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-tight italic">
                    Performance acima da média do seu nicho (2.4%).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas de Performance */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          <Card className="glass-card">
            <Tabs defaultValue="campanhas" className="w-full">
              <CardHeader className="border-b border-white/5 bg-white/1 pb-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <TabsList className="bg-muted/50 border border-white/5">
                    <TabsTrigger value="campanhas" className="text-[10px] uppercase font-bold gap-2">
                      <Target className="w-3 h-3" /> Campanhas
                    </TabsTrigger>
                    <TabsTrigger value="criativos" className="text-[10px] uppercase font-bold gap-2">
                      <MonitorPlay className="w-3 h-3" /> Criativos
                    </TabsTrigger>
                    <TabsTrigger value="produtos" className="text-[10px] uppercase font-bold gap-2">
                      <Box className="w-3 h-3" /> Produtos
                    </TabsTrigger>
                  </TabsList>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] border-white/10 gap-2">
                    <LayoutGrid className="w-3 h-3" /> Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <TabsContent value="campanhas" className="m-0">
                  <Table>
                    <TableHeader className="bg-white/2">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase font-bold">Campanha</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-center">Status</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Investimento</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Impressões</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Cliques</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">CTR</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">CPC</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Compras</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">CPA</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">Faturamento</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-right">ROAS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { name: "CBO_ESCALA_BLACK_V1", status: "Ativa", spend: "R$ 1.200", imp: "45.120", cli: "1.250", ctr: "2.7%", cpc: "R$ 0,96", conv: 45, cpa: "R$ 26,66", rev: "R$ 4.500", roas: "3.75x" },
                        { name: "LAL_1%_PURCHASE_90D", status: "Ativa", spend: "R$ 850", imp: "32.400", cli: "980", ctr: "3.0%", cpc: "R$ 0,86", conv: 32, cpa: "R$ 26,56", rev: "R$ 3.200", roas: "3.76x" },
                        { name: "REMARKETING_DPA_7D", status: "Ativa", spend: "R$ 450", imp: "12.800", cli: "650", ctr: "5.1%", cpc: "R$ 0,69", conv: 24, cpa: "R$ 18,75", rev: "R$ 2.400", roas: "5.33x" },
                      ].map((row, i) => (
                        <TableRow key={i} className="border-white/5 hover:bg-white/2 transition-colors">
                          <TableCell className="font-bold text-xs truncate max-w-[180px]">{row.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-500/10 text-green-500 border-none text-[10px] h-5">Ativa</Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs">{row.spend}</TableCell>
                          <TableCell className="text-right text-xs opacity-70">{row.imp}</TableCell>
                          <TableCell className="text-right text-xs opacity-70">{row.cli}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{row.ctr}</TableCell>
                          <TableCell className="text-right text-xs">{row.cpc}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-primary">{row.conv}</TableCell>
                          <TableCell className="text-right text-xs">{row.cpa}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{row.rev}</TableCell>
                          <TableCell className="text-right text-xs font-black text-primary">{row.roas}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                {/* Outras abas seguirão o mesmo padrão... */}
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Origens e Eventos Recentes */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <Card className="xl:col-span-2 glass-card">
            <CardHeader className="border-b border-white/5 bg-white/2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-headline flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Origens de Tráfego
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase font-bold">Fonte</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right">Visitas</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right">Compras</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right">Receita</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { source: 'Facebook Ads', icon: Facebook, val: 8200, conv: 92, rev: 'R$ 8.924', roas: '3.8x', color: 'text-blue-500' },
                    { source: 'Google Ads', icon: Chrome, val: 4100, conv: 35, rev: 'R$ 3.410', roas: '2.9x', color: 'text-orange-500' },
                    { source: 'TikTok Ads', icon: Smartphone, val: 1200, conv: 12, rev: 'R$ 1.150', roas: '2.1x', color: 'text-pink-500' },
                    { source: 'Orgânico', icon: Globe, val: 850, conv: 8, rev: 'R$ 780', roas: 'N/A', color: 'text-green-500' },
                    { source: 'Direto', icon: MousePointer2, val: 420, conv: 5, rev: 'R$ 490', roas: 'N/A', color: 'text-purple-500' },
                  ].map((row, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/2">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <row.icon className={cn("w-4 h-4", row.color)} />
                          <span className="text-xs font-bold">{row.source}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">{row.val}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-primary">{row.conv}</TableCell>
                      <TableCell className="text-right text-xs">{row.rev}</TableCell>
                      <TableCell className="text-right text-xs font-black text-primary">{row.roas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="border-b border-white/5 bg-white/2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-headline">Eventos Recentes</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {eventsLoading ? (
                  [1, 2, 3, 4].map(i => <div key={i} className="h-10 w-full bg-white/5 animate-pulse rounded-lg" />)
                ) : !recentEvents || recentEvents.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-muted-foreground border border-dashed border-white/5 rounded-xl">
                    Aguardando eventos do Pixel...
                  </div>
                ) : (
                  recentEvents.map((event: any) => (
                    <div key={event.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          event.eventType === 'purchase' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : 
                          event.eventType === 'checkout_start' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" :
                          "bg-primary"
                        )} />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-tighter truncate max-w-[120px]">
                            {event.eventType.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">
                            {event.url || 'Sessão Ativa'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono opacity-50 group-hover:opacity-100 transition-opacity">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-6 text-[10px] uppercase font-bold text-primary hover:bg-primary/10">
                Ver Todos os Logs <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
