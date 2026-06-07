
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { StatCard } from "@/components/dashboard/stat-card";
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  ShoppingCart, 
  Target, 
  MousePointer2, 
  Eye, 
  CreditCard, 
  ShoppingBag, 
  Smartphone,
  RefreshCw,
  Pencil,
  Info,
  LayoutGrid,
  Menu,
  ArrowRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { cn } from "@/lib/utils";

const allMetrics = [
  { id: 'revenue', label: 'Faturamento', icon: DollarSign, tooltip: "Soma de todas as vendas aprovadas." },
            <CardContent className="pt-6 flex-1 flex flex-col justify-between">
              {[
                { label: 'Impressões', val: stats.impressions, color: 'bg-muted' },
                { label: 'Cliques', val: stats.clicks, color: 'bg-primary/40' },
                { label: 'Visitas', val: stats.pageViews, color: 'bg-primary/60' },
                { label: 'Checkout', val: stats.checkouts, color: 'bg-primary/80' },
                { label: 'PIX Gerado', val: stats.pixs, color: 'bg-accent' },
                { label: 'Compras', val: stats.sales, color: 'bg-green-500' },
              ].map((step, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{step.label}</span>
                    <span className="text-xs font-black font-headline">{step.val.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden flex items-center">
                    <div 
                      className={cn("h-full transition-all duration-1000 rounded-full", step.color)}
                      style={{ width: `${Math.min(100, (step.val / (stats.impressions || 1)) * 100)}%` }} 
                    />
                  </div>
                  {i < 5 && (
                    <div className="flex justify-center -mb-2">
                       <ArrowRight className="w-3 h-3 text-muted-foreground rotate-90 opacity-20" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

