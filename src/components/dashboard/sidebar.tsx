"use client";

import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  MousePointer2, 
  Target, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  Webhook, 
  Zap,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Tracking Events", icon: MousePointer2, href: "/events" },
  { label: "Meta Ads Sync", icon: Target, href: "/meta-ads" },
  { label: "AI Insights", icon: Sparkles, href: "/ai-insights" },
  { label: "Funnels", icon: BarChart3, href: "/funnels" },
  { label: "Webhooks", icon: Webhook, href: "/webhooks" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-background border-r border-border/50 w-64 fixed left-0 top-0 z-30">
      <div className="p-6">
        <div className="flex items-center gap-2 text-primary">
          <Zap className="w-8 h-8 fill-current glow-primary" />
          <span className="text-xl font-bold font-headline tracking-tighter">AdPulse</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
              pathname === item.href 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              pathname === item.href ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <ShieldCheck className="w-5 h-5 text-accent" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-accent font-headline">PRO PLAN</span>
            <span className="text-[10px] text-muted-foreground">Active for this project</span>
          </div>
        </div>
      </div>
    </div>
  );
}
