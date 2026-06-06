
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { 
  Filter, 
  ArrowDown, 
  Users, 
  MousePointer2, 
  ShoppingCart, 
  CheckCircle2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const funnelData = [
  { stage: 'Visualizações', value: 12400, color: 'hsl(var(--primary))' },
  { stage: 'Cliques', value: 8200, color: 'hsl(var(--chart-2))' },
  { stage: 'Checkout', value: 1200, color: 'hsl(var(--chart-3))' },
  { stage: 'Vendas', value: 450, color: 'hsl(var(--chart-5))' },
];

export default function FunnelsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">Funis de Conversão</h1>
            <p className="text-muted-foreground">Análise visual da jornada do cliente e taxas de abandono.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">Todos os Canais</Badge>
            <Badge variant="outline" className="border-white/10">Últimos 30 Dias</Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Visitantes Únicos', value: '12.4k', icon: Users, color: 'text-blue-500' },
            { label: 'Cliques no Link', value: '8.2k', icon: MousePointer2, color: 'text-indigo-500' },
            { label: 'Checkouts Iniciados', value: '1.2k', icon: ShoppingCart, color: 'text-purple-500' },
            { label: 'Vendas Aprovadas', value: '450', icon: CheckCircle2, color: 'text-green-500' },
          ].map((stat, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-xs font-bold text-muted-foreground uppercase">Etapa {i + 1}</span>
                </div>
                <div className="text-2xl font-bold font-headline">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <Card className="xl:col-span-2 glass-card">
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Visualização do Funil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="stage" 
                      type="category" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      width={100} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }} 
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={50}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList dataKey="value" position="right" fill="#fff" fontSize={12} className="font-bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Taxas de Conversão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { from: 'Página', to: 'Clique', rate: '66.1%', color: 'bg-blue-500' },
                { from: 'Clique', to: 'Checkout', rate: '14.6%', color: 'bg-indigo-500' },
                { from: 'Checkout', to: 'Venda', rate: '37.5%', color: 'bg-purple-500' },
              ].map((conv, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{conv.from} → {conv.to}</span>
                    <span className="text-lg font-bold font-headline">{conv.rate}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${conv.color} glow-primary`} style={{ width: conv.rate }} />
                  </div>
                  {i < 2 && (
                    <div className="flex justify-center my-2">
                      <ArrowDown className="w-4 h-4 text-muted-foreground opacity-30" />
                    </div>
                  )}
                </div>
              ))}
              
              <div className="pt-6 border-t border-white/5">
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                  <h4 className="text-sm font-bold font-headline text-primary mb-1">Insight do Funil</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sua maior perda está entre "Clique" e "Checkout". Considere otimizar o tempo de carregamento da sua página de destino.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
