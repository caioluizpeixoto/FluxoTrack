
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
  CheckCircle2,
  Clock,
  Search,
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { aiAttributionSuggestions, type AttributionSuggestionsOutput } from "@/ai/flows/ai-attribution-suggestions";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, limit, orderBy } from "@/firebase/compat/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function AiInsightsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AttributionSuggestionsOutput | null>(null);
  const [selectedConversion, setSelectedConversion] = useState<any>(null);

  // Busca conversões sem atribuição (órfãs)
  const orphanConversionsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "conversions"),
      where("attributedCampaignId", "==", null),
      orderBy("timestamp", "desc"),
      limit(10)
    );
  }, [db, user]);

  // Busca eventos recentes para contexto
  const recentEventsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
  }, [db, user]);

  // Busca campanhas disponíveis
  const campaignsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, "users", user.uid, "campaigns"), limit(20));
  }, [db, user]);

  const { data: orphanConversions, loading: loadingOrphans } = useCollection(orphanConversionsQuery);
  const { data: recentEvents } = useCollection(recentEventsQuery);
  const { data: campaigns } = useCollection(campaignsQuery);

  const handleRunAnalysis = async (conv: any) => {
    if (!conv) return;
    setLoading(true);
    setSelectedConversion(conv);
    
    try {
      const result = await aiAttributionSuggestions({
        orphanConversion: {
          conversionId: conv.id,
          timestamp: conv.timestamp,
          eventType: conv.eventType || 'purchase',
          value: conv.value,
        },
        userBehaviorEvents: recentEvents.map((e: any) => ({
          eventId: e.id,
          timestamp: e.timestamp,
          eventType: e.eventType,
          utmSource: e.utmSource,
          utmMedium: e.utmMedium,
          utmCampaign: e.utmCampaign,
          ipAddress: e.ipAddress,
        })),
        availableCampaigns: campaigns.map((c: any) => ({
          campaignId: c.id,
          campaignName: c.name,
          platform: c.platform,
          description: c.description || "",
        }))
      });
      setResults(result);
      toast({
        title: "Análise concluída!",
        description: "A IA encontrou padrões de atribuição para esta venda.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro na análise",
        description: "Não foi possível processar o mapeamento de IA agora.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline mb-1">IA Path Mapping</h1>
            <p className="text-muted-foreground">Resolvendo atribuições órfãs usando padrões comportamentais.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Vendas Aguardando Identificação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingOrphans ? (
                  <div className="py-10 text-center animate-pulse text-muted-foreground">Buscando conversões órfãs...</div>
                ) : orphanConversions.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">Tudo em ordem! Todas as vendas recentes possuem atribuição.</p>
                  </div>
                ) : (
                  orphanConversions.map((conv: any) => (
                    <div key={conv.id} className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all",
                      selectedConversion?.id === conv.id ? "bg-accent/10 border-accent/30" : "bg-white/5 border-white/5"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-muted">
                          <HelpCircle className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold font-headline">{conv.externalId || conv.id}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(conv.timestamp).toLocaleString('pt-BR')} • R$ {conv.value.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleRunAnalysis(conv)} 
                        disabled={loading}
                        variant={selectedConversion?.id === conv.id ? "default" : "ghost"}
                        className={cn(
                          "gap-2 font-headline",
                          selectedConversion?.id === conv.id && "bg-accent hover:bg-accent/90 glow-accent"
                        )}
                      >
                        {loading && selectedConversion?.id === conv.id ? (
                          <Sparkles className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        Analisar Caminho
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {results && (
              <div className="animate-in zoom-in-95 duration-500">
                <Card className="glass-card border-accent/30 bg-accent/5">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-accent text-white border-none glow-accent">SUGESTÃO DA IA</Badge>
                      <span className="text-xs text-muted-foreground">Analysis for {selectedConversion?.externalId || 'Sale'}</span>
                    </div>
                    <CardTitle className="font-headline text-2xl">Mapeamento Sugerido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {results.suggestedAttributions.map((suggestion, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-background/50 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-accent uppercase font-headline">Confiança</span>
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
                              Confirmar Atribuição
                            </Button>
                            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Ignorar</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {results.analysisSummary && (
                      <div className="p-4 rounded-xl bg-muted/30 border border-white/5 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground italic">{results.analysisSummary}</p>
                      </div>
                    )}
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
                  Score de Precisão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-headline mb-2">94%</div>
                <p className="text-xs text-muted-foreground">Precisão histórica baseada em 128 atribuições confirmadas.</p>
                <div className="mt-4 h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-primary glow-primary w-[94%]" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-headline text-sm uppercase tracking-widest text-muted-foreground">Insights de Perda</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A IA detectou que 40% das vendas órfãs ocorrem em dispositivos iOS via App do Instagram. Recomendamos habilitar a API de Conversão (CAPI) para capturar IDs persistentes.
                </p>
                <Button variant="link" className="p-0 h-auto text-accent text-xs mt-4 group">
                  Como otimizar o tracking <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
