"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Lock, Trophy, Award, Star, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

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
  }
];

export function AwardsTrail({ open, onOpenChange, currentRevenue }: AwardsTrailProps) {
  // Encontrar o próximo objetivo
  const nextMilestone = milestones.find(m => currentRevenue < m.goal) || milestones[milestones.length - 1];
  const progressPercentage = Math.min(100, Math.max(0, (currentRevenue / nextMilestone.goal) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0c10] border-white/10 text-white sm:max-w-2xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 border-b border-white/5 bg-[#0f1115]">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" /> Trilha de Premiações
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Acompanhe seu faturamento e desbloqueie placas exclusivas do FluxoFy.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-300">Progresso para {nextMilestone.label}</span>
              <span className="text-sm font-bold text-primary">{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3 bg-white/10" />
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentRevenue)}</span>
              <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nextMilestone.goal)}</span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-white/20 before:to-transparent">
            {milestones.map((milestone, index) => {
              const isUnlocked = currentRevenue >= milestone.goal;
              const isNext = nextMilestone.id === milestone.id;
              
              return (
                <div key={milestone.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Ícone central / Marcador da linha do tempo */}
                  <div className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full border-4 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors",
                    isUnlocked ? "bg-[#0a0c10] border-green-500 shadow-green-500/20" : 
                    isNext ? "bg-[#0a0c10] border-primary shadow-primary/20" : "bg-[#0a0c10] border-white/10"
                  )}>
                    {isUnlocked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isNext ? (
                      <ArrowUp className="w-5 h-5 text-primary animate-bounce" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  
                  {/* Card do Milestone */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-2xl bg-[#14151a] border border-white/5 transition-all hover:bg-white/5 relative">
                    {/* Placeholder da Foto da Placa */}
                    <div className={cn(
                      "w-full h-32 md:h-40 rounded-xl mb-4 flex items-center justify-center border-2 border-dashed relative overflow-hidden",
                      isUnlocked ? `border-white/20 bg-gradient-to-br ${milestone.color} opacity-90` : "border-white/10 bg-black/20"
                    )}>
                      {isUnlocked ? (
                        <div className="text-center drop-shadow-lg flex flex-col items-center">
                          <milestone.icon className={cn("w-12 h-12 mb-2 drop-shadow-lg text-white")} />
                          <span className="font-bold text-white uppercase tracking-widest text-sm">Placa Desbloqueada</span>
                          <span className="text-[10px] text-white/70 mt-1">(Envie a foto real da placa depois)</span>
                        </div>
                      ) : (
                        <div className="text-center opacity-40 flex flex-col items-center">
                          <Lock className="w-8 h-8 mb-2" />
                          <span className="text-xs uppercase tracking-widest font-semibold">Bloqueado</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={cn("text-xl font-bold font-headline", milestone.textColor)}>{milestone.title}</h3>
                      <span className="text-sm font-mono font-bold bg-white/10 px-2 py-1 rounded-md">{milestone.label}</span>
                    </div>
                    <p className="text-sm text-slate-400">{milestone.description}</p>
                    
                    {isNext && (
                      <div className="absolute -top-3 -right-3 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider animate-pulse">
                        Próximo Objetivo
                      </div>
                    )}
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
