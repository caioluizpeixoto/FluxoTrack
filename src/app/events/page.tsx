
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Filter, Package, AlertCircle, Search, CreditCard, ChevronLeft, ChevronRight, Download, MousePointer2, Globe, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "@/firebase/compat/firestore";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button as ShadButton } from "@/components/ui/button";

export default function EventsPage() {
  const { user } = useUser();
  const db = useFirestore();

  // Busca os últimos 100 eventos reais do Firestore
  const eventsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("serverTimestamp", "desc"),
      limit(100)
    );
  }, [db, user]);

  const { data: events, loading } = useCollection(eventsQuery);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1">Logs de Eventos</h1>
          <p className="text-muted-foreground">Monitoramento em tempo real de todas as interações capturadas.</p>
        </header>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <MousePointer2 className="w-5 h-5 text-primary" />
              Atividade do Pixel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 w-full bg-white/5 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : !events || events.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-muted-foreground">Nenhum evento capturado ainda. Instale o script no seu site para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead>Evento</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Origem / UTM</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event: any) => (
                      <TableRow key={event.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <Badge className={cn(
                            "capitalize border-none font-bold",
                            event.eventType === 'purchase' || event.eventType === 'PURCHASED' ? "bg-green-500/10 text-green-500" :
                            event.eventType === 'checkout_start' || event.eventType === 'START_CHECKOUT' ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-primary/10 text-primary"
                          )}>
                            {event.eventType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.timestamp ? new Date(event.timestamp).toLocaleString('pt-BR') : 'Agora'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{event.utmSource || 'Tráfego Direto'}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{event.utmMedium || 'none'} • {event.utmCampaign || 'organic'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] lg:max-w-[300px] truncate text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {event.url}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <ShadButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ArrowUpRight className="w-4 h-4 opacity-50" />
                          </ShadButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
