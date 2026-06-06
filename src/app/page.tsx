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
  RefreshCw
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";

const chartData = [
  { name: 'Seg', revenue: 4000, spend: 2400 },
  { name: 'Ter', revenue: 3000, spend: 1398 },
  { name: 'Qua', revenue: 2000, spend: 9800 },
  { name: 'Qui', revenue: 2780, spend: 3908 },
  { name: 'Sex', revenue: 1890, spend: 4800 },
  { name: 'Sab', revenue: 2390, spend: 3800 },
  { name: 'Dom', revenue: 3490, spend: 4300 },
];

const conversionData = [
  { name: 'Page View', value: 12400 },
  { name: 'Click', value: 8200 },
  { name: 'Checkout', value: 1200 },
  { name: 'Compra', value: 450 },
];

const COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const eventsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("timestamp", "desc"),
      limit(5)
    );
  }, [db, user]);

  const { data: recentEvents, loading: eventsLoading } = useCollection(eventsQuery);

  if (!mounted || userLoading) return null;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="p-8 text-center glass-card max-w-md">
          <h2 className="text-2xl font-bold mb-4 font-headline">Bem-vindo ao AdPulse</h2>
          <p className="text-muted-foreground mb-6">Conecte sua conta para começar a rastrear suas conversões e otimizar seu ROAS com IA.</p>
          <Button className="w-full glow-primary py-6 text-lg font-headline">Acessar com Google</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">Visão Geral</h1>
            <p className="text-muted-foreground">Tracking em tempo real e análise de atribuição.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 border-white/10">
              <Calendar className="w-4 h-4" />
              Últimos 7 Dias
            </Button>
            <Button size="sm" className="gap-2 glow-primary">
              <RefreshCw className="w-4 h-4" />
              Sincronizar Dados
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            label="ROAS Total" 
            value="3.42x" 
            change={12.5} 
            icon={TrendingUp} 
            trend="up" 
          />
          <StatCard 
            label="Receita Bruta" 
            value="R$ 12.450,00" 
            change={8.2} 
            icon={DollarSign} 
            trend="up" 
          />
          <StatCard 
            label="Investimento" 
            value="R$ 3.640,00" 
            change={4.1} 
            icon={ShoppingCart} 
            trend="down" 
          />
          <StatCard 
            label="Taxa Conv." 
            value="3.6%" 
            change={0.5} 
            icon={Percent} 
            trend="up" 
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground font-headline">Receita vs Gasto</CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none">Atualizado</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                    <Area type="monotone" dataKey="spend" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground font-headline">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {conversionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline">Eventos Recentes</CardTitle>
                <p className="text-xs text-muted-foreground">Últimas atividades capturadas via Pixel</p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">Ver Todos</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventsLoading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-white/5 animate-pulse rounded-lg" />)}
                  </div>
                ) : recentEvents?.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum evento detectado. Instale o script de tracking no seu site.</p>
                  </div>
                ) : (
                  recentEvents?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium capitalize">{item.eventType.replace('_', ' ')}</span>
                          <span className="text-[10px] text-muted-foreground uppercase truncate max-w-[200px]">{item.url || 'Página Interna'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '--:--'}</div>
                      </div>
                    </div>
                  ))
                )}
                {(!recentEvents || recentEvents.length === 0) && !eventsLoading && (
                   <div className="opacity-50">
                     {[
                       { event: "Checkout Iniciado", time: "2 min atrás", url: "/checkout-v1" },
                       { event: "Visualização de Página", time: "15 min atrás", url: "/home" },
                     ].map((item, i) => (
                       <div key={i} className="flex items-center justify-between p-3 border-b border-white/5 last:border-none">
                         <div className="flex flex-col">
                            <span className="text-sm">{item.event}</span>
                            <span className="text-[10px] text-muted-foreground">{item.url}</span>
                         </div>
                         <span className="text-xs text-muted-foreground">{item.time}</span>
                       </div>
                     ))}
                   </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card overflow-hidden relative border-accent/20">
            <div className="absolute top-0 right-0 p-4">
              <Sparkles className="w-6 h-6 text-accent animate-pulse" />
            </div>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">AI Path Mapping</CardTitle>
              <p className="text-sm text-muted-foreground">Resolvendo vendas órfãs com inteligência artificial</p>
            </CardHeader>
            <CardContent>
              <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6 mb-6">
                <p className="text-sm italic text-accent-foreground/90 leading-relaxed font-medium">
                  "Detectamos um padrão de IP recorrente em 12 vendas sem origem. A IA sugere 85% de probabilidade de virem da campanha 'Escala_Nativa_01'."
                </p>
              </div>
              <div className="space-y-3">
                <Button className="w-full justify-between bg-accent/20 hover:bg-accent/30 text-accent-foreground border border-accent/30 font-headline h-14 rounded-xl px-6 group">
                  <span>Re-atribuir Pedido #9821</span>
                  <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground font-headline h-14 rounded-xl px-6">
                  <span>Ver Relatório Completo</span>
                  <ArrowUpRight className="w-5 h-5 opacity-50" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
