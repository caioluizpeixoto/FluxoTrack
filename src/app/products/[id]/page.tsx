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
  Percent, Link as LinkIcon, Webhook, Code2, Zap, FileText, Plus, Trash, Copy, Play, Edit2,
  Bell, Volume2, Pencil, Filter, MousePointerClick, ShoppingCart, ChevronRight
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
  const [pixelToken, setPixelToken] = useState("");
  const [icTriggerText, setIcTriggerText] = useState("");
  const [icTriggerUrl, setIcTriggerUrl] = useState("");
  const [productAdAccount, setProductAdAccount] = useState<any>(null);
  
  // Live Metrics
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<{ campaigns: any[], adsets: any[], ads: any[] }>({ campaigns: [], adsets: [], ads: [] });

  // Settings State
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<string>("");

  const [metaTab, setMetaTab] = useState("campanhas");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdsetIds, setSelectedAdsetIds] = useState<string[]>([]);

  // Layout State
  const defaultLayout = ['revenue', 'pending', 'spend', 'costs', 'profit', 'roi', 'roas', 'cpa', 'cpc', 'cpm', 'ctr', 'arpu', 'last_sale', 'funnel'];
  const [visibleCards, setVisibleCards] = useState<string[]>(defaultLayout);
  const [layoutModal, setLayoutModal] = useState(false);

  // Modals & Forms
  const [budgetModal, setBudgetModal] = useState<any>(null);
  const [budgetValue, setBudgetValue] = useState("");
  
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  // Forms State
  const [newTax, setNewTax] = useState({ name: '', percentage: '', fixed: '' });
  const [newExp, setNewExp] = useState({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [newRule, setNewRule] = useState({ name: '', metric: 'cpa', operator: '>', value: '', action: 'pause_campaign', actionValue: '' });

  // Notifications State
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyApp, setNotifyApp] = useState(true);
  const [notifyPend, setNotifyPend] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState("default");
  const [permissionStatus, setPermissionStatus] = useState("default");

  useEffect(() => { 
    setMounted(true); 
    if (typeof window !== "undefined") {
      setNotifyEnabled(localStorage.getItem("notifications_enabled") !== "false");
      setNotifyApp(localStorage.getItem("notify_approved") !== "false");
      setNotifyPend(localStorage.getItem("notify_pending") !== "false");
      setSoundEnabled(localStorage.getItem("sound_enabled") !== "false");
      setSoundType(localStorage.getItem("sound_type") || "default");
      setIcTriggerText(localStorage.getItem(`ic_text_${id}`) || "");
      setIcTriggerUrl(localStorage.getItem(`ic_url_${id}`) || "");
      
      const savedLayout = localStorage.getItem(`dashboard_layout_${id}`);
      if (savedLayout) setVisibleCards(JSON.parse(savedLayout));

      if ("Notification" in window) {
        setPermissionStatus(Notification.permission);
      }
    }
  }, [id]);

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === "granted") {
        toast({ title: "✓ Permissão Concedida!", description: "Você receberá alertas de vendas em tempo real." });
      } else {
        toast({ variant: "destructive", title: "Permissão Negada", description: "Ative nas configurações do seu navegador para receber alertas." });
      }
    }
  };

  const handleCustomSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Escolha um arquivo de áudio de até 500KB." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      localStorage.setItem("custom_sound_base64", base64String);
      localStorage.setItem("sound_type", "custom");
      setSoundType("custom");
      toast({ title: "✓ Som carregado!", description: "Som customizado salvo localmente." });
    };
    reader.readAsDataURL(file);
  };

  const testNotification = async () => {
    // Play sound
    if (soundEnabled) {
      try {
        let audioUrl = "https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav";
        if (soundType === "custom") {
          const customBase64 = localStorage.getItem("custom_sound_base64");
          if (customBase64) {
            audioUrl = customBase64;
          }
        }
        const audio = new Audio(audioUrl);
        await audio.play();
      } catch (soundErr) {
        console.warn("Falha ao tocar áudio no teste:", soundErr);
      }
    }

    // Show push notification
    if (notifyEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("💰 Venda Aprovada! (Teste)", {
        body: "Produto: Teste de Notificações | Valor: R$ 97,00",
        icon: "https://placehold.co/192x192/1877F2/FFF?text=AP",
      });
    }

    toast({ title: "🔊 Teste executado!", description: "Disparamos o alerta de teste." });
  };

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
      setPixelToken(pixelRes.data?.access_token || "");
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
    let spend = 0, clicks = 0, impressions = 0, ic = 0, pageViews = 0;
    liveMetrics.campaigns.forEach(c => {
      spend += Number(c.spend || 0);
      clicks += Number(c.clicks || 0);
      impressions += Number(c.impressions || 0);
      const icAction = c.actions?.find((a:any) => a.action_type === 'initiate_checkout');
      if (icAction) ic += Number(icAction.value || 0);
      const pvAction = c.actions?.find((a:any) => a.action_type === 'landing_page_view' || a.action_type === 'outbound_clicks');
      if (pvAction) pageViews += Number(pvAction.value || 0);
    });

    if (pageViews === 0) pageViews = clicks;

    let realRevenue = 0, realPurchases = 0;
    let pendingPurchases = 0, pendingRevenue = 0;
    
    events.filter(e => e.event_type === 'purchase').forEach(e => {
       if (e.status === 'approved') {
         realRevenue += Number(e.event_value || 0);
         realPurchases += 1;
       } else if (e.status === 'pending' || e.status === 'generated') {
         pendingRevenue += Number(e.event_value || 0);
         pendingPurchases += 1;
       }
    });

    const lastSale = events.find(e => e.status === 'approved' && e.event_type === 'purchase');
    let lastSaleProduct = 'Nenhum';
    let lastSaleSource = 'Desconhecido';
    
    if (lastSale && lastSale.raw_payload) {
      const payload = lastSale.raw_payload;
      if (payload.product?.title || payload.product?.name) {
         lastSaleProduct = payload.product.title || payload.product.name;
      } else if (payload.checkout?.title) {
         lastSaleProduct = payload.checkout.title;
      }
      if (payload.tracking) {
         const source = payload.tracking.utm_source || 'Orgânico';
         const medium = payload.tracking.utm_medium || '';
         lastSaleSource = medium ? `${source} / ${medium}` : source;
      } else {
         lastSaleSource = 'Orgânico / Direto';
      }
    }

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
    const arpu = realPurchases > 0 ? realRevenue / realPurchases : 0;

    return { 
      spend, revenue: realRevenue, purchases: realPurchases, pendingPurchases, pendingRevenue, 
      prodCost, taxesAmount, expensesAmount, profit, roas, roi, cpa, cpc, cpm, ctr, arpu, 
      lastSaleProduct, lastSaleSource, clicks, impressions, ic, pageViews 
    };
  }, [liveMetrics, product, taxes, expenses, events]);

  const getMetric = (level: 'campaigns'|'adsets'|'ads', idKey: string, idVal: string) => {
    const item = liveMetrics[level].find((m: any) => m[idKey] === idVal);
    if (!item) return { spend: 0, purchases: 0, revenue: 0, roas: 0, cpa: 0, clicks: 0, impressions: 0, ctr: 0, cpc: 0, cpv: 0, cpi: 0, ic: 0, roi: 0, status: 'UNKNOWN', name: 'N/A', daily_budget: 0, lifetime_budget: 0 };
    
    const spend = Number(item.spend || 0);
    const clicks = Number(item.clicks || 0);
    const impressions = Number(item.impressions || 0);
    const ctr = Number(item.ctr || 0);
    const cpc = Number(item.cpc || 0);

    let purchases = 0, revenue = 0, videoViews = 0, checkoutInits = 0;
    if (item.actions) {
      const pAction = item.actions.find((a: any) => a.action_type === 'purchase');
      if (pAction) purchases = Number(pAction.value || 0);
      const vAction = item.actions.find((a: any) => a.action_type === 'video_view');
      if (vAction) videoViews = Number(vAction.value || 0);
      const cAction = item.actions.find((a: any) => a.action_type === 'initiate_checkout');
      if (cAction) checkoutInits = Number(cAction.value || 0);
    }
    if (item.action_values) {
      const pRev = item.action_values.find((a: any) => a.action_type === 'purchase');
      if (pRev) revenue = Number(pRev.value || 0);
    }

    const roas = spend > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const cpv = videoViews > 0 ? spend / videoViews : 0;
    const cpi = checkoutInits > 0 ? spend / checkoutInits : 0;
    const ic = clicks > 0 ? (purchases / clicks) * 100 : 0;
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

    return { 
      spend, purchases, revenue, roas, cpa, clicks, impressions, ctr, cpc, cpv, cpi, ic, roi,
      status: item.status, name: item.name, 
      daily_budget: Number(item.daily_budget || 0) / 100, 
      lifetime_budget: Number(item.lifetime_budget || 0) / 100 
    };
  };

  // Status and Budget Modals
  const confirmToggleStatus = async () => {
    if (!confirmModal || !user) return;

    // Mapeamentos
    const tableMap:   Record<string, string>                   = { campaign: 'meta_campaigns', adset: 'meta_adsets', ad: 'meta_ads' };
    const idMap:      Record<string, string>                   = { campaign: 'campaign_id',    adset: 'adset_id',    ad: 'ad_id'    };
    const levelMap:   Record<string, 'campaigns'|'adsets'|'ads'> = { campaign: 'campaigns',  adset: 'adsets',      ad: 'ads'      };

    const level   = levelMap[confirmModal.type];
    const itemKey = idMap[confirmModal.type];

    // Descobre o status atual a partir dos liveMetrics (sem bater na API)
    const currentItem   = (liveMetrics[level] as any[]).find(i => i[itemKey] === confirmModal.id);
    const currentStatus = currentItem?.status ?? 'ACTIVE';
    const newStatus     = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    // Snapshot para rollback
    const snapshot = confirmModal;

    // ── OPTIMISTIC UPDATE ──────────────────────────────────────────────
    // Fecha modal e vira o switch instantaneamente — sem esperar a API
    setConfirmModal(null);
    setLiveMetrics(prev => ({
      ...prev,
      [level]: (prev[level] as any[]).map(i =>
        i[itemKey] === snapshot.id ? { ...i, status: newStatus } : i
      ),
    }));
    // ──────────────────────────────────────────────────────────────────

    // Chamada de API em background
    try {
      const res = await fetch('/api/meta/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, type: snapshot.type, id: snapshot.id, payload: { status: newStatus } }),
      });
      const resData = await res.json();

      if (!res.ok) {
        // ── ROLLBACK ── reverte visualmente se a API falhar
        setLiveMetrics(prev => ({
          ...prev,
          [level]: (prev[level] as any[]).map(i =>
            i[itemKey] === snapshot.id ? { ...i, status: currentStatus } : i
          ),
        }));
        const errMsg: string = resData.error || 'Erro desconhecido';
        if (errMsg.includes('missing permissions') || errMsg.includes('does not exist') || errMsg.includes('Unsupported post')) {
          throw new Error('Sem permissão. Vá em Integrações e reconecte sua conta Meta Ads.');
        }
        throw new Error(errMsg);
      }

      // Atualiza banco local silenciosamente
      supabase.from(tableMap[snapshot.type]).update({ status: newStatus }).eq(idMap[snapshot.type], snapshot.id).then();
      toast({ title: `${newStatus === 'ACTIVE' ? '▶ Ativado' : '⏸ Pausado'}`, description: snapshot.name });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao alterar status', description: e.message });
    }
  };


  const handleApplyBudget = async () => {
    if (!budgetModal || !user || !budgetValue) return;

    const snapshot  = budgetModal;
    const newBudget = Number(budgetValue);
    const levelMap: Record<string, 'campaigns'|'adsets'|'ads'> = { campaign: 'campaigns', adset: 'adsets', ad: 'ads' };
    const idKeyMap:  Record<string, string> = { campaign: 'campaign_id', adset: 'adset_id', ad: 'ad_id' };
    const budgetKey  = 'daily_budget';
    const level      = levelMap[snapshot.type];
    const itemKey    = idKeyMap[snapshot.type];

    // Guarda valor antigo para rollback
    const currentItem = level ? (liveMetrics[level] as any[])?.find(i => i[itemKey] === snapshot.id) : null;
    const oldBudget   = currentItem?.[budgetKey];

    // ── OPTIMISTIC UPDATE ──────────────────────────────────────────────
    // Fecha modal e mostra novo orçamento imediatamente
    setBudgetModal(null);
    if (level && currentItem) {
      setLiveMetrics(prev => ({
        ...prev,
        [level]: (prev[level] as any[]).map(i =>
          i[itemKey] === snapshot.id ? { ...i, [budgetKey]: String(newBudget * 100) } : i
        ),
      }));
    }
    // ──────────────────────────────────────────────────────────────────

    try {
      const res = await fetch('/api/meta/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid, type: snapshot.type, id: snapshot.id,
          action: 'fixed', value: newBudget,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // ── ROLLBACK ──
        if (level && currentItem && oldBudget !== undefined) {
          setLiveMetrics(prev => ({
            ...prev,
            [level]: (prev[level] as any[]).map(i =>
              i[itemKey] === snapshot.id ? { ...i, [budgetKey]: oldBudget } : i
            ),
          }));
        }
        const errMsg: string = data.error || 'Falha ao atualizar orçamento';
        if (errMsg.includes('missing permissions') || errMsg.includes('does not exist') || errMsg.includes('Unsupported post')) {
          throw new Error('Sem permissão para alterar orçamento. Vá em Integrações e reconecte sua conta Meta Ads.');
        }
        throw new Error(errMsg);
      }
      toast({ title: 'Orçamento atualizado!', description: `R$ ${newBudget.toFixed(2)}/dia aplicado em ${snapshot.name}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao alterar orçamento', description: e.message });
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
      <main className="flex-1 w-full p-4 lg:p-8 transition-all md:h-screen md:flex md:flex-col md:overflow-hidden">
        
        <header className="mb-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <LinkNext href={`/dashboards/${product.dashboard_id}`}>
              <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full"><ArrowLeft className="w-5 h-5"/></Button>
            </LinkNext>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">{product.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={datePreset} onValueChange={(val) => setDatePreset(val)}>
              <SelectTrigger className="h-9 w-full sm:w-[150px] bg-[#1a1c23] border-white/10 font-bold"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                <SelectItem value="this_month">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-[#1a1c23] border-white/10 hover:bg-white/5 w-full sm:w-auto" onClick={() => loadProductData()}>
              <RefreshCw className={`w-4 h-4 mr-2 ${fetchingLive ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </header>

        <Card className="flex-1 bg-[#14151a] border-white/5 flex flex-col overflow-hidden relative">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1">
            <div className="border-b border-white/5 px-2 shrink-0 overflow-x-auto no-scrollbar">
              <TabsList className="bg-transparent h-14 p-0 justify-start gap-4 inline-flex w-max">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Activity className="w-3 h-3 mr-1"/> Resumo</TabsTrigger>
                <TabsTrigger value="meta" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><BarChart3 className="w-3 h-3 mr-1"/> Meta Ads</TabsTrigger>
                <TabsTrigger value="pixel" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Code2 className="w-3 h-3 mr-1"/> Pixel</TabsTrigger>
                <TabsTrigger value="webhooks" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Webhook className="w-3 h-3 mr-1"/> Webhooks</TabsTrigger>
                <TabsTrigger value="utms" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><LinkIcon className="w-3 h-3 mr-1"/> UTMs</TabsTrigger>
                <TabsTrigger value="rules" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Zap className="w-3 h-3 mr-1"/> Regras</TabsTrigger>
                <TabsTrigger value="taxes" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Percent className="w-3 h-3 mr-1"/> Taxas</TabsTrigger>
                <TabsTrigger value="expenses" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><DollarSign className="w-3 h-3 mr-1"/> Despesas</TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><FileText className="w-3 h-3 mr-1"/> Relatórios</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Settings className="w-3 h-3 mr-1"/> Config</TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><Bell className="w-3 h-3 mr-1"/> Notificações</TabsTrigger>
              </TabsList>
            </div>

            {/* ABA: RESUMO */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-slate-200">Painel de Métricas</h2>
                 <Button variant="outline" size="sm" onClick={() => setLayoutModal(true)} className="bg-[#1a1c23] border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                   <Pencil className="w-4 h-4 mr-2"/> Customizar Layout
                 </Button>
               </div>

               {/* Principais Cards Grandes */}
               <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                 {visibleCards.includes('revenue') && (
                   <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center">
                     <p className="text-sm text-slate-400 font-medium mb-1">Faturamento Bruto (Real)</p>
                     <p className="text-2xl font-bold font-headline text-green-400">{formatCurrency(kpis.revenue)}</p>
                     <p className="text-xs text-muted-foreground mt-1">{kpis.purchases} Vendas</p>
                   </Card>
                 )}
                 {visibleCards.includes('pending') && (
                   <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center">
                     <p className="text-sm text-slate-400 font-medium mb-1">Faturamento Pendente</p>
                     <p className="text-2xl font-bold font-headline text-amber-500">{formatCurrency(kpis.pendingRevenue)}</p>
                     <p className="text-xs text-muted-foreground mt-1">{kpis.pendingPurchases} Compras Pendentes</p>
                   </Card>
                 )}
                 {visibleCards.includes('spend') && (
                   <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center">
                     <p className="text-sm text-slate-400 font-medium mb-1">Gasto Ads</p>
                     <p className="text-2xl font-bold font-headline text-red-400">{formatCurrency(kpis.spend)}</p>
                   </Card>
                 )}
                 {visibleCards.includes('costs') && (
                   <Card className="bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center">
                     <p className="text-sm text-slate-400 font-medium mb-1">Custos & Taxas</p>
                     <p className="text-2xl font-bold font-headline text-orange-400">{formatCurrency(kpis.prodCost + kpis.taxesAmount + kpis.expensesAmount)}</p>
                   </Card>
                 )}
                 {visibleCards.includes('profit') && (
                   <Card className="bg-[#1a1c23] border border-primary/20 p-4 flex flex-col justify-center">
                     <p className="text-sm text-primary font-medium mb-1">Lucro Líquido</p>
                     <p className={`text-3xl font-bold font-headline ${kpis.profit > 0 ? 'text-green-500' : kpis.profit < 0 ? 'text-red-500' : 'text-slate-300'}`}>{formatCurrency(kpis.profit)}</p>
                   </Card>
                 )}
               </div>

               {/* Cards Secundários */}
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                 {visibleCards.includes('roi') && <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">ROI</p><p className="font-bold">{kpis.roi.toFixed(2)}%</p></Card>}
                 {visibleCards.includes('roas') && <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">ROAS</p><p className="font-bold">{kpis.roas.toFixed(2)}x</p></Card>}
                 {visibleCards.includes('cpa') && <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">CPA</p><p className="font-bold">{formatCurrency(kpis.cpa)}</p></Card>}
                 {visibleCards.includes('cpc') && <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">CPC</p><p className="font-bold">{formatCurrency(kpis.cpc)}</p></Card>}
                 {visibleCards.includes('cpm') && <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">CPM</p><p className="font-bold">{formatCurrency(kpis.cpm)}</p></Card>}
                 {visibleCards.includes('ctr') && <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">CTR</p><p className="font-bold">{kpis.ctr.toFixed(2)}%</p></Card>}
                 {visibleCards.includes('arpu') && <Card className="bg-[#1a1c23] border-white/5 p-3 text-center"><p className="text-xs text-slate-400 mb-1">Ticket Médio (ARPU)</p><p className="font-bold text-green-400">{formatCurrency(kpis.arpu)}</p></Card>}
                 {visibleCards.includes('last_sale') && (
                   <Card className="bg-[#1a1c23] border-white/5 p-3 flex flex-col justify-center text-center col-span-2">
                     <p className="text-xs text-slate-400 mb-1">Última Venda</p>
                     <p className="text-sm font-bold text-slate-200 truncate" title={kpis.lastSaleProduct}>{kpis.lastSaleProduct}</p>
                     <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 truncate" title={kpis.lastSaleSource}>Via: {kpis.lastSaleSource}</p>
                   </Card>
                 )}
               </div>

               {/* Funil de Vendas */}
               {visibleCards.includes('funnel') && (
                 <div>
                   <h3 className="font-bold text-slate-300 mb-3 text-sm flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /> Rastreamento de Funil</h3>
                   <Card className="bg-[#1a1c23] border-white/5 p-6 overflow-hidden">
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-2">
                       
                       {/* Clicks */}
                       <div className="flex-1 w-full flex flex-col items-center text-center relative group">
                          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-blue-500/20">
                            <MousePointerClick className="w-5 h-5 text-blue-400"/>
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Cliques no Link</p>
                          <p className="text-2xl font-headline font-bold text-slate-200">{kpis.clicks.toLocaleString('pt-BR')}</p>
                          <div className="hidden sm:block absolute -right-3 top-6 z-10 text-white/10"><ChevronRight className="w-5 h-5"/></div>
                       </div>
               
                       {/* PageViews */}
                       <div className="flex-1 w-full flex flex-col items-center text-center relative group">
                          <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-cyan-500/20">
                            <Eye className="w-5 h-5 text-cyan-400"/>
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Viram a Página</p>
                          <p className="text-2xl font-headline font-bold text-slate-200">{kpis.pageViews.toLocaleString('pt-BR')}</p>
                          <p className="text-[10px] font-bold text-cyan-400 mt-1">{kpis.clicks > 0 ? ((kpis.pageViews / kpis.clicks)*100).toFixed(1) : 0}% dos cliques</p>
                          <div className="hidden sm:block absolute -right-3 top-6 z-10 text-white/10"><ChevronRight className="w-5 h-5"/></div>
                       </div>
               
                       {/* IC */}
                       <div className="flex-1 w-full flex flex-col items-center text-center relative group">
                          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-orange-500/20">
                            <ShoppingCart className="w-5 h-5 text-orange-400"/>
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Checkouts Abertos</p>
                          <p className="text-2xl font-headline font-bold text-slate-200">{kpis.ic.toLocaleString('pt-BR')}</p>
                          <p className="text-[10px] font-bold text-orange-400 mt-1">{kpis.pageViews > 0 ? ((kpis.ic / kpis.pageViews)*100).toFixed(1) : 0}% das visitas</p>
                          <div className="hidden sm:block absolute -right-3 top-6 z-10 text-white/10"><ChevronRight className="w-5 h-5"/></div>
                       </div>

                       {/* Vendas Geradas */}
                       <div className="flex-1 w-full flex flex-col items-center text-center relative group">
                          <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-purple-500/20">
                            <FileText className="w-5 h-5 text-purple-400"/>
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Vendas Geradas</p>
                          <p className="text-2xl font-headline font-bold text-slate-200">{(kpis.purchases + kpis.pendingPurchases).toLocaleString('pt-BR')}</p>
                          <p className="text-[10px] font-bold text-purple-400 mt-1">{kpis.ic > 0 ? (((kpis.purchases + kpis.pendingPurchases) / kpis.ic)*100).toFixed(1) : 0}% de conv. do IC</p>
                          <div className="hidden sm:block absolute -right-3 top-6 z-10 text-white/10"><ChevronRight className="w-5 h-5"/></div>
                       </div>
               
                       {/* Purchases */}
                       <div className="flex-1 w-full flex flex-col items-center text-center relative group">
                          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-green-500/20">
                            <DollarSign className="w-5 h-5 text-green-400"/>
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Vendas Pagas</p>
                          <p className="text-2xl font-headline font-bold text-slate-200">{kpis.purchases.toLocaleString('pt-BR')}</p>
                          <p className="text-[10px] font-bold text-green-400 mt-1">{(kpis.purchases + kpis.pendingPurchases) > 0 ? ((kpis.purchases / (kpis.purchases + kpis.pendingPurchases))*100).toFixed(1) : 0}% de aprovação</p>
                       </div>
               
                     </div>
                   </Card>
                 </div>
               )}
            </TabsContent>

            {/* ABA: META ADS */}
            <TabsContent value="meta" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
              <div className="bg-[#1a1c23] p-2 border-b border-white/5 flex gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <Button variant={metaTab === 'campanhas' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => setMetaTab('campanhas')}>
                     Campanhas {selectedCampaignIds.length > 0 && <Badge className="ml-2 h-5 bg-primary/20 text-primary">{selectedCampaignIds.length}</Badge>}
                  </Button>
                  <Button variant={metaTab === 'conjuntos' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => setMetaTab('conjuntos')}>
                     Conjuntos {selectedAdsetIds.length > 0 && <Badge className="ml-2 h-5 bg-primary/20 text-primary">{selectedAdsetIds.length}</Badge>}
                  </Button>
                  <Button variant={metaTab === 'anuncios' ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => setMetaTab('anuncios')}>Anúncios</Button>
                </div>
                {(selectedCampaignIds.length > 0 || selectedAdsetIds.length > 0) && (
                   <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground hover:text-white" onClick={() => { setSelectedCampaignIds([]); setSelectedAdsetIds([]); }}>Limpar Filtros</Button>
                )}
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#14151a] text-xs uppercase text-slate-400 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="px-3 py-3 w-10"></th>
                      <th className="px-3 py-3 w-10">Status</th>
                      <th className="px-3 py-3 min-w-[180px]">Nome</th>
                      <th className="px-3 py-3 text-center min-w-[120px]">Orçamento</th>
                      <th className="px-3 py-3 text-right">Gasto</th>
                      <th className="px-3 py-3 text-right">Vendas</th>
                      <th className="px-3 py-3 text-right">Faturamento</th>
                      <th className="px-3 py-3 text-right">ROI</th>
                      <th className="px-3 py-3 text-right">ROAS</th>
                      <th className="px-3 py-3 text-right">CPA</th>
                      <th className="px-3 py-3 text-right">CPC</th>
                      <th className="px-3 py-3 text-right">CTR</th>
                      <th className="px-3 py-3 text-right">IC</th>
                      <th className="px-3 py-3 text-right">Cliques</th>
                      <th className="px-3 py-3 text-right">Impressões</th>
                      <th className="px-3 py-3 text-right">CPV</th>
                      <th className="px-3 py-3 text-right">CPI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {metaTab === 'campanhas' && liveMetrics.campaigns.map(c => {
                      const m = getMetric('campaigns', 'campaign_id', c.campaign_id);
                      const isSelected = selectedCampaignIds.includes(c.campaign_id);
                      return (
                        <tr key={c.campaign_id} className={`hover:bg-white/5 ${isSelected ? 'bg-primary/5' : ''}`}>
                          <td className="px-3 py-2"><Checkbox checked={isSelected} onCheckedChange={(checked) => {
                             if (checked) setSelectedCampaignIds(prev => [...prev, c.campaign_id]);
                             else setSelectedCampaignIds(prev => prev.filter(id => id !== c.campaign_id));
                          }}/></td>
                          <td className="px-3 py-2"><Switch checked={m.status==='ACTIVE'} onCheckedChange={()=>setConfirmModal({isOpen:true, type:'campaign', id:c.campaign_id, name:c.campaign_name})}/></td>
                          <td className="px-3 py-2 font-medium max-w-[200px] truncate">{c.campaign_name}</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-300">
                             <div className="flex items-center justify-center gap-2">
                               <span>{m.daily_budget > 0 ? `${formatCurrency(m.daily_budget)}/dia` : (m.lifetime_budget > 0 ? `${formatCurrency(m.lifetime_budget)} (Total)` : '-')}</span>
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setBudgetModal({isOpen:true, type:'campaign', id:c.campaign_id, name:c.campaign_name})}><Edit2 className="w-3 h-3"/></Button>
                             </div>
                          </td>
                          <td className="px-3 py-2 text-right text-red-400">{formatCurrency(m.spend)}</td>
                          <td className="px-3 py-2 text-right">{m.purchases.toFixed(0)}</td>
                          <td className="px-3 py-2 text-right text-green-400">{formatCurrency(m.revenue)}</td>
                          <td className="px-3 py-2 text-right font-bold" style={{color: m.roi >= 0 ? '#4ade80' : '#f87171'}}>{m.roi.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpa)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpc)}</td>
                          <td className="px-3 py-2 text-right">{m.ctr.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{m.ic.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{m.clicks.toLocaleString('pt-BR')}</td>
                          <td className="px-3 py-2 text-right">{m.impressions.toLocaleString('pt-BR')}</td>
                          <td className="px-3 py-2 text-right">{m.cpv > 0 ? formatCurrency(m.cpv) : '-'}</td>
                          <td className="px-3 py-2 text-right">{m.cpi > 0 ? formatCurrency(m.cpi) : '-'}</td>
                        </tr>
                      );
                    })}
                    {metaTab === 'conjuntos' && liveMetrics.adsets.filter(a => selectedCampaignIds.length === 0 || selectedCampaignIds.includes(a.campaign_id)).map(a => {
                      const m = getMetric('adsets', 'adset_id', a.adset_id);
                      const isSelected = selectedAdsetIds.includes(a.adset_id);
                      return (
                        <tr key={a.adset_id} className={`hover:bg-white/5 ${isSelected ? 'bg-primary/5' : ''}`}>
                          <td className="px-3 py-2"><Checkbox checked={isSelected} onCheckedChange={(checked) => {
                             if (checked) setSelectedAdsetIds(prev => [...prev, a.adset_id]);
                             else setSelectedAdsetIds(prev => prev.filter(id => id !== a.adset_id));
                          }}/></td>
                          <td className="px-3 py-2"><Switch checked={m.status==='ACTIVE'} onCheckedChange={()=>setConfirmModal({isOpen:true, type:'adset', id:a.adset_id, name:a.adset_name})}/></td>
                          <td className="px-3 py-2 font-medium max-w-[200px] truncate">{a.adset_name}</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-300">
                             <div className="flex items-center justify-center gap-2">
                               <span>{m.daily_budget > 0 ? `${formatCurrency(m.daily_budget)}/dia` : (m.lifetime_budget > 0 ? `${formatCurrency(m.lifetime_budget)} (Total)` : '-')}</span>
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setBudgetModal({isOpen:true, type:'adset', id:a.adset_id, name:a.adset_name})}><Edit2 className="w-3 h-3"/></Button>
                             </div>
                          </td>
                          <td className="px-3 py-2 text-right text-red-400">{formatCurrency(m.spend)}</td>
                          <td className="px-3 py-2 text-right">{m.purchases.toFixed(0)}</td>
                          <td className="px-3 py-2 text-right text-green-400">{formatCurrency(m.revenue)}</td>
                          <td className="px-3 py-2 text-right font-bold" style={{color: m.roi >= 0 ? '#4ade80' : '#f87171'}}>{m.roi.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpa)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpc)}</td>
                          <td className="px-3 py-2 text-right">{m.ctr.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{m.ic.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{m.clicks.toLocaleString('pt-BR')}</td>
                          <td className="px-3 py-2 text-right">{m.impressions.toLocaleString('pt-BR')}</td>
                          <td className="px-3 py-2 text-right">{m.cpv > 0 ? formatCurrency(m.cpv) : '-'}</td>
                          <td className="px-3 py-2 text-right">{m.cpi > 0 ? formatCurrency(m.cpi) : '-'}</td>
                        </tr>
                      );
                    })}
                    {metaTab === 'anuncios' && liveMetrics.ads.filter(a => 
                       (selectedCampaignIds.length === 0 || selectedCampaignIds.includes(a.campaign_id)) && 
                       (selectedAdsetIds.length === 0 || selectedAdsetIds.includes(a.adset_id))
                    ).map(a => {
                      const m = getMetric('ads', 'ad_id', a.ad_id);
                      return (
                        <tr key={a.ad_id} className="hover:bg-white/5">
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"><Switch checked={m.status==='ACTIVE'} onCheckedChange={()=>setConfirmModal({isOpen:true, type:'ad', id:a.ad_id, name:a.ad_name})}/></td>
                          <td className="px-3 py-2 font-medium max-w-[200px] truncate">{a.ad_name}</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-300">-</td>
                          <td className="px-3 py-2 text-right text-red-400">{formatCurrency(m.spend)}</td>
                          <td className="px-3 py-2 text-right">{m.purchases.toFixed(0)}</td>
                          <td className="px-3 py-2 text-right text-green-400">{formatCurrency(m.revenue)}</td>
                          <td className="px-3 py-2 text-right font-bold" style={{color: m.roi >= 0 ? '#4ade80' : '#f87171'}}>{m.roi.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpa)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpc)}</td>
                          <td className="px-3 py-2 text-right">{m.ctr.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{m.ic.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{m.clicks.toLocaleString('pt-BR')}</td>
                          <td className="px-3 py-2 text-right">{m.impressions.toLocaleString('pt-BR')}</td>
                          <td className="px-3 py-2 text-right">{m.cpv > 0 ? formatCurrency(m.cpv) : '-'}</td>
                          <td className="px-3 py-2 text-right">{m.cpi > 0 ? formatCurrency(m.cpi) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ABA: WEBHOOKS */}
            <TabsContent value="webhooks" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-3xl mx-auto space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline">Webhook de Vendas</h2>
                   <p className="text-sm text-slate-400">Cole esta URL na plataforma de checkout (Hotmart, Kiwify, PerfectPay). O AdPulse receberá as vendas automaticamente.</p>
                 </div>

                 {/* URL do Webhook */}
                 <div className="p-5 border border-white/10 rounded-xl bg-[#1a1c23] space-y-4">
                   <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                     <Webhook className="w-4 h-4 text-primary" /> URL do Webhook
                   </h3>

                   {user ? (
                     <div className="space-y-3">
                       <div className="flex gap-2">
                         <Input
                           readOnly
                           value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/${id}`}
                           className="bg-[#0f1115] font-mono text-xs border-white/10 text-primary"
                         />
                         <Button
                           variant="secondary"
                           onClick={() => {
                             navigator.clipboard.writeText(`${window.location.origin}/api/webhook/${id}`);
                             toast({ title: '✓ URL copiada!' });
                           }}
                         >
                           <Copy className="w-4 h-4 mr-2" /> Copiar
                         </Button>
                       </div>
                       <p className="text-xs text-muted-foreground">
                         ⚠️ Mantenha essa URL em segredo — qualquer POST para ela registrará uma venda.
                       </p>
                     </div>
                   ) : (
                     <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                       <p className="text-sm text-yellow-400">Faça login para ver sua URL de webhook.</p>
                     </div>
                   )}
                 </div>

                 {/* Guia por plataforma */}
                 <div className="p-5 border border-white/10 rounded-xl bg-[#1a1c23] space-y-3">
                   <h3 className="font-bold text-sm text-slate-300">Como configurar por plataforma</h3>
                   <div className="space-y-2 text-xs text-muted-foreground">
                     <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                       <span className="font-bold text-orange-400 w-20 shrink-0">Hotmart</span>
                       <span>Ferramentas → Webhooks → Adicionar Webhook → Cole a URL → Evento: Compra Aprovada</span>
                     </div>
                     <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                       <span className="font-bold text-blue-400 w-20 shrink-0">Kiwify</span>
                       <span>Configurações → Webhooks → Novo Webhook → Cole a URL → Selecione: Venda Aprovada</span>
                     </div>
                     <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5">
                       <span className="font-bold text-purple-400 w-20 shrink-0">PerfectPay</span>
                       <span>Minha Conta → Webhooks → Adicionar → Cole a URL → Evento: payment_confirmed</span>
                     </div>
                   </div>
                 </div>

                 {/* Eventos recebidos */}
                 <div className="border border-white/10 rounded-xl bg-[#1a1c23] overflow-hidden">
                    <h3 className="font-bold text-sm p-4 border-b border-white/5 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> Últimos Eventos Recebidos
                      <span className="ml-auto text-xs text-muted-foreground font-normal">{events.length} evento{events.length !== 1 ? 's' : ''}</span>
                    </h3>
                    {events.length === 0 ? (
                      <div className="py-12 text-center">
                        <Webhook className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">Nenhum evento recebido ainda.</p>
                        <p className="text-xs text-muted-foreground mt-1">Configure a URL acima na sua plataforma de vendas.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
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
                                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR')}</td>
                                <td className="px-4 py-2 font-bold text-primary">{e.event_type?.toUpperCase()}</td>
                                <td className="px-4 py-2">{e.status === 'approved' ? <Badge className="bg-green-500 text-xs">Aprovado</Badge> : <Badge variant="secondary" className="text-xs">{e.status}</Badge>}</td>
                                <td className="px-4 py-2 text-xs">{e.customer_email || e.customer_name || '—'}</td>
                                <td className="px-4 py-2 font-bold text-green-400">{formatCurrency(e.event_value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                 </div>
               </div>
            </TabsContent>

            {/* ABA: REGRAS (AUTOMATION) */}
            <TabsContent value="rules" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-4xl mx-auto space-y-6">
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
               <div className="max-w-2xl mx-auto space-y-6">
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
               <div className="max-w-2xl mx-auto space-y-6">
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

            {/* ABA: PIXEL */}
            <TabsContent value="pixel" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-2xl mx-auto space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline">Pixel de Rastreamento</h2>
                   <p className="text-sm text-muted-foreground">Configure o Pixel do Facebook e o Token de Acesso para envio de eventos via Conversions API.</p>
                 </div>

                 {/* Status card */}
                 {pixel?.pixel_id ? (
                   <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                     <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                     <div>
                       <p className="text-sm font-bold text-green-400">Pixel Configurado</p>
                       <p className="text-xs text-muted-foreground font-mono">ID: {pixel.pixel_id} {pixel.access_token ? '· Token ativo ✓' : '· Sem token'}</p>
                     </div>
                   </div>
                 ) : (
                   <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                     <div className="w-3 h-3 rounded-full bg-yellow-500" />
                     <p className="text-sm text-yellow-400">Nenhum pixel configurado ainda.</p>
                   </div>
                 )}

                 {/* Form */}
                 <div className="p-5 border border-white/10 rounded-xl bg-[#1a1c23] space-y-4">
                   <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                     <Code2 className="w-4 h-4 text-primary" /> Dados do Pixel
                   </h3>

                   <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID do Pixel (obrigatório)</label>
                     <Input
                       value={pixel?.pixel_id || ''}
                       onChange={(e) => setPixel({ ...(pixel || {}), pixel_id: e.target.value })}
                       className="bg-[#0f1115] border-white/10 font-mono h-11"
                       placeholder="Ex: 1234567890123456"
                     />
                     <p className="text-xs text-muted-foreground">Encontre em: Meta Business Suite → Fontes de Dados → Pixels.</p>
                   </div>

                   <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Token de Acesso do Pixel (obrigatório para CAPI)</label>
                     <Input
                       type="password"
                       value={pixelToken}
                       onChange={(e) => setPixelToken(e.target.value)}
                       className="bg-[#0f1115] border-white/10 font-mono h-11"
                       placeholder="EAAxxxxxxxxxxxxx..."
                     />
                     <p className="text-xs text-muted-foreground">
                       Encontre em: Meta Business Suite → Fontes de Dados → Pixel → Configurações → Token de Acesso da API de Conversões.
                     </p>
                   </div>

                   <Button
                     className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11"
                     disabled={updating || !pixel?.pixel_id}
                     onClick={async () => {
                       if (!pixel?.pixel_id) return;
                       setUpdating(true);
                       try {
                         const { data: existing } = await supabase.from('product_pixels').select('id').eq('product_id', id).maybeSingle();
                         const payload = {
                           pixel_id: pixel.pixel_id,
                           provider: 'facebook',
                           access_token: pixelToken || null,
                         };
                         if (existing) {
                           await supabase.from('product_pixels').update(payload).eq('id', existing.id);
                         } else {
                           await supabase.from('product_pixels').insert({ user_id: user!.uid, product_id: id, ...payload });
                         }
                         toast({ title: 'Pixel salvo com sucesso!', description: pixelToken ? 'ID e Token configurados.' : 'ID configurado (sem token).' });
                       } catch (e: any) {
                         toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
                       } finally {
                         setUpdating(false);
                       }
                     }}
                   >
                     {updating ? 'Salvando...' : 'Salvar Configurações do Pixel'}
                   </Button>
                 </div>

                  {/* Disparo de IC (InitiateCheckout) */}
                  <div className="p-5 border border-white/10 rounded-xl bg-[#1a1c23] space-y-4">
                    <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-primary" /> Configuração do InitiateCheckout (Opcional)
                    </h3>
                    <p className="text-xs text-muted-foreground">O pixel já detecta automaticamente cliques em botões de "Comprar" ou links de checkout. Se desejar, force a detecção preenchendo abaixo (isso alterará o código do script gerado).</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Se o botão contiver este Texto:</label>
                        <Input
                          value={icTriggerText}
                          onChange={(e) => {
                            setIcTriggerText(e.target.value);
                            localStorage.setItem(`ic_text_${id}`, e.target.value);
                          }}
                          className="bg-[#0f1115] border-white/10 text-sm h-10"
                          placeholder="Ex: Assinar Agora"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Se o link apontar para esta URL:</label>
                        <Input
                          value={icTriggerUrl}
                          onChange={(e) => {
                            setIcTriggerUrl(e.target.value);
                            localStorage.setItem(`ic_url_${id}`, e.target.value);
                          }}
                          className="bg-[#0f1115] border-white/10 text-sm h-10"
                          placeholder="Ex: pay.kiwify.com.br"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      variant="secondary" 
                      className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
                      onClick={() => {
                        toast({ 
                          title: 'Configurações Aplicadas!', 
                          description: 'O Código do Pixel abaixo foi atualizado. Copie-o novamente para o seu site.' 
                        });
                      }}
                    >
                      Salvar Regras de Checkout
                    </Button>
                  </div>

                 {/* Código do Pixel para a Página */}
                 {pixel?.pixel_id && (
                    <div className="p-5 border border-white/10 rounded-xl bg-[#1a1c23] space-y-4">
                      <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-primary" /> Código do Pixel (Instalar no Site)
                      </h3>
                      <p className="text-xs text-muted-foreground">Copie o código abaixo e cole dentro da tag <code>&lt;head&gt;</code> de todas as páginas do seu site para rastrear visitantes (Pageview):</p>
                      
                      <div className="relative">
                        <pre className="p-4 bg-[#0f1115] rounded border border-white/5 font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
{`<!-- AdPulse & Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixel.pixel_id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixel.pixel_id}&ev=PageView&noscript=1"
/></noscript>
<!-- AdPulse Tracking Integration -->
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/adpulse-pixel.js" data-product-id="${id}" data-user-id="${user?.uid || ''}"${icTriggerText ? ` data-ic-text="${icTriggerText}"` : ''}${icTriggerUrl ? ` data-ic-url="${icTriggerUrl}"` : ''}></script>
<!-- End Pixel Code -->`}
                        </pre>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white"
                          onClick={() => {
                            const code = `<!-- AdPulse & Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${pixel.pixel_id}');\nfbq('track', 'PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=${pixel.pixel_id}&ev=PageView&noscript=1"\n/></noscript>\n<!-- AdPulse Tracking Integration -->\n<script src="${window.location.origin}/adpulse-pixel.js" data-product-id="${id}" data-user-id="${user?.uid}"${icTriggerText ? ` data-ic-text="${icTriggerText}"` : ''}${icTriggerUrl ? ` data-ic-url="${icTriggerUrl}"` : ''}></script>\n<!-- End Pixel Code -->`;
                            navigator.clipboard.writeText(code);
                            toast({ title: '✓ Código copiado!' });
                          }}
                        >
                          <Copy className="w-3 h-3 mr-2" /> Copiar Código
                        </Button>
                      </div>
                    </div>
                  )}

                 {/* Info box */}
                 <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-2">
                   <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Por que o Token é importante?</h4>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     O <strong>Token de Acesso</strong> permite que o AdPulse envie eventos de compra diretamente para a Meta via <strong>Conversions API (CAPI)</strong>, sem depender do pixel no navegador. Isso melhora a atribuição e resolve bloqueios de ad-blockers.
                   </p>
                 </div>
               </div>
            </TabsContent>

            {/* ABA: UTMs */}
            <TabsContent value="utms" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-4xl space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline">Parâmetros UTM Recomendados</h2>
                   <p className="text-sm text-muted-foreground mb-4">Para que a leitura de vendas pelo Webhook fique perfeita, utilize exatamente esta estrutura de UTM nos seus anúncios do Meta.</p>
                 </div>
                 
                 <div className="bg-[#1a1c23] border border-white/10 rounded-lg p-6 space-y-4">
                    <h3 className="font-bold text-lg text-primary">Copie e cole a URL abaixo:</h3>
                    <div className="p-4 bg-[#0f1115] rounded border border-white/5 font-mono text-sm break-all text-slate-300">
                      ?utm_source=facebook&utm_medium=&#123;&#123;adset.name&#125;&#125;&utm_campaign=&#123;&#123;campaign.name&#125;&#125;&utm_content=&#123;&#123;ad.name&#125;&#125;
                    </div>
                    <Button variant="secondary" onClick={() => {
                      navigator.clipboard.writeText("?utm_source=facebook&utm_medium={{adset.name}}&utm_campaign={{campaign.name}}&utm_content={{ad.name}}");
                      toast({title: 'UTMs Copiadas!'});
                    }}><Copy className="w-4 h-4 mr-2"/> Copiar UTMs</Button>
                    <p className="text-xs text-muted-foreground mt-4">
                      Estes parâmetros dinâmicos (`&#123;&#123;campaign.name&#125;&#125;` etc) serão substituídos pelo Facebook quando o usuário clicar. O Webhook irá identificar a campanha através deles.
                    </p>
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

            {/* ABA: NOTIFICAÇÕES */}
            <TabsContent value="notifications" className="flex-1 overflow-y-auto p-6 m-0">
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" /> Configuração de Alertas de Venda
                  </h2>
                  <p className="text-sm text-slate-400">Configure notificações push no navegador e sons de alerta em tempo real para vendas pendentes e aprovadas.</p>
                </div>

                {/* Browser permission */}
                <div className="p-5 border border-white/10 rounded-xl bg-[#1a1c23] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-300">Permissão do Navegador</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {permissionStatus === "granted" 
                        ? "✓ As notificações estão permitidas neste dispositivo." 
                        : "É necessário permitir para ver os popups de vendas."}
                    </p>
                  </div>
                  {permissionStatus !== "granted" ? (
                    <Button onClick={requestNotificationPermission} className="bg-primary text-white font-bold h-9">
                      Ativar Notificações
                    </Button>
                  ) : (
                    <Badge className="bg-green-500/10 text-green-500 border-none font-bold py-1 px-3">
                      ATIVO ✓
                    </Badge>
                  )}
                </div>

                {/* Toggles */}
                <div className="p-5 border border-white/10 rounded-xl bg-[#1a1c23] space-y-4">
                  <h3 className="font-bold text-sm text-slate-300">Alertas Ativos</h3>

                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <span className="text-sm font-medium block">Notificar Popups no Navegador</span>
                      <span className="text-xs text-muted-foreground">Exibe caixas de alerta push mesmo com a aba em segundo plano.</span>
                    </div>
                    <Switch 
                      checked={notifyEnabled} 
                      onCheckedChange={(val) => {
                        setNotifyEnabled(val);
                        localStorage.setItem("notifications_enabled", val ? "true" : "false");
                      }} 
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <span className="text-sm font-medium block">Vendas Aprovadas</span>
                      <span className="text-xs text-muted-foreground">Alertar quando compras forem confirmadas.</span>
                    </div>
                    <Switch 
                      checked={notifyApp} 
                      onCheckedChange={(val) => {
                        setNotifyApp(val);
                        localStorage.setItem("notify_approved", val ? "true" : "false");
                      }} 
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <span className="text-sm font-medium block">Vendas Pendentes</span>
                      <span className="text-xs text-muted-foreground">Alertar quando boletos forem gerados ou PIX emitidos.</span>
                    </div>
                    <Switch 
                      checked={notifyPend} 
                      onCheckedChange={(val) => {
                        setNotifyPend(val);
                        localStorage.setItem("notify_pending", val ? "true" : "false");
                      }} 
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm font-medium block">Tocar Som de Notificação</span>
                      <span className="text-xs text-muted-foreground">Efetua um som clássico de caixa registradora ou um som customizado.</span>
                    </div>
                    <Switch 
                      checked={soundEnabled} 
                      onCheckedChange={(val) => {
                        setSoundEnabled(val);
                        localStorage.setItem("sound_enabled", val ? "true" : "false");
                      }} 
                    />
                  </div>
                </div>

                {/* Sound Customization */}
                <div className="p-5 border border-white/10 rounded-xl bg-[#1a1c23] space-y-4">
                  <h3 className="font-bold text-sm text-slate-300">Escolha o Som de Alerta</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant={soundType === "default" ? "default" : "outline"} 
                      onClick={() => {
                        setSoundType("default");
                        localStorage.setItem("sound_type", "default");
                      }}
                      className="font-bold h-11"
                    >
                      Som Padrão (Caixa Registradora)
                    </Button>
                    <Button 
                      variant={soundType === "custom" ? "default" : "outline"} 
                      onClick={() => {
                        setSoundType("custom");
                        localStorage.setItem("sound_type", "custom");
                      }}
                      className="font-bold h-11"
                    >
                      Som Customizado (Upload)
                    </Button>
                  </div>

                  {soundType === "custom" && (
                    <div className="p-4 bg-black/20 border border-white/5 rounded-lg space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fazer Upload do Arquivo de Áudio (.mp3 ou .wav)</label>
                      <Input 
                        type="file" 
                        accept="audio/mpeg, audio/wav, audio/mp3" 
                        onChange={handleCustomSoundUpload}
                        className="bg-[#0f1115] border-white/10 file:bg-primary file:text-white file:font-bold file:border-none file:px-3 file:py-1 file:rounded cursor-pointer"
                      />
                      <p className="text-[10px] text-muted-foreground">Limite de 500KB. O áudio será salvo localmente no seu dispositivo.</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button 
                      onClick={testNotification} 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 gap-2"
                    >
                      <Volume2 className="w-5 h-5" /> Testar Alerta & Som de Venda
                    </Button>
                  </div>
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
            <label className="text-xs font-bold text-slate-400 block mb-2">Novo Orçamento Diário (R$)</label>
            <Input type="number" placeholder="Ex: 50.00" value={budgetValue} onChange={e => setBudgetValue(e.target.value)} className="bg-[#0f1115] border-white/10 text-xl font-bold font-mono h-12"/>
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
      {/* Layout Config Modal */}
      <Dialog open={layoutModal} onOpenChange={setLayoutModal}>
        <DialogContent className="bg-[#14151a] border-white/10 text-white max-w-md">
          <DialogHeader>
             <DialogTitle>Personalizar Dashboard</DialogTitle>
             <DialogDescription>Marque as métricas que deseja exibir na tela principal do produto.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto">
             {[
               {id: 'revenue', label: 'Faturamento Bruto'},
               {id: 'pending', label: 'Faturamento Pendente'},
               {id: 'spend', label: 'Gasto Ads'},
               {id: 'costs', label: 'Custos & Taxas'},
               {id: 'profit', label: 'Lucro Líquido'},
               {id: 'roi', label: 'ROI'},
               {id: 'roas', label: 'ROAS'},
               {id: 'cpa', label: 'CPA'},
               {id: 'cpc', label: 'CPC'},
               {id: 'cpm', label: 'CPM'},
               {id: 'ctr', label: 'CTR'},
               {id: 'arpu', label: 'Ticket Médio (ARPU)'},
               {id: 'last_sale', label: 'Última Venda / Origem'},
               {id: 'funnel', label: 'Funil Visual'}
             ].map(item => (
               <label key={item.id} className="flex items-center space-x-2 bg-[#1a1c23] p-3 rounded border border-white/5 cursor-pointer hover:bg-white/5">
                 <Checkbox 
                   checked={visibleCards.includes(item.id)} 
                   onCheckedChange={(checked) => {
                     let newVis = [...visibleCards];
                     if (checked) newVis.push(item.id);
                     else newVis = newVis.filter(v => v !== item.id);
                     setVisibleCards(newVis);
                     localStorage.setItem(`dashboard_layout_${id}`, JSON.stringify(newVis));
                   }} 
                 />
                 <span className="text-sm select-none">{item.label}</span>
               </label>
             ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setLayoutModal(false)} className="w-full">Pronto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
