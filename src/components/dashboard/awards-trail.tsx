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
      <DialogContent className="bg-[#0a0c10] border-white/10 text-white sm:max-w-2xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 border-b border-white/5 bg-[#0f1115] relative overflow-hidden">
          {/* Fundo com brilho dinâmico */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="font-headline text-3xl flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" /> Trilha de Premiações
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Acompanhe seu faturamento total e desbloqueie placas exclusivas do FluxoFy.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-6 p-5 rounded-2xl bg-[#14151a] border border-white/10 relative z-10 shadow-lg shadow-black/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-primary" /> Rumo a {nextMilestone.label}
              </span>
              <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 drop-shadow-sm">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            
            {/* Barra de Progresso Moderna Customizada */}
            <div className="relative h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
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

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-white/10 before:to-transparent">
            {milestones.map((milestone, index) => {
              const isUnlocked = currentRevenue >= milestone.goal;
              const isNext = nextMilestone.id === milestone.id;
              
              return (
                <div key={milestone.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Ícone central / Marcador da linha do tempo */}
                  <div className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full border-4 shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all duration-500",
                    isUnlocked ? "bg-[#0a0c10] border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" : 
                    isNext ? "bg-[#0a0c10] border-primary shadow-[0_0_20px_rgba(var(--primary),0.6)] scale-110" : "bg-[#0a0c10] border-white/10 opacity-50"
                  )}>
                    {isUnlocked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,1)]" />
                    ) : isNext ? (
                      <ArrowUp className="w-5 h-5 text-primary animate-bounce drop-shadow-[0_0_8px_rgba(var(--primary),1)]" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  
                  {/* Card do Milestone */}
                  <div className={cn(
                    "w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent transition-all hover:from-white/20 relative",
                    isNext && "from-primary/30 via-white/5 shadow-[0_0_30px_rgba(var(--primary),0.15)]"
                  )}>
                    <div className="bg-[#12141a] rounded-[22px] p-4 h-full w-full">
                      {/* Imagem da Placa */}
                      <div className={cn(
                        "w-full h-40 md:h-48 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden transition-all duration-700",
                        !isUnlocked && "opacity-40 grayscale sepia-[0.3]"
                      )}>
                        {/* Imagem Oficial da Placa */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={milestone.image} 
                          alt={`Placa ${milestone.label}`} 
                          className="w-full h-full object-cover rounded-xl transition-transform duration-700 hover:scale-110"
                        />
                        
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center border border-white/10 rounded-xl">
                            <Lock className="w-10 h-10 text-white/50 mb-2 drop-shadow-lg" />
                            <span className="text-xs uppercase tracking-widest font-black text-white/70">Bloqueado</span>
                          </div>
                        )}
                        
                        {isUnlocked && (
                          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-xl pointer-events-none"></div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={cn("text-xl md:text-2xl font-bold font-headline", milestone.textColor, isUnlocked && "drop-shadow-sm")}>{milestone.title}</h3>
                        <span className="text-sm font-black text-slate-900 bg-white/90 px-3 py-1 rounded-full shadow-lg">{milestone.label}</span>
                      </div>
                      <p className="text-sm text-slate-400 font-medium">{milestone.description}</p>
                      
                      {isNext && (
                        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-primary to-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] uppercase tracking-wider animate-pulse">
                          Próximo Objetivo
                        </div>
                      )}
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
