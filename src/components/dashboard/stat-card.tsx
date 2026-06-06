
"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, HelpCircle } from "lucide-react";
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
  comparisonLabel?: string;
}

export function StatCard({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  trend, 
  tooltip,
  className,
  comparisonLabel = "vs período anterior"
}: StatCardProps) {
  return (
    <Card className={cn("p-5 glass-card hover:border-primary/50 transition-all group", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-headline">{label}</span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/50 cursor-help hover:text-muted-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border-white/10 text-xs max-w-[200px]">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold font-headline tracking-tight">{value}</h3>
        
        {change !== undefined && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
              trend === "up" ? "bg-green-500/10 text-green-500" : 
              trend === "down" ? "bg-red-500/10 text-red-500" : 
              "bg-muted text-muted-foreground"
            )}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : ""}
              {Math.abs(change)}%
            </span>
            <span className="text-[10px] text-muted-foreground font-medium italic">
              {comparisonLabel}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
