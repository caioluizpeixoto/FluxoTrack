"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Lock, Trophy, Award, Star, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AwardsTrailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRevenue: number;
}

const milestones = [
  {
    id: "100k",
    title: "Primeiros Passos",
    goal: 100000,
    label: "R$ 100k",
    icon: Award,
    color: "from-amber-700 to-amber-900", // Bronze
    textColor: "text-amber-500",
    description: "Sua primeira placa. O começo de uma grande jornada.",
    image: "https://i.ibb.co/5x46qq0J/Chat-GPT-Image-15-de-jun-de-2026-22-38-52.png",
  },
  {
    id: "1m",
    title: "Milionário",
    goal: 1000000,
    label: "R$ 1M",
    icon: Star,
    color: "from-slate-300 to-slate-500", // Prata
    textColor: "text-slate-300",
    description: "Um marco histórico alcançado com consistência.",
    image: "https://i.ibb.co/wrZ6wvxm/Chat-GPT-Image-15-de-jun-de-2026-22-39-55.png",
  },
  {
    id: "5m",
    title: "Lenda",
    goal: 5000000,
    label: "R$ 5M",
    icon: Trophy,
    color: "from-yellow-400 to-yellow-600", // Ouro
    textColor: "text-yellow-400",
    description: "Para os gigantes do mercado digital.",
    image: "https://i.ibb.co/fzcr2X1Y/Chat-GPT-Image-15-de-jun-de-2026-22-41-22.png",
  }
];

export function AwardsTrail({ open, onOpenChange, currentRevenue }: AwardsTrailProps) {
  const nextMilestone = milestones.find(m => currentRevenue < m.goal) || milestones[milestones.length - 1];
  const progressPercentage = Math.min(100, Math.max(0, (currentRevenue / nextMilestone.goal) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0c10] border-white/10 text-white sm:max-w-[1000px] w-[95vw] overflow-hidden p-0 max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 border-b border-white/5 bg-[#0f1115] relative overflow-hidden shrink-0">
          {/* Fundo com brilho dinâmico */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
          
          <DialogHeader className="relative z-10 text-center sm:text-left">
            <DialogTitle className="font-headline text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Minhas Conquistas
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base font-medium mt-1">
              Acompanhe seu faturamento total e desbloqueie suas placas exclusivas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-6 p-5 rounded-2xl bg-[#14151a]/80 backdrop-blur-sm border border-white/10 relative z-10 shadow-lg max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-primary" /> Rumo a {nextMilestone.label}
              </span>
              <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 drop-shadow-sm">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            
            {/* Barra de Progresso Moderna Customizada */}
            <div className="relative h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 via-primary to-cyan-400 transition-all duration-1000 ease-out relative"
                style={{ width: `${progressPercentage}%` }}
              >
                {/* Efeito de brilho animado (shimmer) */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-full">
                  <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 text-xs font-mono font-medium text-slate-400">
              <span className="bg-white/5 px-2 py-1 rounded border border-white/5 text-slate-300">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentRevenue)}
              </span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nextMilestone.goal)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-[#0a0c10]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {milestones.map((milestone) => {
              const isUnlocked = currentRevenue >= milestone.goal;
              const isNext = nextMilestone.id === milestone.id;
              
              return (
                <div 
                  key={milestone.id} 
                  className={cn(
                    "relative flex flex-col p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent transition-all hover:from-white/20 h-full",
                    isNext && "from-primary/40 via-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.15)] -translate-y-1"
                  )}
                >
                  {isNext && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] uppercase tracking-wider animate-pulse z-20 whitespace-nowrap">
                      Próximo Objetivo
                    </div>
                  )}

                  <div className="bg-[#12141a] rounded-[22px] p-4 flex-1 flex flex-col w-full relative z-10 overflow-hidden">
                    {/* Brilho de fundo se estiver desbloqueado */}
                    {isUnlocked && (
                       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-green-500/10 blur-3xl rounded-full"></div>
                    )}

                    {/* Imagem da Placa */}
                    <div className={cn(
                      "w-full aspect-square rounded-xl mb-5 flex items-center justify-center relative overflow-hidden transition-all duration-700 bg-black/50 border border-white/5",
                      !isUnlocked && "opacity-80"
                    )}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={milestone.image} 
                        alt={`Placa ${milestone.label}`} 
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                      
                      {!isUnlocked && (
                        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-xl">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-300">Bloqueado</span>
                        </div>
                      )}
                      
                      {isUnlocked && (
                         <div className="absolute top-3 right-3 bg-green-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-green-500/30 flex items-center gap-1.5 shadow-xl">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-green-400">Conquistado</span>
                        </div>
                      )}
                      
                      {isUnlocked && (
                        <div className="absolute inset-0 ring-2 ring-inset ring-green-500/30 rounded-xl pointer-events-none"></div>
                      )}
                    </div>
                    
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h3 className={cn("text-xl font-bold font-headline leading-tight", milestone.textColor, isUnlocked && "drop-shadow-sm")}>
                          {milestone.title}
                        </h3>
                        <span className="text-xs font-black text-slate-900 bg-white/90 px-3 py-1 rounded-full shadow-lg shrink-0">
                          {milestone.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
