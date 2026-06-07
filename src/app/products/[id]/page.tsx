"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { useUser } from "@/firebase";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  ArrowLeft, RefreshCw, BarChart3, Settings, Layers, Target, Eye, DollarSign, Activity, Percent
} from "lucide-react";
import LinkNext from "next/link";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProductDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [product, setProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [datePreset, setDatePreset] = useState("today");

  // Linked Data
  const [linkedCampaigns, setLinkedCampaigns] = useState<any[]>([]); // { campaign_id, campaign_name }
  
  // Live Metrics
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<{ campaigns: any[], adsets: any[], ads: any[] }>({ campaigns: [], adsets: [], ads: [] });

  // Settings State (All available accounts/campaigns)
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<string>("");
  const [savingConfig, setSavingConfig] = useState(false);

  // Drilldown Meta Ads
  const [metaTab, setMetaTab] = useState("campanhas");
  const [drilledCampaignId, setDrilledCampaignId] = useState<string | null>(null);
  const [drilledAdsetId, setDrilledAdsetId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Modal
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user && id) loadProduct();
  }, [user, id]);

  async function loadProduct() {
    setLoading(true);
    try {
      const { data: prod } = await supabase.from('products').select('*').eq('id', id).single();
      if (!prod) throw new Error("Produto não encontrado");
      setProduct(prod);

      const { data: links } = await supabase.from('product_campaigns').select('*').eq('product_id', id);
      setLinkedCampaigns(links || []);

      if (links && links.length > 0) {
        // Group by ad account implicitly or fetch directly by campaign IDs.
        // For simplicity, we just fetch from the proxy API. The proxy handles accounts.
        // Wait, the proxy requires accountId. We need to know which accounts these campaigns belong to.
        // Let's get the distinct accounts from linked campaigns. We'll fetch them from meta_campaigns.
        const cIds = links.map(l => l.campaign_id);
        const { data: camps } = await supabase.from('meta_campaigns').select('ad_account_id').in('campaign_id', cIds);
        const distinctAccs = Array.from(new Set(camps?.map(c => c.ad_account_id) || []));
        
        fetchLiveMetrics(distinctAccs, cIds, datePreset);
      }

      // Load all accounts for the Settings tab
      const { data: accs } = await supabase.from('meta_ad_accounts').select('*').eq('user_id', user!.uid);
      setAllAccounts(accs || []);

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function fetchLiveMetrics(accIds: string[], cIds: string[], preset: string) {
    if (!user || accIds.length === 0) return;
    setFetchingLive(true);
    let mergedCamps: any[] = [];
    let mergedAdsets: any[] = [];
    let mergedAds: any[] = [];

    try {
      await Promise.all(accIds.map(async (accId) => {
        const res = await fetch('/api/meta/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, accountId: accId, level: 'all', datePreset: preset })
        });
        const data = await res.json();
        if (data.success) {
          mergedCamps = [...mergedCamps, ...(data.insights.campaigns || [])];
          mergedAdsets = [...mergedAdsets, ...(data.insights.adsets || [])];
          mergedAds = [...mergedAds, ...(data.insights.ads || [])];
        }
      }));

      // Filter only the campaigns linked to this product
      const filteredCamps = mergedCamps.filter(c => cIds.includes(c.campaign_id));
      const filteredAdsets = mergedAdsets.filter(a => cIds.includes(a.campaign_id));
      const filteredAds = mergedAds.filter(a => cIds.includes(a.campaign_id));

      setLiveMetrics({ campaigns: filteredCamps, adsets: filteredAdsets, ads: filteredAds });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro na API da Meta' });
    } finally {
      setFetchingLive(false);
    }
  }

  useEffect(() => {
    if (user && linkedCampaigns.length > 0) {
      const cIds = linkedCampaigns.map(l => l.campaign_id);
      // Fast heuristic for accounts (assuming we stored them in state)
      // This is a re-fetch triggered by datePreset
      supabase.from('meta_campaigns').select('ad_account_id').in('campaign_id', cIds).then(({data}) => {
        const distinctAccs = Array.from(new Set(data?.map(c => c.ad_account_id) || []));
        fetchLiveMetrics(distinctAccs, cIds, datePreset);
      });
    }
  }, [datePreset]);

  // Settings Tab Logic
  const handleAccountSelect = async (accId: string) => {
    setSelectedAccId(accId);
    const { data } = await supabase.from('meta_campaigns').select('*').eq('ad_account_id', accId);
    setAllCampaigns(data || []);
  };

  const handleToggleLink = async (campId: string, campName: string, isLinked: boolean) => {
    try {
      if (isLinked) {
        await supabase.from('product_campaigns').delete().match({ product_id: id, campaign_id: campId });
        setLinkedCampaigns(prev => prev.filter(c => c.campaign_id !== campId));
      } else {
        await supabase.from('product_campaigns').insert({ user_id: user!.uid, product_id: id, campaign_id: campId, campaign_name: campName });
        setLinkedCampaigns(prev => [...prev, { campaign_id: campId, campaign_name: campName }]);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  // KPIs Calculation
  const kpis = useMemo(() => {
    let spend = 0, revenue = 0, purchases = 0;
    liveMetrics.campaigns.forEach(c => {
      spend += Number(c.spend || 0);
      const pAct = c.actions?.find((a:any) => a.action_type === 'purchase');
      if (pAct) purchases += Number(pAct.value || 0);
      const rAct = c.action_values?.find((a:any) => a.action_type === 'purchase');
      if (rAct) revenue += Number(rAct.value || 0);
    });

    const cost = purchases * (product?.product_cost || 0);
    const profit = revenue - spend - cost;
    const roas = spend > 0 ? revenue / spend : 0;
    const roi = spend > 0 ? profit / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;

    return { spend, revenue, purchases, cost, profit, roas, roi, cpa };
  }, [liveMetrics, product]);

  const getMetric = (level: 'campaigns'|'adsets'|'ads', idKey: string, idVal: string) => {
    const item = liveMetrics[level].find((m: any) => m[idKey] === idVal);
    if (!item) return { spend: 0, purchases: 0, revenue: 0, roas: 0, cpa: 0, status: 'UNKNOWN', name: 'N/A' };
    
    const spend = Number(item.spend || 0);
    let purchases = 0;
    if (item.actions) {
      const pAction = item.actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
      if (pAction) purchases = Number(pAction.value || 0);
    }
    let revenue = 0;
    if (item.action_values) {
      const pRev = item.action_values.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
      if (pRev) revenue = Number(pRev.value || 0);
    }
    const roas = spend > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;

    // Get Status from Supabase since insights API doesn't return status directly
    return { spend, purchases, revenue, roas, cpa, status: item.status, name: item.name };
  };

  const handleToggleStatus = (type: 'campaign'|'adset'|'ad', itemId: string, name: string) => {
    setConfirmModal({ isOpen: true, type, id: itemId, name });
  };

  const confirmToggleStatus = async () => {
    if (!confirmModal || !user) return;
    setUpdating(true);
    // Fetch actual status first
    const tableMap: Record<string, string> = { campaign: 'meta_campaigns', adset: 'meta_adsets', ad: 'meta_ads' };
    const idMap: Record<string, string> = { campaign: 'campaign_id', adset: 'adset_id', ad: 'ad_id' };
    
    try {
      const { data: curr } = await supabase.from(tableMap[confirmModal.type]).select('status').eq(idMap[confirmModal.type], confirmModal.id).single();
      const currentStatus = curr?.status || 'ACTIVE';
      const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

      const res = await fetch('/api/meta/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, type: confirmModal.type, id: confirmModal.id, payload: { status: newStatus }})
      });
      if (!res.ok) throw new Error((await res.json()).error);

      // Refresh DB structure (silently)
      supabase.from(tableMap[confirmModal.type]).update({status: newStatus}).eq(idMap[confirmModal.type], confirmModal.id).then();
      toast({ title: 'Sucesso', description: `Status alterado para ${newStatus}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro de Permissão', description: e.message });
    } finally {
      setUpdating(false);
      setConfirmModal(null);
    }
  };

  if (!mounted || !product) return null;

  return (
    <div className="flex min-h-screen bg-[#0f1115] text-slate-200">
      <DashboardSidebar />
      <main className="flex-1 w-full p-4 lg:p-8 transition-all h-screen flex flex-col overflow-hidden">
        
        <header className="mb-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LinkNext href={`/dashboards/${product.dashboard_id}`}>
              <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full"><ArrowLeft className="w-5 h-5"/></Button>
            </LinkNext>
            <div>
              <h1 className="text-2xl font-bold font-headline text-primary">{product.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs bg-[#1a1c23] border-white/10 text-green-500">Venda: {formatCurrency(product.price)}</Badge>
                <Badge variant="outline" className="text-xs bg-[#1a1c23] border-white/10 text-red-400">Custo: {formatCurrency(product.product_cost)}</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={datePreset} onValueChange={(val) => setDatePreset(val)}>
              <SelectTrigger className="h-9 w-[150px] bg-[#1a1c23] border-white/10 font-bold">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                <SelectItem value="this_month">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-[#1a1c23] border-white/10 hover:bg-white/5" onClick={() => loadProduct()}>
              <RefreshCw className={`w-4 h-4 mr-2 ${fetchingLive ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </header>

        <Card className="flex-1 bg-[#14151a] border-white/5 flex flex-col overflow-hidden relative">
          {fetchingLive && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 z-50">
              <div className="h-full bg-primary animate-pulse w-1/3" />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="border-b border-white/5 px-4 shrink-0">
              <TabsList className="bg-transparent h-14 p-0 justify-start gap-8">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-sm font-bold uppercase tracking-wider text-muted-foreground gap-2"><Activity className="w-4 h-4"/> Visão Geral</TabsTrigger>
                <TabsTrigger value="meta" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-sm font-bold uppercase tracking-wider text-muted-foreground gap-2"><BarChart3 className="w-4 h-4"/> Meta Ads</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-sm font-bold uppercase tracking-wider text-muted-foreground gap-2"><Settings className="w-4 h-4"/> Configurações</TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: VISÃO GERAL */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute right-[-10px] top-[10px] opacity-5"><DollarSign className="w-24 h-24"/></div>
                  <p className="text-sm text-slate-400 font-medium mb-1">Faturamento Bruto</p>
                  <p className="text-2xl font-bold font-headline text-green-400">{formatCurrency(kpis.revenue)}</p>
                </Card>
                <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center relative overflow-hidden">
                  <p className="text-sm text-slate-400 font-medium mb-1">Gasto Ads</p>
                  <p className="text-2xl font-bold font-headline text-red-400">{formatCurrency(kpis.spend)}</p>
                </Card>
                <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center relative overflow-hidden">
                  <p className="text-sm text-slate-400 font-medium mb-1">Custo Fixo (Produtos)</p>
                  <p className="text-2xl font-bold font-headline text-orange-400">{formatCurrency(kpis.cost)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpis.purchases} Vendas Realizadas</p>
                </Card>
                <Card className="bg-[#1a1c23] border border-primary/20 p-4 flex flex-col justify-center relative overflow-hidden">
                  <p className="text-sm text-primary font-medium mb-1">Lucro Líquido Real</p>
                  <p className="text-3xl font-bold font-headline text-primary glow-text-primary">{formatCurrency(kpis.profit)}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card className="bg-[#1a1c23] border-white/5 p-4 text-center">
                    <p className="text-sm text-slate-400 font-medium mb-1">ROI (Retorno s/ Investimento)</p>
                    <p className="text-xl font-bold text-white">{kpis.roi.toFixed(2)}%</p>
                 </Card>
                 <Card className="bg-[#1a1c23] border-white/5 p-4 text-center">
                    <p className="text-sm text-slate-400 font-medium mb-1">ROAS</p>
                    <p className="text-xl font-bold text-white">{kpis.roas.toFixed(2)}x</p>
                 </Card>
                 <Card className="bg-[#1a1c23] border-white/5 p-4 text-center">
                    <p className="text-sm text-slate-400 font-medium mb-1">CPA Médio</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(kpis.cpa)}</p>
                 </Card>
              </div>
            </TabsContent>

            {/* TAB 2: META ADS (GERENCIADOR EMBUTIDO) */}
            <TabsContent value="meta" className="flex-1 flex flex-col m-0 p-0 overflow-hidden relative">
              <div className="bg-[#1a1c23] p-2 border-b border-white/5 flex gap-2">
                <Button variant={metaTab === 'campanhas' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => { setDrilledCampaignId(null); setDrilledAdsetId(null); setMetaTab('campanhas'); }}>Campanhas</Button>
                <Button variant={metaTab === 'conjuntos' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => { setDrilledAdsetId(null); setMetaTab('conjuntos'); }}>Conjuntos {drilledCampaignId && '(1 Campanha)'}</Button>
                <Button variant={metaTab === 'anuncios' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => setMetaTab('anuncios')}>Anúncios {drilledAdsetId && '(1 Conjunto)'}</Button>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#14151a] text-xs uppercase text-slate-400 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="px-4 py-3 w-10">On/Off</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3 text-right">Gasto</th>
                      <th className="px-4 py-3 text-right">Vendas</th>
                      <th className="px-4 py-3 text-right">CPA</th>
                      <th className="px-4 py-3 text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {metaTab === 'campanhas' && liveMetrics.campaigns.map(c => {
                      const m = getMetric('campaigns', 'campaign_id', c.campaign_id);
                      return (
                        <tr key={c.campaign_id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2"><Button size="sm" variant="ghost" onClick={() => handleToggleStatus('campaign', c.campaign_id, c.campaign_name)}>Toggle</Button></td>
                          <td className="px-4 py-2 font-medium text-blue-400 cursor-pointer hover:underline" onClick={() => { setDrilledCampaignId(c.campaign_id); setMetaTab('conjuntos'); }}>{c.campaign_name}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.spend)}</td>
                          <td className="px-4 py-2 text-right">{m.purchases}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.cpa)}</td>
                          <td className="px-4 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                        </tr>
                      );
                    })}

                    {metaTab === 'conjuntos' && liveMetrics.adsets.filter(a => !drilledCampaignId || a.campaign_id === drilledCampaignId).map(a => {
                      const m = getMetric('adsets', 'adset_id', a.adset_id);
                      return (
                        <tr key={a.adset_id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2"><Button size="sm" variant="ghost" onClick={() => handleToggleStatus('adset', a.adset_id, a.adset_name)}>Toggle</Button></td>
                          <td className="px-4 py-2 font-medium text-blue-400 cursor-pointer hover:underline" onClick={() => { setDrilledAdsetId(a.adset_id); setMetaTab('anuncios'); }}>{a.adset_name}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.spend)}</td>
                          <td className="px-4 py-2 text-right">{m.purchases}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.cpa)}</td>
                          <td className="px-4 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                        </tr>
                      );
                    })}

                    {metaTab === 'anuncios' && liveMetrics.ads.filter(a => !drilledAdsetId || a.adset_id === drilledAdsetId).map(a => {
                      const m = getMetric('ads', 'ad_id', a.ad_id);
                      return (
                        <tr key={a.ad_id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2"><Button size="sm" variant="ghost" onClick={() => handleToggleStatus('ad', a.ad_id, a.ad_name)}>Toggle</Button></td>
                          <td className="px-4 py-2 font-medium text-slate-200">{a.ad_name}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.spend)}</td>
                          <td className="px-4 py-2 text-right">{m.purchases}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.cpa)}</td>
                          <td className="px-4 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 3: CONFIGURAÇÕES */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto p-6 m-0">
              <div className="max-w-3xl space-y-8">
                
                <section>
                  <h3 className="text-lg font-bold mb-4 font-headline border-b border-white/10 pb-2">Vínculo de Campanhas Meta Ads</h3>
                  <div className="bg-[#1a1c23] border border-white/5 rounded-lg p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-400">1. Selecione a Conta de Anúncios</label>
                      <Select value={selectedAccId} onValueChange={handleAccountSelect}>
                        <SelectTrigger className="bg-[#0f1115] border-white/10">
                          <SelectValue placeholder="Escolha uma conta..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1c23] border-white/10">
                          {allAccounts.map(a => <SelectItem key={a.account_id} value={a.account_id}>{a.account_name} ({a.account_id})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {allCampaigns.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm text-slate-400">2. Marque as Campanhas deste Produto</label>
                        <div className="max-h-[300px] overflow-y-auto border border-white/5 rounded-lg bg-[#0f1115] divide-y divide-white/5">
                          {allCampaigns.map(c => {
                            const isLinked = linkedCampaigns.some(lc => lc.campaign_id === c.campaign_id);
                            return (
                              <div key={c.campaign_id} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
                                <Checkbox checked={isLinked} onCheckedChange={() => handleToggleLink(c.campaign_id, c.name, isLinked)} />
                                <div>
                                  <p className="text-sm font-medium">{c.name}</p>
                                  <p className="text-xs text-muted-foreground">{c.status}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      <Dialog open={!!confirmModal} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <DialogContent className="bg-[#1e1f26] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Mudar Status</DialogTitle>
            <DialogDescription className="text-slate-400">Deseja realmente alternar o status deste item diretamente no Facebook?</DialogDescription>
          </DialogHeader>
          <div className="py-4 font-medium text-center text-lg text-primary bg-primary/5 rounded-lg">{confirmModal?.name}</div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmModal(null)} disabled={updating}>Cancelar</Button>
            <Button className="bg-primary text-white font-bold" onClick={confirmToggleStatus} disabled={updating}>
              {updating ? 'Alterando...' : 'Confirmar Ação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
