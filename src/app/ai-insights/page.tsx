"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  HelpCircle, 
  History, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { aiAttributionSuggestions, type AttributionSuggestionsOutput } from "@/ai/flows/ai-attribution-suggestions";

export default function AiInsightsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AttributionSuggestionsOutput | null>(null);

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const result = await aiAttributionSuggestions({
        orphanConversion: {
          conversionId: "CONV_99812",
          timestamp: new Date().toISOString(),
          eventType: "purchase",
          value: 97.00,
        },
        userBehaviorEvents: [
          {
            eventId: "EV_1",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            eventType: "page_view",
            ipAddress: "192.168.1.1",
          }
        ],
        availableCampaigns: [
          {
            campaignId: "CAMP_1",
            campaignName: "Black Friday Sale",
            platform: "Meta Ads",
            description: "Main promo campaign"
          }
        ]
      });
      setResults(result);
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
            <h1 className="text-3xl font-bold font-headline mb-1">AI Path Mapping</h1>
            <p className="text-muted-foreground">Resolving attribution for orphan sales using behavioral patterns.</p>
          </div>
          <Button onClick={handleRunAnalysis} disabled={loading} className="gap-2 bg-accent hover:bg-accent/90 glow-accent">
            <Sparkles className={cn("w-4 h-4", loading && "animate-spin")} />
            Run Path Analysis
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Recent Orphan Conversions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "ORD-9821", time: "12 mins ago", value: "$49.00", status: "Unidentified" },
                  { id: "ORD-9844", time: "45 mins ago", value: "$120.00", status: "Unidentified" },
                  { id: "ORD-9856", time: "2 hours ago", value: "$89.90", status: "Unidentified" },
                ].map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-muted">
                        <HelpCircle className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold font-headline">{ord.id}</span>
                        <span className="text-xs text-muted-foreground">{ord.time} • {ord.value}</span>
                      </div>
                    </div>
                    <Button variant="ghost" className="text-accent hover:text-accent hover:bg-accent/10 font-headline">Analyze Path</Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {results && (
              <div className="animate-in zoom-in-95 duration-500">
                <Card className="glass-card border-accent/30 bg-accent/5">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-accent text-white border-none glow-accent">AI SUGGESTION READY</Badge>
                      <span className="text-xs text-muted-foreground">Analysis ID: #PATH-8821</span>
                    </div>
                    <CardTitle className="font-headline text-2xl">Suggested Mapping</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {results.suggestedAttributions.map((suggestion, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-background/50 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-accent uppercase font-headline">Confidence</span>
                            <span className="text-3xl font-black font-headline text-accent">{suggestion.confidenceScore}%</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-4 max-w-[80%]">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            <h3 className="text-xl font-bold font-headline">{suggestion.campaignName}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-4">
                            "{suggestion.reasoning}"
                          </p>
                          <div className="flex gap-2">
                            <Button className="glow-primary gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              Confirm Attribution
                            </Button>
                            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Ignore</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Card className="glass-card bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="font-headline text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Accuracy Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-headline mb-2">92%</div>
                <p className="text-xs text-muted-foreground">Historical accuracy of AI attribution for your store data.</p>
                <div className="mt-4 h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-primary glow-primary w-[92%]" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-sm uppercase tracking-widest text-muted-foreground">Insight Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Most identification gaps occur during the "PIX_GENERATED" phase on mobile browsers. Consider updating your tracking script to capture persistent browser IDs before redirecting to checkout platforms.
                </p>
                <Button variant="link" className="p-0 h-auto text-accent text-xs mt-4 group">
                  How to optimize identification <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

import { cn } from "@/lib/utils";
