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
  Percent, Link as LinkIcon, Webhook, Code2, Zap, FileText, Plus, Trash, Copy, Play
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
  const [events, setEvents] = useState<any[]>([]);
  const [utms, setUtms] = useState<any>(null);
  const [pixel, setPixel] = useState<any>(null);
  const [productAdAccount, setProductAdAccount] = useState<any>(null);
  
  // Live Metrics
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<{ campaigns: any[], adsets: any[], ads: any[] }>({ campaigns: [], adsets: [], ads: [] });

  // Settings State
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
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

  // Forms State
  const [newTax, setNewTax] = useState({ name: '', percentage: '', fixed: '' });
  const [newExp, setNewExp] = useState({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [newRule, setNewRule] = useState({ name: '', metric: 'cpa', operator: '>', value: '', action: 'pause_campaign', actionValue: '' });

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

      const [linksRes, taxesRes, expRes, rulesRes, utmRes, pixelRes, accLinkRes, eventsRes] = await Promise.all([
        supabase.from('product_campaigns').select('*').eq('product_id', id),
        supabase.from('product_taxes').select('*').eq('product_id', id),
        supabase.from('product_expenses').select('*').eq('product_id', id).order('expense_date', { ascending: false }),
        supabase.from('product_rules').select('*').eq('product_id', id),
        supabase.from('product_utms').select('*').eq('product_id', id).maybeSingle(),
        supabase.from('product_pixels').select('*').eq('product_id', id).maybeSingle(),
        supabase.from('product_ad_accounts').select('ad_account_id').eq('product_id', id).maybeSingle(),
        supabase.from('product_events').select('*').eq('product_id', id).order('created_at', { ascending: false })
      ]);

      setLinkedCampaigns(linksRes.data || []);
      setTaxes(taxesRes.data || []);
      setExpenses(expRes.data || []);
      setRules(rulesRes.data || []);
      setUtms(utmRes.data || null);
      setPixel(pixelRes.data || null);
      setProductAdAccount(accLinkRes.data || null);
      setEvents(eventsRes.data || []);

      if (accLinkRes.data?.ad_account_id) {
        fetchLiveMetrics([accLinkRes.data.ad_account_id], datePreset);
      } else if (linksRes.data && linksRes.data.length > 0) {
        const cIds = linksRes.data.map(l => l.campaign_id);
        const { data: camps } = await supabase.from('meta_campaigns').select('ad_account_id').in('campaign_id', cIds);
        const distinctAccs = Array.from(new Set(camps?.map(c => c.ad_account_id) || []));
        fetchLiveMetrics(distinctAccs, datePreset, cIds);
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

  async function fetchLiveMetrics(accIds: string[], preset: string, filterCIds?: string[]) {
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
      
      const sortActiveFirst = (a: any, b: any) => {
         if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
         if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
         return 0;
      };

      setLiveMetrics({ 
        campaigns: (filterCIds ? mergedCamps.filter(c => filterCIds.includes(c.campaign_id)) : mergedCamps).sort(sortActiveFirst), 
        adsets: (filterCIds ? mergedAdsets.filter(a => filterCIds.includes(a.campaign_id)) : mergedAdsets).sort(sortActiveFirst), 
        ads: (filterCIds ? mergedAds.filter(a => filterCIds.includes(a.campaign_id)) : mergedAds).sort(sortActiveFirst)
      });
      
      // Auto Evaluate Rules in background if there are rules
      if (rules.length > 0) {
        evalRulesLocally((filterCIds ? mergedCamps.filter(c => filterCIds.includes(c.campaign_id)) : mergedCamps));
      }

    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro na API da Meta' });
    } finally {
      setFetchingLive(false);
    }
  }

  useEffect(() => {
    if (user && !loading) {
      if (productAdAccount?.ad_account_id) {
         fetchLiveMetrics([productAdAccount.ad_account_id], datePreset);
      } else if (linkedCampaigns.length > 0) {
        const cIds = linkedCampaigns.map(l => l.campaign_id);
        supabase.from('meta_campaigns').select('ad_account_id').in('campaign_id', cIds).then(({data}) => {
          const distinctAccs = Array.from(new Set(data?.map(c => c.ad_account_id) || []));
          fetchLiveMetrics(distinctAccs, datePreset, cIds);
        });
      }
    }
  }, [datePreset]);

  // Regras Backend trigger
  async function runRulesNow() {
    if (!user) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/meta/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, productId: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Regras executadas com sucesso!', description: `${data.actionsTaken} ações aplicadas na Meta.` });
      // Reload metrics
      if (productAdAccount?.ad_account_id) fetchLiveMetrics([productAdAccount.ad_account_id], datePreset);
    } catch(e:any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setUpdating(false);
    }
  }

  // Dummy local eval just for display if needed
  function evalRulesLocally(camps: any[]) {
    // This happens silently, real execution is done via button to avoid infinite loops
  }

  // KPIs
  const kpis = useMemo(() => {
    let spend = 0, clicks = 0, impressions = 0;
    liveMetrics.campaigns.forEach(c => {
      spend += Number(c.spend || 0);
      clicks += Number(c.clicks || 0);
      impressions += Number(c.impressions || 0);
    });

    // Real Revenue and Purchases from Webhook Events
    let realRevenue = 0, realPurchases = 0;
    events.filter(e => e.status === 'approved' && e.event_type === 'purchase').forEach(e => {
       realRevenue += Number(e.event_value || 0);
       realPurchases += 1;
    });

    // Fallback to Meta Data if no Webhook data exists
    if (realPurchases === 0 && liveMetrics.campaigns.length > 0) {
      liveMetrics.campaigns.forEach(c => {
        const pAct = c.actions?.find((a:any) => a.action_type === 'purchase');
        if (pAct) realPurchases += Number(pAct.value || 0);
        const rAct = c.action_values?.find((a:any) => a.action_type === 'purchase');
        if (rAct) realRevenue += Number(rAct.value || 0);
      });
    }

    const prodCost = realPurchases * (product?.product_cost || 0);
    
    let taxesAmount = 0;
    taxes.forEach(t => {
      taxesAmount += Number(t.fixed_amount || 0);
      if (t.percentage) taxesAmount += (realRevenue * (Number(t.percentage) / 100));
    });

    let expensesAmount = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

    const profit = realRevenue - spend - prodCost - taxesAmount - expensesAmount;
    const roas = spend > 0 ? realRevenue / spend : 0;
    const roi = spend > 0 ? profit / spend : 0;
    const cpa = realPurchases > 0 ? spend / realPurchases : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return { spend, revenue: realRevenue, purchases: realPurchases, prodCost, taxesAmount, expensesAmount, profit, roas, roi, cpa, cpc, cpm, ctr };
  }, [liveMetrics, product, taxes, expenses, events]);

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

  // Status and Budget Modals
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

  // CRUD Despesas
  const addExpense = async () => {
    if(!newExp.name || !newExp.amount) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase.from('product_expenses').insert({
        user_id: user!.uid, product_id: id, name: newExp.name, amount: Number(newExp.amount), expense_date: newExp.date
      }).select().single();
      if (error) throw error;
      setExpenses([data, ...expenses]);
      setNewExp({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
      toast({ title: 'Despesa adicionada' });
    } catch(e:any) { toast({ variant: 'destructive', description: e.message }); }
    setUpdating(false);
  };

  const deleteExpense = async (eid: string) => {
    await supabase.from('product_expenses').delete().eq('id', eid);
    setExpenses(expenses.filter(e => e.id !== eid));
  };

  // CRUD Taxas
  const addTax = async () => {
    if(!newTax.name) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase.from('product_taxes').insert({
        user_id: user!.uid, product_id: id, name: newTax.name, 
        percentage: Number(newTax.percentage) || 0, fixed_amount: Number(newTax.fixed) || 0
      }).select().single();
      if (error) throw error;
      setTaxes([data, ...taxes]);
      setNewTax({ name: '', percentage: '', fixed: '' });
      toast({ title: 'Taxa adicionada' });
    } catch(e:any) { toast({ variant: 'destructive', description: e.message }); }
    setUpdating(false);
  };

  const deleteTax = async (tid: string) => {
    await supabase.from('product_taxes').delete().eq('id', tid);
    setTaxes(taxes.filter(t => t.id !== tid));
  };

  // CRUD Rules
  const addRule = async () => {
    if(!newRule.name || !newRule.value) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase.from('product_rules').insert({
        user_id: user!.uid, product_id: id, name: newRule.name, 
        condition_metric: newRule.metric, condition_operator: newRule.operator, condition_value: Number(newRule.value),
        action_type: newRule.action, action_value: Number(newRule.actionValue) || null
      }).select().single();
      if (error) throw error;
      setRules([data, ...rules]);
      setNewRule({ name: '', metric: 'cpa', operator: '>', value: '', action: 'pause_campaign', actionValue: '' });
      toast({ title: 'Regra criada' });
    } catch(e:any) { toast({ variant: 'destructive', description: e.message }); }
    setUpdating(false);
  };

  const deleteRule = async (rid: string) => {
    await supabase.from('product_rules').delete().eq('id', rid);
    setRules(rules.filter(r => r.id !== rid));
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
                  <p className="text-sm text-slate-400 font-medium mb-1">Faturamento Bruto (Real)</p>
                  <p className="text-2xl font-bold font-headline text-green-400">{formatCurrency(kpis.revenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpis.purchases} Vendas</p>
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
               <div className="max-w-4xl space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline mb-2">Webhook Exclusivo</h2>
                   <p className="text-sm text-slate-400 mb-4">Configure esta URL na Hotmart, Kiwify ou PerfectPay. O sistema lerá os dados automaticamente.</p>
                   <div className="flex gap-2">
                     <Input readOnly value={`http://localhost:9002/api/webhook/${id}`} className="bg-[#0f1115] font-mono text-xs border-white/10 text-primary" />
                     <Button variant="secondary" onClick={() => {navigator.clipboard.writeText(`http://localhost:9002/api/webhook/${id}`); toast({title:'Copiado'})}}><Copy className="w-4 h-4 mr-2"/> Copiar</Button>
                   </div>
                 </div>
                 <div className="border border-white/10 rounded-lg bg-[#1a1c23] overflow-hidden">
                    <h3 className="font-bold text-sm p-4 border-b border-white/5 flex items-center gap-2"><Activity className="w-4 h-4"/> Eventos Reais Recebidos</h3>
                    {events.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento recebido ainda.</p>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#14151a] text-xs uppercase text-slate-400">
                          <tr>
                            <th className="px-4 py-2">Data</th>
                            <th className="px-4 py-2">Evento</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Cliente</th>
                            <th className="px-4 py-2">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {events.slice(0,20).map(e => (
                            <tr key={e.id} className="hover:bg-white/5">
                              <td className="px-4 py-2 text-xs">{new Date(e.created_at).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-2 font-bold text-primary">{e.event_type.toUpperCase()}</td>
                              <td className="px-4 py-2">{e.status === 'approved' ? <Badge className="bg-green-500">Aprovado</Badge> : <Badge variant="secondary">{e.status}</Badge>}</td>
                              <td className="px-4 py-2 text-xs">{e.customer_email || e.customer_name || 'Desconhecido'}</td>
                              <td className="px-4 py-2">{formatCurrency(e.event_value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                 </div>
               </div>
            </TabsContent>

            {/* ABA: REGRAS (AUTOMATION) */}
            <TabsContent value="rules" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-4xl space-y-6">
                 <div className="flex justify-between items-center">
                   <div>
                     <h2 className="text-xl font-bold font-headline">Motor de Regras Automáticas</h2>
                     <p className="text-sm text-muted-foreground">O sistema avalia essas regras e atua no Meta Ads automaticamente.</p>
                   </div>
                   <Button onClick={runRulesNow} disabled={updating} className="bg-primary text-white"><Play className="w-4 h-4 mr-2"/> Rodar Regras Agora</Button>
                 </div>
                 
                 <div className="p-4 border border-white/5 bg-[#1a1c23] rounded-lg space-y-4">
                   <h3 className="font-bold text-sm">Criar Nova Regra</h3>
                   <div className="grid grid-cols-5 gap-2">
                     <Input placeholder="Nome da Regra" value={newRule.name} onChange={e=>setNewRule({...newRule, name: e.target.value})} className="bg-[#0f1115] border-white/10 col-span-5" />
                     
                     <Select value={newRule.metric} onValueChange={v=>setNewRule({...newRule, metric: v})}>
                       <SelectTrigger className="bg-[#0f1115] border-white/10"><SelectValue placeholder="Métrica"/></SelectTrigger>
                       <SelectContent className="bg-[#1a1a1a]"><SelectItem value="cpa">CPA</SelectItem><SelectItem value="roas">ROAS</SelectItem><SelectItem value="spend">Gasto</SelectItem></SelectContent>
                     </Select>
                     
                     <Select value={newRule.operator} onValueChange={v=>setNewRule({...newRule, operator: v})}>
                       <SelectTrigger className="bg-[#0f1115] border-white/10"><SelectValue/></SelectTrigger>
                       <SelectContent className="bg-[#1a1a1a]"><SelectItem value=">">Maior que</SelectItem><SelectItem value="<">Menor que</SelectItem></SelectContent>
                     </Select>

                     <Input type="number" placeholder="Valor" value={newRule.value} onChange={e=>setNewRule({...newRule, value: e.target.value})} className="bg-[#0f1115] border-white/10" />
                     
                     <Select value={newRule.action} onValueChange={v=>setNewRule({...newRule, action: v})}>
                       <SelectTrigger className="bg-[#0f1115] border-white/10"><SelectValue/></SelectTrigger>
                       <SelectContent className="bg-[#1a1a1a]">
                         <SelectItem value="pause_campaign">Pausar Campanha</SelectItem>
                         <SelectItem value="pause_adset">Pausar Conjunto</SelectItem>
                         <SelectItem value="increase_budget">Aumentar Orçamento %</SelectItem>
                       </SelectContent>
                     </Select>

                     <div className="flex gap-2">
                       {newRule.action === 'increase_budget' && <Input type="number" placeholder="%" value={newRule.actionValue} onChange={e=>setNewRule({...newRule, actionValue: e.target.value})} className="bg-[#0f1115] border-white/10 w-16" />}
                       <Button onClick={addRule} disabled={updating || !newRule.name} className="flex-1">Salvar</Button>
                     </div>
                   </div>
                 </div>

                 <div className="space-y-2">
                    {rules.map(r => (
                      <div key={r.id} className="flex justify-between items-center p-3 border border-white/5 bg-[#14151a] rounded-lg">
                        <div>
                          <span className="font-bold block">{r.name}</span>
                          <span className="text-xs text-muted-foreground">SE {r.condition_metric.toUpperCase()} {r.condition_operator} {r.condition_value} ENTÃO {r.action_type} {r.action_value ? `${r.action_value}%` : ''}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteRule(r.id)}><Trash className="w-4 h-4"/></Button>
                      </div>
                    ))}
                 </div>
               </div>
            </TabsContent>

            {/* ABA: TAXAS */}
            <TabsContent value="taxes" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-2xl space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline">Taxas e Impostos</h2>
                   <p className="text-sm text-muted-foreground mb-4">Elas são deduzidas automaticamente do Faturamento Bruto (via Webhook).</p>
                 </div>
                 
                 <div className="flex gap-2 items-center">
                    <Input placeholder="Ex: Gateway, Imposto..." value={newTax.name} onChange={e=>setNewTax({...newTax, name: e.target.value})} className="bg-[#0f1115] border-white/10" />
                    <Input type="number" placeholder="% (Ex: 4.99)" value={newTax.percentage} onChange={e=>setNewTax({...newTax, percentage: e.target.value})} className="bg-[#0f1115] border-white/10 w-32" />
                    <Input type="number" placeholder="Fixo (R$ 1.00)" value={newTax.fixed} onChange={e=>setNewTax({...newTax, fixed: e.target.value})} className="bg-[#0f1115] border-white/10 w-32" />
                    <Button onClick={addTax} disabled={updating || !newTax.name}><Plus className="w-4 h-4"/></Button>
                 </div>

                 <div className="space-y-2">
                    {taxes.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 border border-white/5 bg-[#1a1c23] rounded-lg">
                        <span>{t.name}</span>
                        <div className="flex items-center gap-4">
                           <span className="font-bold text-orange-400">{t.percentage ? `${t.percentage}%` : formatCurrency(t.fixed_amount)}</span>
                           <Button variant="ghost" size="icon" className="text-red-500 h-6 w-6" onClick={() => deleteTax(t.id)}><Trash className="w-3 h-3"/></Button>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            </TabsContent>

            {/* ABA: DESPESAS */}
            <TabsContent value="expenses" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-2xl space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline">Despesas Avulsas</h2>
                   <p className="text-sm text-muted-foreground mb-4">Lancamentos de despesas da operação que corroem o seu Lucro.</p>
                 </div>
                 
                 <div className="flex gap-2 items-center">
                    <Input placeholder="Ex: Gestor, Designer..." value={newExp.name} onChange={e=>setNewExp({...newExp, name: e.target.value})} className="bg-[#0f1115] border-white/10" />
                    <Input type="number" placeholder="Valor (R$)" value={newExp.amount} onChange={e=>setNewExp({...newExp, amount: e.target.value})} className="bg-[#0f1115] border-white/10 w-32" />
                    <Input type="date" value={newExp.date} onChange={e=>setNewExp({...newExp, date: e.target.value})} className="bg-[#0f1115] border-white/10 w-40" />
                    <Button onClick={addExpense} disabled={updating || !newExp.name || !newExp.amount}><Plus className="w-4 h-4"/></Button>
                 </div>

                 <div className="space-y-2">
                    {expenses.map(e => (
                      <div key={e.id} className="flex justify-between items-center p-3 border border-white/5 bg-[#1a1c23] rounded-lg">
                        <div>
                           <span className="block font-medium">{e.name}</span>
                           <span className="text-xs text-muted-foreground">{new Date(e.expense_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="font-bold text-red-400">-{formatCurrency(e.amount)}</span>
                           <Button variant="ghost" size="icon" className="text-red-500 h-6 w-6" onClick={() => deleteExpense(e.id)}><Trash className="w-3 h-3"/></Button>
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
                  <Select value={selectedAccId || productAdAccount?.ad_account_id} onValueChange={async (accId) => {
                    setSelectedAccId(accId);
                    const { data: existing } = await supabase.from('product_ad_accounts').select('id').eq('product_id', id).maybeSingle();
                    if (existing) {
                      await supabase.from('product_ad_accounts').update({ ad_account_id: accId }).eq('id', existing.id);
                    } else {
                      await supabase.from('product_ad_accounts').insert({ user_id: user!.uid, product_id: id, ad_account_id: accId });
                    }
                    setProductAdAccount({ ad_account_id: accId });
                    toast({ title: 'Conta de anúncio vinculada' });
                    fetchLiveMetrics([accId], datePreset);
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-white/10"><SelectValue placeholder="Escolha uma conta de anúncio..." /></SelectTrigger>
                    <SelectContent className="bg-[#1a1c23] border-white/10">
                      {allAccounts.map(a => <SelectItem key={a.account_id} value={a.account_id}>{a.account_name} ({a.account_id})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-4">Ao selecionar uma conta principal, o produto puxará automaticamente todas as campanhas desta conta.</p>
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
            <Button className="bg-primary text-white font-bold" onClick={handleApplyBudget} disabled={updating || !budgetValue}>Aplicar Orçamento</Button>
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
