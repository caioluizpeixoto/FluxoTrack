"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  Sparkles, 
  Target, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  BarChart2
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useState } from "react";
import { metaAdsPerformanceSummary, type MetaAdsPerformanceSummaryOutput } from "@/ai/flows/meta-ads-performance-summary";

export default function MetaAdsPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<MetaAdsPerformanceSummaryOutput | null>(null);

  const handleAiAnalyze = async () => {
    setLoading(true);
    try {
      const result = await metaAdsPerformanceSummary({
        dateRange: "Last 7 Days",
        campaigns: [
          {
            id: "camp_1",
            name: "Summer Sale 2024",
            spend: 1200,
            impressions: 45000,
            clicks: 1200,
            ctr: 2.6,
            cpc: 1.0,
            cpm: 26.6,
            conversions: 45,
            cpa: 26.6,
            adSets: []
          }
        ]
      });
      setSummary(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">Meta Ads Integration</h1>
            <p className="text-muted-foreground">Automated campaign syncing and AI performance analysis.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleAiAnalyze} disabled={loading} className="gap-2 bg-accent hover:bg-accent/90 glow-accent">
              <Sparkles className={cn("w-4 h-4", loading && "animate-spin")} />
              AI Performance Summary
            </Button>
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
              <RefreshCw className="w-4 h-4" />
              Force Sync
            </Button>
          </div>
        </header>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="glass-card border-accent/20">
              <CardHeader className="flex flex-row items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <CardTitle className="font-headline">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed mb-4 text-accent-foreground/90">{summary.overallSummary}</p>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Key Trends</h4>
                  {summary.keyTrends.map((trend, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      {trend}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-destructive/20">
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <CardTitle className="font-headline">Anomalies Detected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.anomalies.map((anomaly, i) => (
                    <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase text-destructive">{anomaly.type.replace('_', ' ')}</span>
                        <Badge variant="outline" className="text-[10px] border-destructive/50">{anomaly.entityType}</Badge>
                      </div>
                      <p className="text-sm font-medium mb-1">{anomaly.entityName}</p>
                      <p className="text-xs text-muted-foreground italic">{anomaly.insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[300px]">Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Scale_Main_Offer_01", status: "Active", spend: "$4,200", roas: "4.2x", ctr: "3.2%", conv: 124 },
                  { name: "Retargeting_LAL_90D", status: "Active", spend: "$850", roas: "6.8x", ctr: "5.5%", conv: 82 },
                  { name: "Testing_Creatives_V3", status: "Active", spend: "$1,100", roas: "1.2x", ctr: "1.1%", conv: 12 },
                  { name: "International_Prospecting", status: "Paused", spend: "$0", roas: "0.0x", ctr: "0.0%", conv: 0 },
                ].map((row, i) => (
                  <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium font-headline">{row.name}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        row.status === "Active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground",
                        "border-none"
                      )}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.spend}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{row.roas}</TableCell>
                    <TableCell className="text-right">{row.ctr}</TableCell>
                    <TableCell className="text-right">{row.conv}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { cn } from "@/lib/utils";
