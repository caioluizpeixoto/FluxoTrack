"use client";

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Info } from 'lucide-react';

interface FunnelProps {
  clicks: number;
  pageViews: number;
  ic: number;
  salesGenerated: number;
  salesApproved: number;
}

export function ConversionFunnel({ clicks, pageViews, ic, salesGenerated, salesApproved }: FunnelProps) {
  const metrics = [
    { label: 'Cliques', count: clicks },
    { label: 'Vis. Página', count: pageViews },
    { label: 'ICs', count: ic },
    { label: 'Vendas Inic.', count: salesGenerated },
    { label: 'Vendas Apr.', count: salesApproved },
  ];
  
  const getPercent = (current: number, prev: number) => {
    if (prev === 0) return "0%";
    return ((current / prev) * 100).toFixed(1).replace('.0', '') + '%';
  };

  const percents = [
    clicks > 0 ? "100%" : "0%",
    getPercent(pageViews, clicks),
    getPercent(ic, pageViews),
    getPercent(salesGenerated, ic),
    getPercent(salesApproved, salesGenerated),
  ];

  return (
    <Card className="bg-[#2a2f3e] border-none overflow-hidden text-white w-full rounded-xl shadow-lg relative">
      <div className="flex justify-between items-center p-4 pb-2">
        <h3 className="font-bold text-slate-100 flex items-center gap-2">Funil de Conversão (Meta Ads)</h3>
        <Info className="w-4 h-4 text-slate-400" />
      </div>
      
      <div className="relative w-full h-[200px] flex px-4 pb-6 mt-2">
         {/* Custom SVG Background for the Funnel Shape */}
         <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none opacity-90 pb-6 pt-10">
            <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 100">
               <defs>
                 <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                   <stop offset="0%" stopColor="#4c4edb" stopOpacity="0.1" />
                   <stop offset="50%" stopColor="#6e3fb5" stopOpacity="0.8" />
                   <stop offset="100%" stopColor="#b52e72" stopOpacity="0.9" />
                 </linearGradient>
               </defs>
               <path d="M 0,48 C 200,48 300,10 500,10 L 1000,10 L 1000,90 L 500,90 C 300,90 200,52 0,52 Z" fill="url(#funnelGrad)" />
               <line x1="0" y1="50" x2="1000" y2="50" stroke="#ffffff15" strokeWidth="1" />
            </svg>
         </div>

         {/* Columns */}
         <div className="w-full flex z-10">
           {metrics.map((m, i) => (
             <div key={i} className="flex-1 flex flex-col justify-between items-center relative">
               <div className="text-sm font-bold text-slate-300 mt-[-10px]">{m.label}</div>
               <div className="text-2xl font-black text-white drop-shadow-md my-auto">
                 {percents[i]}
               </div>
               <div className="text-base font-bold text-slate-200">{m.count.toLocaleString('pt-BR')}</div>
               {i < metrics.length - 1 && (
                 <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/20" />
               )}
             </div>
           ))}
         </div>
      </div>
    </Card>
  );
}

interface HourlySalesProps {
  events: any[];
}

export function HourlySalesChart({ events }: HourlySalesProps) {
  const chartData = useMemo(() => {
    const hours = Array.from({ length: 24 }).map((_, i) => ({
      hourLabel: `${i.toString().padStart(2, '0')}:00`,
      count: 0
    }));

    let total = 0;
    events.forEach(e => {
       if (e.event_type !== 'purchase' || e.status !== 'approved') return;
       const d = new Date(e.created_at);
       const h = d.getHours();
       hours[h].count += 1;
       total += 1;
    });

    return hours.map(h => ({
      ...h,
      percent: total > 0 ? ((h.count / total) * 100).toFixed(1) + '%' : ''
    }));
  }, [events]);

  return (
    <Card className="bg-[#2a2f3e] border-none text-white w-full rounded-xl shadow-lg mt-4 p-4 pb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-100 flex items-center gap-2">Vendas por Horário</h3>
        <Info className="w-4 h-4 text-slate-400" />
      </div>
      <div className="h-[200px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="hourLabel" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
            />
            <Tooltip 
              cursor={{fill: '#ffffff10'}} 
              contentStyle={{ backgroundColor: '#1e2230', borderColor: '#ffffff10', borderRadius: 8, color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="count" fill="#026ae3" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {/* Render percentages manually above bars to match the image precisely.
            Recharts labels can be tricky to position exactly on top without cutting off.
            We will use Customized label for Bar.
         */}
         <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-end pb-8">
            {chartData.map((d, i) => {
               const maxCount = Math.max(...chartData.map(c => c.count));
               const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
               return (
                 <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div style={{ bottom: `${heightPct}%` }} className="relative text-[9px] text-slate-400 mb-1">
                      {d.count > 0 ? d.percent : ''}
                    </div>
                    <div style={{ height: `${heightPct}%` }} />
                 </div>
               )
            })}
         </div>
      </div>
    </Card>
  );
}
