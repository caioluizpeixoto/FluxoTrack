"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, change, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("p-6 glass-card hover:border-primary/50 transition-colors", className)}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-headline">{label}</span>
          <h3 className="text-2xl font-bold font-headline">{value}</h3>
        </div>
        <div className="p-3 rounded-xl bg-primary/10 text-primary glow-primary">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            trend === "up" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
            {trend === "up" ? "+" : "-"}{Math.abs(change)}%
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </div>
      )}
    </Card>
  );
}
