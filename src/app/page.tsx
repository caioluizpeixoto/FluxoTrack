"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { StatCard } from "@/components/dashboard/stat-card";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Percent, 
  ShoppingCart, 
  ArrowUpRight,
  Filter,
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

  // Busca eventos recentes do usuário
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
        <Card className="p-8 text-center glass-card">
          <h2 className="text-2xl font-bold mb-4">Bem-vindo ao AdPulse</h2>
          <p className="text-muted-foreground mb-6">Por favor, faça login para acessar seu dashboard.</p>
          <Button className="glow-primary">Acessar Conta</Button>
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
            <p className="text-muted-foreground">Tracking em tempo real e análise de ROAS.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              Últimos 7 Dias
            </Button>
            <Button size="sm" className="gap-2 glow-primary">
              <RefreshCw className="w-4 h-4" />
              Sincronizar
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
              <Badge variant="secondary" className="bg-primary/10 text-primary">Sincronizado</Badge>
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
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff' }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="spend" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorSpend)" />
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
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff' }} />
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
                <p className="text-xs text-muted-foreground">Últimas atividades capturadas</p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">Ver Todos</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventsLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando eventos...</p>
                ) : recentEvents?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento detectado ainda.</p>
                ) : (
                  recentEvents?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.eventType}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{item.url || 'Página Interna'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                )}
                {/* Fallback mockup para visualização se não houver dados reais */}
                {(!recentEvents || recentEvents.length === 0) && !eventsLoading && (
                   <div className="opacity-50">
                     {[
                       { event: "Compra Aprovada", time: "2 min atrás", value: "R$ 49,00" },
                       { event: "PIX Gerado", time: "15 min atrás", value: "R$ 120,00" },
                     ].map((item, i) => (
                       <div key={i} className="flex items-center justify-between p-3">
                         <span className="text-sm">{item.event}</span>
                         <span className="text-xs">{item.time}</span>
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
              <p className="text-sm text-muted-foreground">Mapeando vendas "órfãs" para campanhas</p>
            </CardHeader>
            <CardContent>
              <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 mb-4">
                <p className="text-sm italic text-accent-foreground/80 leading-relaxed">
                  "Identificamos 12 conversões sem origem nas últimas 24h. A IA sugere atribuição de 85% para a campanha 'Retargeting Black Friday' baseada em padrão de IP."
                </p>
              </div>
              <div className="space-y-3">
                <Button className="w-full justify-between bg-accent/20 hover:bg-accent/30 text-accent-foreground border border-accent/30 font-headline h-12">
                  <span>Re-atribuir #ORD-9821</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
                <Button className="w-full justify-between bg-accent/20 hover:bg-accent/30 text-accent-foreground border border-accent/30 font-headline h-12">
                  <span>Análise de Caminho Completa</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
