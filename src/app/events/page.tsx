
"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MousePointer2, Clock, Globe, ArrowUpRight } from "lucide-react";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export default function EventsPage() {
  const { user } = useUser();
  const db = useFirestore();

  const eventsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "users", user.uid, "events"),
      orderBy("timestamp", "desc")
    );
  }, [db, user]);

  const { data: events, loading } = useCollection(eventsQuery);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline mb-1">Logs de Eventos</h1>
          <p className="text-muted-foreground">Monitoramento em tempo real de todas as interações capturadas pelo Pixel.</p>
        </header>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <MousePointer2 className="w-5 h-5 text-primary" />
              Eventos de Tracking
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
                <p className="text-muted-foreground">Nenhum dado recebido ainda. Verifique a instalação do seu script.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead>Evento</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Origem / UTM</TableHead>
                    <TableHead>Página / URL</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event: any) => (
                    <TableRow key={event.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <Badge className={cn(
                          "capitalize border-none font-bold",
                          event.eventType === 'purchase' ? "bg-green-500/10 text-green-500" :
                          event.eventType === 'checkout_start' ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-primary/10 text-primary"
                        )}>
                          {event.eventType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{event.utmSource || 'Tráfego Direto'}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{event.utmMedium || 'none'} • {event.utmCampaign || 'organic'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {event.url}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ArrowUpRight className="w-4 h-4 opacity-50" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
