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
  ChevronDown,
  LayoutGrid,
  Menu
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
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
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

const allMetrics = [
  { id: 'revenue', label: 'Faturamento', icon: DollarSign },
  { id: 'spend', label: 'Investimento', icon: TrendingUp },
  { id: 'profit', label: 'Lucro', icon: ShoppingBag },
  { id: 'roas', label: 'ROAS', icon: Target },
  { id: 'cpa', label: 'CPA', icon: CreditCard },
  { id: 'cpc', label: 'CPC', icon: MousePointer2 },
  { id: 'ctr', label: 'CTR', icon: Percent },
  { id: 'cpm', label: 'CPM', icon: Eye },
  { id: 'purchases', label: 'Compras', icon: ShoppingBag },
  { id: 'checkout', label: 'Checkout Iniciado', icon: ShoppingCart },
  { id: 'pix', label: 'PIX Gerado', icon: Smartphone },
  { id: 'conv_rate', label: 'Taxa de Conversão', icon: TrendingUp },
];

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(allMetrics.map(m => m.id));

  useEffect(() => {
    setMounted(true);
  }, []);

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
        {/* Top Header - Estilo UTMify */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-green-400">💚</span>
            <span className="font-headline font-bold text-sm lg:text-base">Projeto A ✝️ G...</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-white/5">
                  <Pencil className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#121212] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="font-headline">Personalizar Métricas</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {allMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-3">
                      <Checkbox 
                        id={metric.id} 
                        checked={visibleMetrics.includes(metric.id)}
                        onCheckedChange={() => toggleMetric(metric.id)}
                        className="border-white/20 data-[state=checked]:bg-blue-600"
                      />
                      <label htmlFor={metric.id} className="text-sm font-medium leading-none cursor-pointer">
                        {metric.label}
                      </label>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" className="hover:bg-white/5">
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Card Resumo com Filtros */}
        <Card className="bg-[#121212] border-none rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold font-headline mb-1">Resumo</h2>
              <p className="text-muted-foreground text-xs">Atualizado agora mesmo</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-lg h-12">
              Atualizar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Período de visualização', value: 'Hoje' },
              { label: 'Conta de anúncio', value: 'Todas' },
              { label: 'Plataformas', value: 'Qualquer' },
              { label: 'Produtos', value: 'Qualquer' },
              { label: 'Fonte de tráfego', value: 'Qualquer' },
            ].map((filter, i) => (
              <div key={i} className={cn("space-y-2", i === 4 && "lg:col-span-1")}>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{filter.label}</span>
                  {i === 0 && <Info className="w-3 h-3 text-muted-foreground/50" />}
                </div>
                <div className="flex items-center justify-between bg-transparent border border-white/20 rounded-xl px-4 h-14 cursor-pointer hover:border-white/40 transition-colors">
                  <span className="text-sm font-medium">{filter.value}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Métricas Dinâmicas */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {allMetrics.filter(m => visibleMetrics.includes(m.id)).map((metric) => (
            <StatCard 
              key={metric.id}
              label={metric.label} 
              value={metric.id.includes('revenue') || metric.id.includes('spend') || metric.id.includes('profit') ? "R$ 0,00" : "0"} 
              change={0}
              icon={metric.icon}
              trend="neutral"
              className="bg-[#121212] border-none rounded-2xl h-32"
            />
          ))}
        </section>

        {/* Funil e Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 bg-[#121212] border-none rounded-2xl overflow-hidden">
             <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground font-headline flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Performance Temporal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '12px', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#121212] border-none rounded-2xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground font-headline">Funil de Atribuição</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {[
                { label: 'Impressões', value: '0', rate: '100%' },
                { label: 'Cliques', value: '0', rate: '0%', sub: '→ CTR' },
                { label: 'Page Views', value: '0', rate: '0%', sub: '→ Retenção' },
                { label: 'Checkout', value: '0', rate: '0%', sub: '→ Iniciado' },
                { label: 'PIX Gerado', value: '0', rate: '0%', sub: '→ Gerado' },
                { label: 'Aprovada', value: '0', rate: '0%', sub: '→ Final' },
              ].map((step, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{step.label}</span>
                    <span className="text-xs font-black font-headline">{step.value} ({step.rate})</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-0 transition-all duration-1000" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Simplificada conforme solicitado (Foco Facebook Ads) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#121212] border-t border-white/5 flex items-center justify-around z-50 px-4">
        {/* Barra limpa conforme solicitado, apenas ícones de sistema básicos se necessário ou nada */}
        <Button variant="ghost" size="icon" className="text-blue-500">
          <LayoutGrid className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Menu className="w-6 h-6" />
        </Button>
      </nav>
    </div>
  );
}
