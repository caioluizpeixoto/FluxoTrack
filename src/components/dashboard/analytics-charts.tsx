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
  
  const getPercent = (current: number, base: number) => {
    if (base <= 0) return "0%";
    return ((current / base) * 100).toFixed(1).replace('.0', '') + '%';
  };

  const percents = [
    clicks > 0 ? "100%" : "0%",
    getPercent(pageViews, clicks),
    getPercent(ic, clicks > 0 ? clicks : pageViews),
    getPercent(salesGenerated, clicks > 0 ? clicks : pageViews),
    getPercent(salesApproved, clicks > 0 ? clicks : pageViews),
  ];

  return (
    <Card className="bg-[#2a2f3e] border-none overflow-hidden text-white w-full rounded-xl shadow-lg relative">
      <div className="flex justify-between items-center p-4 pb-2">
        <h3 className="font-bold text-slate-100 flex items-center gap-2">Funil de Conversão (Meta Ads)</h3>
        <Info className="w-4 h-4 text-slate-400" />
      </div>
      
      <div className="overflow-x-auto pb-2">
        <div className="relative min-w-[550px] lg:w-full h-[200px] flex px-2 sm:px-4 pb-6 mt-2">
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
               {(() => {
                 const maxCount = Math.max(...metrics.map(m => m.count), 1);
                 const points = metrics.map((m, i) => {
                   const ratio = m.count / maxCount;
                   const height = Math.max(ratio * 100, 4); // minimum height of 4
                   return { x: 100 + i * 200, top: 50 - height / 2, bottom: 50 + height / 2 };
                 });

                 const pathD = `
                   M 0,${points[0].top}
                   L ${points[0].x},${points[0].top}
                   C ${points[0].x + 100},${points[0].top} ${points[1].x - 100},${points[1].top} ${points[1].x},${points[1].top}
                   C ${points[1].x + 100},${points[1].top} ${points[2].x - 100},${points[2].top} ${points[2].x},${points[2].top}
                   C ${points[2].x + 100},${points[2].top} ${points[3].x - 100},${points[3].top} ${points[3].x},${points[3].top}
                   C ${points[3].x + 100},${points[3].top} ${points[4].x - 100},${points[4].top} ${points[4].x},${points[4].top}
                   L 1000,${points[4].top}
                   L 1000,${points[4].bottom}
                   L ${points[4].x},${points[4].bottom}
                   C ${points[4].x - 100},${points[4].bottom} ${points[3].x + 100},${points[3].bottom} ${points[3].x},${points[3].bottom}
                   C ${points[3].x - 100},${points[3].bottom} ${points[2].x + 100},${points[2].bottom} ${points[2].x},${points[2].bottom}
                   C ${points[2].x - 100},${points[2].bottom} ${points[1].x + 100},${points[1].bottom} ${points[1].x},${points[1].bottom}
                   C ${points[1].x - 100},${points[1].bottom} ${points[0].x + 100},${points[0].bottom} ${points[0].x},${points[0].bottom}
                   L 0,${points[0].bottom}
                   Z
                 `.replace(/\s+/g, ' ').trim();

                 return <path d={pathD} fill="url(#funnelGrad)" />;
               })()}
               <line x1="0" y1="50" x2="1000" y2="50" stroke="#ffffff15" strokeWidth="1" />
            </svg>
         </div>

         {/* Columns */}
         <div className="w-full flex z-10">
           {metrics.map((m, i) => (
             <div key={i} className="flex-1 flex flex-col justify-between items-center relative px-1">
               <div className="text-[10px] sm:text-xs md:text-sm font-bold text-slate-300 mt-[-10px] text-center leading-tight min-h-[32px] flex items-center">{m.label}</div>
               <div className="text-base sm:text-xl md:text-2xl font-black text-white drop-shadow-md my-auto">
                 {percents[i]}
               </div>
               <div className="text-[11px] sm:text-sm md:text-base font-bold text-slate-200">{m.count.toLocaleString('pt-BR')}</div>
               {i < metrics.length - 1 && (
                 <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/20" />
               )}
             </div>
           ))}
         </div>
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
       let dateStr = e.created_at;
       if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/) && !dateStr.includes('Z')) {
         dateStr = dateStr.replace(' ', 'T');
         if (!dateStr.includes('T')) dateStr += 'T00:00:00';
         dateStr += 'Z';
       }
       
       const d = new Date(dateStr);
       const h = d.getHours();
       hours[h].count += 1;
       total += 1;
    });

    return hours.filter(h => h.count > 0).sort((a, b) => b.count - a.count).map(h => ({
      ...h,
      percent: total > 0 ? ((h.count / total) * 100).toFixed(1) + '%' : '0%'
    }));
  }, [events]);

  if (chartData.length === 0) {
    return (
      <Card className="bg-[#1a1c23] border-white/5 w-full rounded-xl p-4">
        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
          <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Picos de Venda por Horário</h3>
        </div>
        <div className="text-center py-4 text-sm text-slate-500">Nenhuma venda aprovada neste período.</div>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1c23] border-white/5 w-full rounded-xl p-4">
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
        <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Picos de Venda por Horário</h3>
      </div>
      <div className="space-y-3">
        {chartData.map((d, i) => (
          <div key={i} className="flex justify-between items-center bg-[#0f1115] p-3 rounded-lg border border-white/5 relative overflow-hidden">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-primary/10 border-l-2 border-primary" 
              style={{ width: `${Math.max(Number(d.percent.replace('%', '')), 2)}%` }}
            />
            <div className="relative z-10 flex items-center gap-3">
              <span className="font-mono font-bold text-slate-300">{d.hourLabel}</span>
            </div>
            <div className="relative z-10 flex items-center gap-4 text-sm">
              <span className="font-bold text-slate-200">{d.count} venda{d.count > 1 ? 's' : ''}</span>
              <span className="text-xs font-medium text-slate-500 w-12 text-right">{d.percent}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
