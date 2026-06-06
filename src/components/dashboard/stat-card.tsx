
"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  tooltip?: string;
  className?: string;
}

export function StatCard({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  trend, 
  tooltip,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-6 bg-[#121212] border-none rounded-2xl flex flex-col justify-between group relative overflow-hidden", className)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground/40 cursor-help hover:text-white transition-colors" />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1a1a1a] border-white/10 text-xs">
              <p>{tooltip || `Métrica de ${label}`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold font-headline tracking-tight text-white">{value}</h3>
        
        {change !== undefined && change !== 0 && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
              trend === "up" ? "text-green-500" : 
              trend === "down" ? "text-red-500" : 
              "text-muted-foreground"
            )}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : ""}
              {Math.abs(change)}%
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              vs período anterior
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
