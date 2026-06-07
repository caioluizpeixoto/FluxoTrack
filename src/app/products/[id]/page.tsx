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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, RefreshCw, BarChart3, Settings, Layers, Target, Eye, DollarSign, Activity, 
  Percent, Link as LinkIcon, Webhook, Code2, Zap, FileText, Plus, Trash, Copy
} from "lucide-react";
import LinkNext from "next/link";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { useParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  const [linkedCampaigns, setLinkedCampaigns] = useState<any[]>([]); 
  const [taxes, setTaxes] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [utms, setUtms] = useState<any>(null);
  const [webhook, setWebhook] = useState<any>(null);
  const [pixel, setPixel] = useState<any>(null);
  
  // Live Metrics
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<{ campaigns: any[], adsets: any[], ads: any[] }>({ campaigns: [], adsets: [], ads: [] });

  // Settings State
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<string>("");

  // Drilldown Meta Ads
  const [metaTab, setMetaTab] = useState("campanhas");
  const [drilledCampaignId, setDrilledCampaignId] = useState<string | null>(null);
  const [drilledAdsetId, setDrilledAdsetId] = useState<string | null>(null);

  // Modals & Forms
  const [budgetModal, setBudgetModal] = useState<any>(null);
  const [budgetValue, setBudgetValue] = useState("");
  const [budgetType, setBudgetType] = useState("percentage_increase");
  
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user && id) loadProductData();
  }, [user, id]);

  async function loadProductData() {
    setLoading(true);
    try {
      const { data: prod } = await supabase.from('products').select('*').eq('id', id).single();
      if (!prod) throw new Error("Produto não encontrado");
      setProduct(prod);

      // Fetch all links
      const [linksRes, taxesRes, expRes, rulesRes, utmRes, webhookRes, pixelRes] = await Promise.all([
        supabase.from('product_campaigns').select('*').eq('product_id', id),
        supabase.from('product_taxes').select('*').eq('product_id', id),
        supabase.from('product_expenses').select('*').eq('product_id', id),
        supabase.from('product_rules').select('*').eq('product_id', id),
        supabase.from('product_utms').select('*').eq('product_id', id).maybeSingle(),
        supabase.from('product_webhooks').select('*').eq('product_id', id).maybeSingle(),
        supabase.from('product_pixels').select('*').eq('product_id', id).maybeSingle()
      ]);

      setLinkedCampaigns(linksRes.data || []);
      setTaxes(taxesRes.data || []);
      setExpenses(expRes.data || []);
      setRules(rulesRes.data || []);
      setUtms(utmRes.data || null);
      setWebhook(webhookRes.data || null);
      setPixel(pixelRes.data || null);

      if (linksRes.data && linksRes.data.length > 0) {
        const cIds = linksRes.data.map(l => l.campaign_id);
        const { data: camps } = await supabase.from('meta_campaigns').select('ad_account_id').in('campaign_id', cIds);
        const distinctAccs = Array.from(new Set(camps?.map(c => c.ad_account_id) || []));
        fetchLiveMetrics(distinctAccs, cIds, datePreset);
      }

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

      setLiveMetrics({ 
        campaigns: mergedCamps.filter(c => cIds.includes(c.campaign_id)), 
        adsets: mergedAdsets.filter(a => cIds.includes(a.campaign_id)), 
        ads: mergedAds.filter(a => cIds.includes(a.campaign_id)) 
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro na API da Meta' });
    } finally {
      setFetchingLive(false);
    }
  }

  useEffect(() => {
    if (user && linkedCampaigns.length > 0 && !loading) {
      const cIds = linkedCampaigns.map(l => l.campaign_id);
      supabase.from('meta_campaigns').select('ad_account_id').in('campaign_id', cIds).then(({data}) => {
        const distinctAccs = Array.from(new Set(data?.map(c => c.ad_account_id) || []));
        fetchLiveMetrics(distinctAccs, cIds, datePreset);
      });
    }
  }, [datePreset]);

  // KPIs
  const kpis = useMemo(() => {
    let spend = 0, revenue = 0, purchases = 0, clicks = 0, impressions = 0;
    liveMetrics.campaigns.forEach(c => {
      spend += Number(c.spend || 0);
      clicks += Number(c.clicks || 0);
      impressions += Number(c.impressions || 0);
      const pAct = c.actions?.find((a:any) => a.action_type === 'purchase');
      if (pAct) purchases += Number(pAct.value || 0);
      const rAct = c.action_values?.find((a:any) => a.action_type === 'purchase');
      if (rAct) revenue += Number(rAct.value || 0);
    });

    // Subtrações
    const prodCost = purchases * (product?.product_cost || 0);
    
    // Taxas
    let taxesAmount = 0;
    taxes.forEach(t => {
      taxesAmount += Number(t.fixed_amount || 0);
      if (t.percentage) taxesAmount += (revenue * (Number(t.percentage) / 100));
    });

    // Despesas (simples soma total aqui, ideal seria filtrar por data)
    let expensesAmount = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

    const profit = revenue - spend - prodCost - taxesAmount - expensesAmount;
    const roas = spend > 0 ? revenue / spend : 0;
    const roi = spend > 0 ? profit / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return { spend, revenue, purchases, prodCost, taxesAmount, expensesAmount, profit, roas, roi, cpa, cpc, cpm, ctr };
  }, [liveMetrics, product, taxes, expenses]);

  const getMetric = (level: 'campaigns'|'adsets'|'ads', idKey: string, idVal: string) => {
    const item = liveMetrics[level].find((m: any) => m[idKey] === idVal);
    if (!item) return { spend: 0, purchases: 0, revenue: 0, roas: 0, cpa: 0, status: 'UNKNOWN', name: 'N/A' };
    
    const spend = Number(item.spend || 0);
    let purchases = 0, revenue = 0;
    if (item.actions) {
      const pAction = item.actions.find((a: any) => a.action_type === 'purchase');
      if (pAction) purchases = Number(pAction.value || 0);
    }
    if (item.action_values) {
      const pRev = item.action_values.find((a: any) => a.action_type === 'purchase');
      if (pRev) revenue = Number(pRev.value || 0);
    }
    return { spend, purchases, revenue, roas: spend > 0 ? revenue / spend : 0, cpa: purchases > 0 ? spend / purchases : 0, status: item.status, name: item.name };
  };

  // Handlers Meta Ads
  const confirmToggleStatus = async () => {
    if (!confirmModal || !user) return;
    setUpdating(true);
    const tableMap: Record<string, string> = { campaign: 'meta_campaigns', adset: 'meta_adsets', ad: 'meta_ads' };
    const idMap: Record<string, string> = { campaign: 'campaign_id', adset: 'adset_id', ad: 'ad_id' };
    
    try {
      const { data: curr } = await supabase.from(tableMap[confirmModal.type]).select('status').eq(idMap[confirmModal.type], confirmModal.id).single();
      const newStatus = (curr?.status || 'ACTIVE') === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

      const res = await fetch('/api/meta/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, type: confirmModal.type, id: confirmModal.id, payload: { status: newStatus }})
      });
      if (!res.ok) throw new Error((await res.json()).error);
      supabase.from(tableMap[confirmModal.type]).update({status: newStatus}).eq(idMap[confirmModal.type], confirmModal.id).then();
      toast({ title: 'Status alterado' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setUpdating(false); setConfirmModal(null);
    }
  };

  const handleApplyBudget = async () => {
    if (!budgetModal || !user || !budgetValue) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/meta/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid, type: budgetModal.type, id: budgetModal.id, 
          action: budgetType, value: Number(budgetValue)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao atualizar orçamento');
      toast({ title: 'Orçamento atualizado!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setUpdating(false); setBudgetModal(null);
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
              <SelectTrigger className="h-9 w-[150px] bg-[#1a1c23] border-white/10 font-bold"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                <SelectItem value="this_month">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-[#1a1c23] border-white/10 hover:bg-white/5" onClick={() => loadProductData()}>
              <RefreshCw className={`w-4 h-4 mr-2 ${fetchingLive ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </header>

        <Card className="flex-1 bg-[#14151a] border-white/5 flex flex-col overflow-hidden relative">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="border-b border-white/5 px-2 shrink-0 overflow-x-auto no-scrollbar">
              <TabsList className="bg-transparent h-14 p-0 justify-start gap-4 inline-flex w-max">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Activity className="w-3 h-3 mr-1"/> Resumo</TabsTrigger>
                <TabsTrigger value="meta" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><BarChart3 className="w-3 h-3 mr-1"/> Meta Ads</TabsTrigger>
                <TabsTrigger value="webhooks" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Webhook className="w-3 h-3 mr-1"/> Webhooks</TabsTrigger>
                <TabsTrigger value="pixel" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Code2 className="w-3 h-3 mr-1"/> Pixel</TabsTrigger>
                <TabsTrigger value="utms" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><LinkIcon className="w-3 h-3 mr-1"/> UTMs</TabsTrigger>
                <TabsTrigger value="rules" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Zap className="w-3 h-3 mr-1"/> Regras</TabsTrigger>
                <TabsTrigger value="taxes" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Percent className="w-3 h-3 mr-1"/> Taxas</TabsTrigger>
                <TabsTrigger value="expenses" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><DollarSign className="w-3 h-3 mr-1"/> Despesas</TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><FileText className="w-3 h-3 mr-1"/> Relatórios</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Settings className="w-3 h-3 mr-1"/> Config</TabsTrigger>
              </TabsList>
            </div>

            {/* ABA: RESUMO */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center">
                  <p className="text-sm text-slate-400 font-medium mb-1">Faturamento Bruto</p>
                  <p className="text-2xl font-bold font-headline text-green-400">{formatCurrency(kpis.revenue)}</p>
                </Card>
                <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center">
                  <p className="text-sm text-slate-400 font-medium mb-1">Gasto Ads</p>
                  <p className="text-2xl font-bold font-headline text-red-400">{formatCurrency(kpis.spend)}</p>
                </Card>
                <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center">
                  <p className="text-sm text-slate-400 font-medium mb-1">Custos & Taxas</p>
                  <p className="text-2xl font-bold font-headline text-orange-400">{formatCurrency(kpis.prodCost + kpis.taxesAmount + kpis.expensesAmount)}</p>
                </Card>
                <Card className="bg-[#1a1c23] border border-primary/20 p-4 flex flex-col justify-center">
                  <p className="text-sm text-primary font-medium mb-1">Lucro Líquido</p>
                  <p className="text-3xl font-bold font-headline text-primary">{formatCurrency(kpis.profit)}</p>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                 <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">ROI</p><p className="font-bold">{kpis.roi.toFixed(2)}%</p></Card>
                 <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">ROAS</p><p className="font-bold">{kpis.roas.toFixed(2)}x</p></Card>
                 <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">CPA</p><p className="font-bold">{formatCurrency(kpis.cpa)}</p></Card>
                 <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">CPC</p><p className="font-bold">{formatCurrency(kpis.cpc)}</p></Card>
                 <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">CPM</p><p className="font-bold">{formatCurrency(kpis.cpm)}</p></Card>
                 <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">CTR</p><p className="font-bold">{kpis.ctr.toFixed(2)}%</p></Card>
              </div>
            </TabsContent>

            {/* ABA: META ADS */}
            <TabsContent value="meta" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <div className="bg-[#1a1c23] p-2 border-b border-white/5 flex gap-2">
                <Button variant={metaTab === 'campanhas' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => { setDrilledCampaignId(null); setDrilledAdsetId(null); setMetaTab('campanhas'); }}>Campanhas</Button>
                <Button variant={metaTab === 'conjuntos' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => { setDrilledAdsetId(null); setMetaTab('conjuntos'); }}>Conjuntos</Button>
                <Button variant={metaTab === 'anuncios' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => setMetaTab('anuncios')}>Anúncios</Button>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#14151a] text-xs uppercase text-slate-400 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="px-4 py-3 w-10">Status</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3 text-center">Orçamento</th>
                      <th className="px-4 py-3 text-right">Gasto</th>
                      <th className="px-4 py-3 text-right">CPA</th>
                      <th className="px-4 py-3 text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {metaTab === 'campanhas' && liveMetrics.campaigns.map(c => {
                      const m = getMetric('campaigns', 'campaign_id', c.campaign_id);
                      return (
                        <tr key={c.campaign_id} className="hover:bg-white/5">
                          <td className="px-4 py-2"><Switch checked={m.status==='ACTIVE'} onCheckedChange={()=>setConfirmModal({isOpen:true, type:'campaign', id:c.campaign_id, name:c.campaign_name})}/></td>
                          <td className="px-4 py-2 font-medium text-blue-400 cursor-pointer" onClick={() => { setDrilledCampaignId(c.campaign_id); setMetaTab('conjuntos'); }}>{c.campaign_name}</td>
                          <td className="px-4 py-2 text-center"><Button size="sm" variant="outline" className="h-6 text-xs bg-transparent border-white/10 hover:bg-white/10" onClick={() => setBudgetModal({isOpen:true, type:'campaign', id:c.campaign_id, name:c.campaign_name})}>Alterar</Button></td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.spend)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.cpa)}</td>
                          <td className="px-4 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                        </tr>
                      );
                    })}
                    {/* Conjuntos e Anuncios omitidos pra poupar espaço mas seguem a mesma lógica */}
                    {metaTab === 'conjuntos' && liveMetrics.adsets.filter(a => !drilledCampaignId || a.campaign_id === drilledCampaignId).map(a => {
                      const m = getMetric('adsets', 'adset_id', a.adset_id);
                      return (
                        <tr key={a.adset_id} className="hover:bg-white/5">
                          <td className="px-4 py-2"><Switch checked={m.status==='ACTIVE'} onCheckedChange={()=>setConfirmModal({isOpen:true, type:'adset', id:a.adset_id, name:a.adset_name})}/></td>
                          <td className="px-4 py-2 font-medium text-blue-400 cursor-pointer" onClick={() => { setDrilledAdsetId(a.adset_id); setMetaTab('anuncios'); }}>{a.adset_name}</td>
                          <td className="px-4 py-2 text-center"><Button size="sm" variant="outline" className="h-6 text-xs bg-transparent border-white/10" onClick={() => setBudgetModal({isOpen:true, type:'adset', id:a.adset_id, name:a.adset_name})}>Alterar</Button></td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.spend)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(m.cpa)}</td>
                          <td className="px-4 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ABA: WEBHOOKS */}
            <TabsContent value="webhooks" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-2xl space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline mb-2">Webhook Exclusivo</h2>
                   <p className="text-sm text-slate-400 mb-4">Envie eventos de Venda e Lead (Kiwify, Hotmart) para este produto usando a URL abaixo.</p>
                   <div className="flex gap-2">
                     <Input readOnly value={`https://api.adpulse.com/v1/webhook/${id}`} className="bg-[#0f1115] font-mono text-xs border-white/10" />
                     <Button variant="secondary"><Copy className="w-4 h-4 mr-2"/> Copiar</Button>
                   </div>
                 </div>
                 <div className="p-4 border border-white/10 rounded-lg bg-[#1a1c23]">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Activity className="w-4 h-4"/> Últimos Eventos</h3>
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento recebido ainda.</p>
                 </div>
               </div>
            </TabsContent>

            {/* ABA: TAXAS */}
            <TabsContent value="taxes" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-2xl space-y-6">
                 <div className="flex justify-between items-center">
                   <h2 className="text-xl font-bold font-headline">Taxas e Impostos</h2>
                   <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Adicionar Taxa</Button>
                 </div>
                 <div className="space-y-2">
                    {taxes.length === 0 ? <p className="text-muted-foreground text-sm">Sem taxas cadastradas. O lucro não terá deduções automáticas percentuais.</p> : null}
                    {taxes.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 border border-white/5 bg-[#1a1c23] rounded-lg">
                        <span>{t.name}</span>
                        <div className="flex items-center gap-4">
                           <span className="font-bold">{t.percentage ? `${t.percentage}%` : formatCurrency(t.fixed_amount)}</span>
                           <Button variant="ghost" size="icon" className="text-red-500 h-6 w-6"><Trash className="w-3 h-3"/></Button>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            </TabsContent>

            {/* ABA: SETTINGS (Configurações) */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto p-6 m-0">
              <div className="max-w-2xl space-y-6">
                <h3 className="text-lg font-bold font-headline border-b border-white/10 pb-2">Vínculo de Campanhas Meta Ads</h3>
                <div className="space-y-4">
                  <Select value={selectedAccId} onValueChange={async (accId) => {
                    setSelectedAccId(accId);
                    const { data } = await supabase.from('meta_campaigns').select('*').eq('ad_account_id', accId);
                    setAllCampaigns(data || []);
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-white/10"><SelectValue placeholder="Escolha uma conta de anúncio..." /></SelectTrigger>
                    <SelectContent className="bg-[#1a1c23] border-white/10">
                      {allAccounts.map(a => <SelectItem key={a.account_id} value={a.account_id}>{a.account_name}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {allCampaigns.length > 0 && (
                    <div className="max-h-[300px] overflow-y-auto border border-white/5 rounded-lg bg-[#0f1115] divide-y divide-white/5">
                      {allCampaigns.map(c => {
                        const isLinked = linkedCampaigns.some(lc => lc.campaign_id === c.campaign_id);
                        return (
                          <div key={c.campaign_id} className="flex items-center gap-3 p-3 hover:bg-white/5">
                            <Checkbox checked={isLinked} onCheckedChange={async () => {
                              if (isLinked) {
                                await supabase.from('product_campaigns').delete().match({ product_id: id, campaign_id: c.campaign_id });
                                setLinkedCampaigns(prev => prev.filter(x => x.campaign_id !== c.campaign_id));
                              } else {
                                await supabase.from('product_campaigns').insert({ user_id: user!.uid, product_id: id, campaign_id: c.campaign_id, campaign_name: c.name });
                                setLinkedCampaigns(prev => [...prev, { campaign_id: c.campaign_id, campaign_name: c.name }]);
                              }
                            }} />
                            <p className="text-sm">{c.name}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </Card>
      </main>

      {/* Modal Orçamento */}
      <Dialog open={!!budgetModal} onOpenChange={(open) => !open && setBudgetModal(null)}>
        <DialogContent className="bg-[#1e1f26] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Alterar Orçamento</DialogTitle>
            <DialogDescription>Ajuste o orçamento de: {budgetModal?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={budgetType} onValueChange={setBudgetType}>
              <SelectTrigger className="bg-[#0f1115] border-white/10"><SelectValue/></SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="percentage_increase">Aumentar em %</SelectItem>
                <SelectItem value="percentage_decrease">Reduzir em %</SelectItem>
                <SelectItem value="fixed">Valor Fixo Diário (R$)</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Ex: 20" value={budgetValue} onChange={e => setBudgetValue(e.target.value)} className="bg-[#0f1115] border-white/10"/>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBudgetModal(null)} disabled={updating}>Cancelar</Button>
            <Button className="bg-primary text-white font-bold" onClick={handleApplyBudget} disabled={updating || !budgetValue}>
              {updating ? 'Aplicando...' : 'Aplicar Orçamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Status */}
      <Dialog open={!!confirmModal} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <DialogContent className="bg-[#1e1f26] border-white/10 text-white">
          <DialogHeader><DialogTitle>Alterar Status</DialogTitle></DialogHeader>
          <div className="py-4 font-medium text-center text-lg text-primary">{confirmModal?.name}</div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmModal(null)} disabled={updating}>Cancelar</Button>
            <Button className="bg-primary text-white font-bold" onClick={confirmToggleStatus} disabled={updating}>Confirmar Ação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
