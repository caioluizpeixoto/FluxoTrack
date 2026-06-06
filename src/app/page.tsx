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
import { useState, useEffect } from "react";

const chartData = [
  { name: 'Mon', revenue: 4000, spend: 2400 },
  { name: 'Tue', revenue: 3000, spend: 1398 },
  { name: 'Wed', revenue: 2000, spend: 9800 },
  { name: 'Thu', revenue: 2780, spend: 3908 },
  { name: 'Fri', revenue: 1890, spend: 4800 },
  { name: 'Sat', revenue: 2390, spend: 3800 },
  { name: 'Sun', revenue: 3490, spend: 4300 },
];

const conversionData = [
  { name: 'Page View', value: 12400 },
  { name: 'Button Click', value: 8200 },
  { name: 'Checkout Start', value: 1200 },
  { name: 'Purchase', value: 450 },
];

const COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">Marketing Overview</h1>
            <p className="text-muted-foreground">Real-time tracking and ROAS analytics.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button size="sm" className="gap-2 glow-primary">
              <RefreshCw className="w-4 h-4" />
              Sync Data
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            label="Total ROAS" 
            value="3.42x" 
            change={12.5} 
            icon={TrendingUp} 
            trend="up" 
          />
          <StatCard 
            label="Gross Revenue" 
            value="$12,450.00" 
            change={8.2} 
            icon={DollarSign} 
            trend="up" 
          />
          <StatCard 
            label="Total Spend" 
            value="$3,640.00" 
            change={4.1} 
            icon={ShoppingCart} 
            trend="down" 
          />
          <StatCard 
            label="Conv. Rate" 
            value="3.6%" 
            change={0.5} 
            icon={Percent} 
            trend="up" 
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground font-headline">Revenue vs Spend</CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary">Live Syncing</Badge>
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
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `$${value}`} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="spend" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground font-headline">Funnel Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      width={100}
                    />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff' }}
                    />
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
                <CardTitle className="font-headline">Recent Events</CardTitle>
                <p className="text-xs text-muted-foreground">Latest visitor sessions and activities</p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { event: "Purchase Approved", user: "id_9421", time: "2 mins ago", value: "$49.00", platform: "CartPanda" },
                  { event: "PIX Generated", user: "id_1023", time: "15 mins ago", value: "$120.00", platform: "Kiwify" },
                  { event: "Checkout Start", user: "id_8821", time: "45 mins ago", value: "-", platform: "Direct" },
                  { event: "Page View", user: "id_5502", time: "1 hour ago", value: "-", platform: "Meta Ads" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        item.event === "Purchase Approved" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-primary"
                      )} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.event}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{item.platform} • {item.user}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-headline">{item.value}</div>
                      <div className="text-[10px] text-muted-foreground">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card overflow-hidden relative border-accent/20">
            <div className="absolute top-0 right-0 p-4">
              <Sparkles className="w-6 h-6 text-accent animate-pulse" />
            </div>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                AI Path Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">Mapping orphan conversions to campaigns</p>
            </CardHeader>
            <CardContent>
              <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 mb-4">
                <p className="text-sm italic text-accent-foreground/80 leading-relaxed">
                  "Found 12 orphan conversions from last 24h. Suggested attribution: 85% confidence mapping to 'Black Friday Retargeting' campaign based on browser fingerprinting and session proximity."
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground uppercase tracking-widest font-bold">Recommended Actions</span>
                  <Badge variant="outline" className="text-[10px] border-accent/50 text-accent">AI SUGGESTION</Badge>
                </div>
                <Button className="w-full justify-between bg-accent/20 hover:bg-accent/30 text-accent-foreground border border-accent/30 font-headline h-12">
                  <span>Re-attribute #ORD-9821</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
                <Button className="w-full justify-between bg-accent/20 hover:bg-accent/30 text-accent-foreground border border-accent/30 font-headline h-12">
                  <span>Re-attribute #ORD-9844</span>
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
