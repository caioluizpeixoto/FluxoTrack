"use client";

import React, { useState, useEffect, useMemo, Fragment } from "react";
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
  Bell, Volume2, Pencil, Filter, MousePointerClick, ShoppingCart, ChevronRight, Info, Move
} from "lucide-react";
import LinkNext from "next/link";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { useParams, useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConversionFunnel, HourlySalesChart } from "@/components/dashboard/analytics-charts";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Responsive as ResponsiveGridLayout, WidthProvider } from "react-grid-layout/legacy";
const ResponsiveGridLayoutWithWidth = WidthProvider(ResponsiveGridLayout);

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
  const [metaAccountData, setMetaAccountData] = useState<{balance: number, spent: number, error?: string, isCard?: boolean} | null>(null);

  // Settings State
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<string>("");
  const [budgetHistory, setBudgetHistory] = useState<any[]>([]);

  const [metaTab, setMetaTab] = useState("campanhas");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdsetIds, setSelectedAdsetIds] = useState<string[]>([]);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  // Vendas Tab State
  const [salesSearch, setSalesSearch] = useState("");
  const [salesDateFilter, setSalesDateFilter] = useState("hoje");
  const [salesDateStart, setSalesDateStart] = useState("");
  const [salesDateEnd, setSalesDateEnd] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [selectedSaleForModal, setSelectedSaleForModal] = useState<any>(null);

  // Layout State
  const [isEditMode, setIsEditMode] = useState(false);
  const defaultGridLayouts = {
    lg: [
      { i: 'revenue', x: 0, y: 0, w: 2, h: 4 },
      { i: 'pending', x: 2, y: 0, w: 2, h: 4 },
      { i: 'spend', x: 4, y: 0, w: 2, h: 4 },
      { i: 'costs', x: 6, y: 0, w: 2, h: 4 },
      { i: 'meta_balance', x: 8, y: 0, w: 2, h: 4 },
      { i: 'profit', x: 10, y: 0, w: 2, h: 4 },
      
      { i: 'roi', x: 0, y: 4, w: 1, h: 3 },
      { i: 'roas', x: 1, y: 4, w: 1, h: 3 },
      { i: 'cpa', x: 2, y: 4, w: 2, h: 3 },
      { i: 'cpc', x: 4, y: 4, w: 2, h: 3 },
      { i: 'cpm', x: 6, y: 4, w: 2, h: 3 },
      { i: 'ctr', x: 8, y: 4, w: 2, h: 3 },
      { i: 'arpu', x: 10, y: 4, w: 2, h: 3 },
      
      { i: 'last_sale', x: 0, y: 7, w: 4, h: 10 },
      { i: 'funnel', x: 4, y: 7, w: 8, h: 18 },
      { i: 'hourly_sales', x: 0, y: 17, w: 12, h: 12 },
    ],
    md: [
      { i: 'revenue', x: 0, y: 0, w: 3, h: 4 },
      { i: 'pending', x: 3, y: 0, w: 3, h: 4 },
      { i: 'spend', x: 6, y: 0, w: 3, h: 4 },
      { i: 'costs', x: 0, y: 4, w: 3, h: 4 },
      { i: 'meta_balance', x: 3, y: 4, w: 3, h: 4 },
      { i: 'profit', x: 6, y: 4, w: 3, h: 4 },
      
      { i: 'roi', x: 0, y: 8, w: 2, h: 3 },
      { i: 'roas', x: 2, y: 8, w: 2, h: 3 },
      { i: 'cpa', x: 4, y: 8, w: 2, h: 3 },
      { i: 'cpc', x: 6, y: 8, w: 3, h: 3 },
      { i: 'cpm', x: 0, y: 11, w: 3, h: 3 },
      { i: 'ctr', x: 3, y: 11, w: 3, h: 3 },
      { i: 'arpu', x: 6, y: 11, w: 3, h: 3 },
      
      { i: 'last_sale', x: 0, y: 14, w: 9, h: 10 },
      { i: 'funnel', x: 0, y: 24, w: 9, h: 18 },
      { i: 'hourly_sales', x: 0, y: 42, w: 9, h: 12 },
    ],
    sm: [
      { i: 'revenue', x: 0, y: 0, w: 3, h: 4 },
      { i: 'pending', x: 3, y: 0, w: 3, h: 4 },
      { i: 'spend', x: 0, y: 4, w: 3, h: 4 },
      { i: 'costs', x: 3, y: 4, w: 3, h: 4 },
      { i: 'meta_balance', x: 0, y: 8, w: 3, h: 4 },
      { i: 'profit', x: 3, y: 8, w: 3, h: 4 },
      
      { i: 'roi', x: 0, y: 12, w: 2, h: 3 },
      { i: 'roas', x: 2, y: 12, w: 2, h: 3 },
      { i: 'cpa', x: 4, y: 12, w: 2, h: 3 },
      { i: 'cpc', x: 0, y: 15, w: 2, h: 3 },
      { i: 'cpm', x: 2, y: 15, w: 2, h: 3 },
      { i: 'ctr', x: 4, y: 15, w: 2, h: 3 },
      { i: 'arpu', x: 0, y: 18, w: 6, h: 3 },
      
      { i: 'last_sale', x: 0, y: 21, w: 6, h: 10 },
      { i: 'funnel', x: 0, y: 31, w: 6, h: 18 },
      { i: 'hourly_sales', x: 0, y: 49, w: 6, h: 12 },
    ],
    xs: [
      { i: 'revenue', x: 0, y: 0, w: 4, h: 4 },
      { i: 'pending', x: 0, y: 4, w: 4, h: 4 },
      { i: 'spend', x: 0, y: 8, w: 4, h: 4 },
      { i: 'costs', x: 0, y: 12, w: 4, h: 4 },
      { i: 'meta_balance', x: 0, y: 16, w: 4, h: 4 },
      { i: 'profit', x: 0, y: 20, w: 4, h: 4 },
      
      { i: 'roi', x: 0, y: 24, w: 2, h: 3 },
      { i: 'roas', x: 2, y: 24, w: 2, h: 3 },
      { i: 'cpa', x: 0, y: 27, w: 2, h: 3 },
      { i: 'cpc', x: 2, y: 27, w: 2, h: 3 },
      { i: 'cpm', x: 0, y: 30, w: 2, h: 3 },
      { i: 'ctr', x: 2, y: 30, w: 2, h: 3 },
      { i: 'arpu', x: 0, y: 33, w: 4, h: 3 },
      
      { i: 'last_sale', x: 0, y: 36, w: 4, h: 10 },
      { i: 'funnel', x: 0, y: 46, w: 4, h: 18 },
      { i: 'hourly_sales', x: 0, y: 64, w: 4, h: 12 },
    ]
  };
  const defaultLayout = ['revenue', 'pending', 'spend', 'costs', 'profit', 'meta_balance', 'roi', 'roas', 'cpa', 'cpc', 'cpm', 'ctr', 'arpu', 'last_sale', 'funnel', 'hourly_sales'];
  const [visibleCards, setVisibleCards] = useState<string[]>(defaultLayout);
  const [layouts, setLayouts] = useState<any>(defaultGridLayouts);
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
      if (savedLayout) {
        try {
          const parsed = JSON.parse(savedLayout);
          if (parsed.layouts) {
             setLayouts(parsed.layouts);
             setVisibleCards(parsed.visibleCards || defaultLayout);
          } else if (Array.isArray(parsed)) {
             setVisibleCards(parsed);
          }
        } catch(e) {}
      }

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

  const testNotification = async () => {
    // Play sound
    if (soundEnabled) {
      try {
        const audio = new Audio("/sounds/notification.mp3");
        await audio.play();
      } catch (soundErr) {
        console.warn("Falha ao tocar áudio no teste:", soundErr);
      }
    }

    // Show push notification via OneSignal
    if (notifyEnabled) {
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            title: "💰 Venda Aprovada! (Teste)", 
            message: "Produto: Teste de Notificações | Valor: R$ 97,00", 
            url: window.location.href 
          }),
        });
      } catch (e) {
        console.warn("Falha ao enviar Push de teste", e);
      }
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

      const [linksRes, taxesRes, expRes, rulesRes, utmRes, pixelRes, accLinkRes, eventsRes, budgetHistoryRes] = await Promise.all([
        supabase.from('product_campaigns').select('*').eq('product_id', id),
        supabase.from('product_taxes').select('*').eq('product_id', id),
        supabase.from('product_expenses').select('*').eq('product_id', id).order('expense_date', { ascending: false }),
        supabase.from('product_rules').select('*').eq('product_id', id),
        supabase.from('product_utms').select('*').eq('product_id', id).maybeSingle(),
        supabase.from('product_pixels').select('*').eq('product_id', id).maybeSingle(),
        supabase.from('product_ad_accounts').select('ad_account_id').eq('product_id', id).maybeSingle(),
        supabase.from('product_events').select('*').eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('budget_history').select('*').eq('product_id', id).order('created_at', { ascending: false })
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
      setBudgetHistory(budgetHistoryRes.data || []);

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
      let totalBalance = 0;
      let totalSpent = 0;
      let accountErrorMsg = '';
      let hasPrepaid = false;

      await Promise.all(accIds.map(async (accId) => {
        const res = await fetch('/api/meta/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, accountId: accId, level: 'all', datePreset: preset, targetCurrency: product?.currency || 'BRL' })
        });
        const data = await res.json();
        if (data.success) {
          mergedCamps = [...mergedCamps, ...(data.insights.campaigns || [])];
          mergedAdsets = [...mergedAdsets, ...(data.insights.adsets || [])];
          mergedAds = [...mergedAds, ...(data.insights.ads || [])];
          if (data.accountData) {
             let accBalance = Number(data.accountData.balance || 0) / 100;
             if (data.accountData.prepaid_balance !== undefined && data.accountData.prepaid_balance !== null) {
                accBalance = data.accountData.prepaid_balance;
                hasPrepaid = true;
             }
             totalBalance += accBalance;
             totalSpent += (Number(data.accountData.amount_spent || 0) / 100);
          }
          if (data.accountError) {
             accountErrorMsg = data.accountError;
          }
        }
      }));
      
      setMetaAccountData({ balance: totalBalance, spent: totalSpent, error: accountErrorMsg, isCard: !hasPrepaid });
      
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
    const isEventInDateRange = (dateString: string) => {
      if (!dateString) return true;
      const eventDate = new Date(dateString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch(datePreset) {
        case 'today':
          return eventDate >= today;
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return eventDate >= yesterday && eventDate < today;
        }
        case 'last_7d': {
          const last7 = new Date(today);
          last7.setDate(last7.getDate() - 7);
          return eventDate >= last7;
        }
        case 'last_30d': {
          const last30 = new Date(today);
          last30.setDate(last30.getDate() - 30);
          return eventDate >= last30;
        }
        case 'this_month': {
          const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return eventDate >= thisMonth;
        }
        default:
          return true;
      }
    };

  const kpis = useMemo(() => {
    let spend = 0, clicks = 0, impressions = 0, ic = 0, pageViews = 0;
    liveMetrics.campaigns.forEach(c => {
      spend += Number(c.spend || 0);
      impressions += Number(c.impressions || 0);
      
      const linkClickAction = c.actions?.find((a:any) => a.action_type === 'link_click');
      clicks += Number(linkClickAction?.value || 0);
      const icAction = c.actions?.find((a:any) => a.action_type === 'initiate_checkout' || a.action_type === 'omni_initiated_checkout');
      if (icAction) ic += Number(icAction.value || 0);
      const pvAction = c.actions?.find((a:any) => a.action_type === 'landing_page_view');
      const outboundAction = c.actions?.find((a:any) => a.action_type === 'outbound_clicks');
      if (pvAction) {
         pageViews += Number(pvAction.value || 0);
      } else if (outboundAction) {
         pageViews += Number(outboundAction.value || 0);
      }
    });

    if (pageViews === 0) pageViews = clicks;

    let realRevenue = 0, realPurchases = 0;
    let pendingPurchases = 0, pendingRevenue = 0;
    
    events.filter(e => e.event_type === 'purchase').forEach(e => {
       const isToday = () => {
         const d = new Date(e.created_at);
         const now = new Date();
         return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
       };

       if (isEventInDateRange(e.created_at) && e.status === 'approved') {
         realRevenue += Number(e.event_value || 0);
         realPurchases += 1;
       } 
       
       // Sempre pega pendentes apenas de hoje, independente do datePreset global
       if (isToday() && (e.status === 'pending' || e.status === 'generated')) {
         pendingRevenue += Number(e.event_value || 0);
         pendingPurchases += 1;
       }
    });

    let productsSoldToday = 0;
    const productsSalesMap: Record<string, number> = {};

    events.filter(e => e.event_type === 'purchase' && e.status === 'approved').forEach(e => {
       const d = new Date(e.created_at);
       const now = new Date();
       if (d >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          productsSoldToday += 1;
          
          let pName = product?.name || 'Produto Principal';
          if (e.raw_payload?.product?.title) {
             pName = e.raw_payload.product.title;
          } else if (e.raw_payload?.checkout?.title) {
             pName = e.raw_payload.checkout.title;
          }
          
          productsSalesMap[pName] = (productsSalesMap[pName] || 0) + 1;
       }
    });

    const productsSoldList = Object.entries(productsSalesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count);
    
    // Título do produto
    let lastSaleProduct = product?.name || 'Nenhum';

    if (realPurchases === 0 && liveMetrics.campaigns.length > 0) {
      liveMetrics.campaigns.forEach(c => {
        const pAct = c.actions?.find((a:any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
        if (pAct) realPurchases += Number(pAct.value || 0);
        const rAct = c.action_values?.find((a:any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
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
      lastSaleProduct, productsSoldToday, productsSoldList, clicks, impressions, ic, pageViews 
    };
  }, [liveMetrics, product, taxes, expenses, events, datePreset]);

  const getMetric = (level: 'campaigns'|'adsets'|'ads', idKey: string, idVal: string) => {
    const item = liveMetrics[level].find((m: any) => m[idKey] === idVal);
    if (!item) return { spend: 0, purchases: 0, revenue: 0, roas: 0, cpa: 0, clicks: 0, impressions: 0, ctr: 0, cpc: 0, cpv: 0, cpi: 0, ic: 0, roi: 0, profit: 0, margin: 0, cpm: 0, status: 'UNKNOWN', name: 'N/A', daily_budget: 0, lifetime_budget: 0 };
    
    const spend = Number(item.spend || 0);
    const linkClickAction = item.actions?.find((a:any) => a.action_type === 'link_click');
    const clicks = Number(linkClickAction?.value || 0);
    const impressions = Number(item.impressions || 0);
    const ctr = Number(item.ctr || 0);
    const cpc = Number(item.cpc || 0);

    let purchases = 0, revenue = 0, videoViews = 0, checkoutInits = 0;
    if (item.actions) {
      const pAction = item.actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
      if (pAction) purchases = Number(pAction.value || 0);
      const vAction = item.actions.find((a: any) => a.action_type === 'video_view');
      if (vAction) videoViews = Number(vAction.value || 0);
      const cAction = item.actions.find((a: any) => a.action_type === 'initiate_checkout' || a.action_type === 'omni_initiated_checkout');
      if (cAction) checkoutInits = Number(cAction.value || 0);
    }
    if (item.action_values) {
      const pRev = item.action_values.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
      if (pRev) revenue = Number(pRev.value || 0);
    }

    // --- INTERNAL TRACKING MERGE ---
    let internalPurchases = 0;
    let internalRevenue = 0;
    
    events.filter(e => e.event_type === 'purchase' && e.status === 'approved' && isEventInDateRange(e.created_at)).forEach(e => {
       const payload = e.raw_payload || {};
       const tracking = payload.tracking || {};
       const utmCampaign = tracking.utm_campaign || payload.utm_campaign || '';
       const utmMedium = tracking.utm_medium || payload.utm_medium || '';
       const utmContent = tracking.utm_content || payload.utm_content || '';
       const utmSource = tracking.utm_source || payload.utm_source || '';
       
       // Try to extract standard IDs from pipe separated format (like UTMify: NAME|ID)
       const extractId = (str: string) => {
          const match = str.match(/\|(\d{15,})/);
          return match ? match[1] : str;
       };
       
       const campId = extractId(utmCampaign);
       const adsetId = extractId(utmMedium);
       const adId = extractId(utmContent);
       
       let match = false;
       if (level === 'campaigns') {
           match = (campId === item.campaign_id || campId === item.name || utmCampaign === item.name || utmMedium === item.name);
       } else if (level === 'adsets') {
           match = (adsetId === item.adset_id || adsetId === item.name || utmMedium === item.name || utmContent === item.name);
       } else if (level === 'ads') {
           match = (adId === item.ad_id || adId === item.name || utmContent === item.name || utmSource === item.name);
       }
       
       if (match) {
           internalPurchases++;
           internalRevenue += Number(e.event_value || 0);
       }
    });

    // Se o painel interno registrou mais vendas que o Facebook, usamos o interno para ter o ROAS real em tempo real
    // if (internalPurchases > purchases) {
    //    purchases = internalPurchases;
    //    revenue = internalRevenue > 0 ? internalRevenue : revenue;
    // }
    // --------------------------------

    const roas = spend > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const cpv = videoViews > 0 ? spend / videoViews : 0;
    const cpi = checkoutInits > 0 ? spend / checkoutInits : 0;
    const ic = checkoutInits;
    const roi = spend > 0 ? (revenue - spend) / spend : 0;
    const profit = revenue - spend;
    const margin = revenue > 0 ? ((revenue - spend) / revenue) * 100 : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

    return { 
      spend, purchases, revenue, roas, cpa, clicks, impressions, ctr, cpc, cpv, cpi, ic, roi, profit, margin, cpm,
      status: item.status, name: item.name, 
      daily_budget: Number(item.daily_budget || 0) / 100, 
      lifetime_budget: Number(item.lifetime_budget || 0) / 100 
    };
  };

  // Vendas Filtering & Pagination
  const filteredSales = useMemo(() => {
    let result = events;
    
    // Filter by Date
    if (salesDateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      result = result.filter(e => {
        const d = new Date(e.created_at);
        if (salesDateFilter === 'hoje') {
          return d >= today;
        } else if (salesDateFilter === '30dias') {
          const last30 = new Date(today);
          last30.setDate(last30.getDate() - 30);
          return d >= last30;
        } else if (salesDateFilter === 'custom') {
          if (salesDateStart && salesDateEnd) {
            const start = new Date(salesDateStart + 'T00:00:00');
            const end = new Date(salesDateEnd + 'T23:59:59');
            return d >= start && d <= end;
          }
        }
        return true;
      });
    }

    // Filter by Search
    if (salesSearch.trim()) {
      const q = salesSearch.toLowerCase();
      result = result.filter(e => 
        (e.customer_name || '').toLowerCase().includes(q) || 
        (e.customer_email || '').toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [events, salesDateFilter, salesDateStart, salesDateEnd, salesSearch]);

  const salesItemsPerPage = 10;
  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesItemsPerPage;
    return filteredSales.slice(start, start + salesItemsPerPage);
  }, [filteredSales, salesPage]);

  const totalSalesPages = Math.ceil(filteredSales.length / salesItemsPerPage);

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

    // Guarda valor antigo para rollback e estatísticas antes da mudança
    const currentItem = level ? (liveMetrics[level] as any[])?.find(i => i[itemKey] === snapshot.id) : null;
    const oldBudget   = currentItem?.[budgetKey];
    const metricsBefore = getMetric(level, itemKey, snapshot.id);

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
          productId: id, salesBefore: metricsBefore.purchases, roiBefore: metricsBefore.roi
        }),
      });
      const data = await res.json();
      
      if (data.success) {
         // Atualizar também o estado budgetHistory localmente para aparecer na hora
         const newHistoryRow = {
           id: Math.random().toString(),
           product_id: id,
           entity_type: snapshot.type,
           entity_id: snapshot.id,
           old_budget: Number(oldBudget)/100, // aproximado se for em BRL (na vdd a API salva certo, aqui é só pro optimistic UI)
           new_budget: newBudget,
           sales_before: metricsBefore.purchases,
           roi_before: metricsBefore.roi,
           created_at: new Date().toISOString()
         };
         setBudgetHistory(prev => [newHistoryRow, ...prev]);
      }
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

  const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    if (typeof window !== "undefined") {
      localStorage.setItem(`dashboard_layout_${id}`, JSON.stringify({ layouts: allLayouts, visibleCards }));
    }
  };

  if (!mounted || !product) return null;

  return (
    <div className="flex min-h-screen bg-[#0f1115] text-slate-200">
      <DashboardSidebar />
      <main className="flex-1 w-full p-4 lg:p-8 transition-all md:h-screen md:flex md:flex-col md:overflow-hidden">
        
        <header className="mb-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-14 lg:pl-0 pt-2 lg:pt-0">
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
                <SelectItem value="maximum">Vitalício (Máximo)</SelectItem>
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
                <TabsTrigger value="vendas" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full text-xs font-bold uppercase tracking-wider text-muted-foreground"><DollarSign className="w-3 h-3 mr-1"/> Vendas</TabsTrigger>
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
                 <div className="flex gap-2">
                   <Button variant={isEditMode ? "default" : "outline"} size="sm" onClick={() => setIsEditMode(!isEditMode)} className={isEditMode ? "bg-primary text-white" : "bg-[#1a1c23] border-white/10 text-slate-300 hover:text-white hover:bg-white/5"}>
                     <Move className="w-4 h-4 mr-2"/> {isEditMode ? 'Fixar Layout' : 'Alterar Layout'}
                   </Button>
                   <Button variant="outline" size="sm" onClick={() => setLayoutModal(true)} className="bg-[#1a1c23] border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                     <Settings className="w-4 h-4 mr-2"/> Métricas
                   </Button>
                 </div>
               </div>

               {/* Grid Layout */}
               {mounted ? (
               <ResponsiveGridLayoutWithWidth
                 className="layout"
                 layouts={layouts}
                 breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                 cols={{ lg: 12, md: 9, sm: 6, xs: 4, xxs: 2 }}
                 rowHeight={30}
                 onLayoutChange={handleLayoutChange}
                 isDraggable={isEditMode}
                 isResizable={isEditMode && typeof window !== "undefined" && window.innerWidth > 768}
                 margin={[16, 16]}
                 containerPadding={[0, 0]}
               >
                 {visibleCards.includes('revenue') && (
                   <div key="revenue">
                     <Card className="h-full bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center cursor-move">
                       <p className="text-sm text-slate-400 font-medium mb-1">Faturamento Bruto (Real)</p>
                       <p className="text-2xl font-bold font-headline text-green-400">{formatCurrency(kpis.revenue, product?.currency || 'BRL')}</p>
                       <p className="text-xs text-muted-foreground mt-1">{kpis.purchases} Vendas</p>
                     </Card>
                   </div>
                 )}
                 {visibleCards.includes('pending') && (
                   <div key="pending">
                     <Card className="h-full bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center cursor-move">
                       <p className="text-sm text-slate-400 font-medium mb-1">Faturamento Pendente</p>
                       <p className="text-2xl font-bold font-headline text-amber-500">{formatCurrency(kpis.pendingRevenue, product?.currency || 'BRL')}</p>
                       <p className="text-xs text-muted-foreground mt-1">{kpis.pendingPurchases} Compras Pendentes</p>
                     </Card>
                   </div>
                 )}
                 {visibleCards.includes('spend') && (
                   <div key="spend">
                     <Card className="h-full bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center cursor-move">
                       <p className="text-sm text-slate-400 font-medium mb-1">Gasto Ads</p>
                       <p className="text-2xl font-bold font-headline text-white">{formatCurrency(kpis.spend, product?.currency || 'BRL')}</p>
                     </Card>
                   </div>
                 )}
                 {visibleCards.includes('costs') && (
                   <div key="costs">
                     <Card className="h-full bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center cursor-move">
                       <p className="text-sm text-slate-400 font-medium mb-1">Custos & Taxas</p>
                       <p className="text-2xl font-bold font-headline text-orange-400">{formatCurrency(kpis.prodCost + kpis.taxesAmount + kpis.expensesAmount, product?.currency || 'BRL')}</p>
                     </Card>
                   </div>
                 )}
                 {visibleCards.includes('meta_balance') && (
                   <div key="meta_balance">
                     <Card className="h-full bg-[#1a1c23] border-white/5 p-4 flex flex-col justify-center relative overflow-hidden cursor-move">
                       <p className="text-sm text-slate-400 font-medium mb-1">Saldo na Conta (Meta)</p>
                       {metaAccountData?.error ? (
                          <p className="text-xs text-red-400 mt-1 line-clamp-2" title={metaAccountData.error}>
                            Permissão Negada ou Conta Inválida: {metaAccountData.error}
                          </p>
                       ) : (
                          <>
                             {metaAccountData?.isCard ? (
                               <p className="text-2xl font-bold font-headline text-blue-400">
                                 Cartão
                               </p>
                             ) : (
                               <>
                                 <p className="text-2xl font-bold font-headline text-blue-400">
                                   {metaAccountData ? formatCurrency(metaAccountData.balance, product?.currency || 'BRL') : 'R$ 0,00'}
                                 </p>
                                 <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                                   Gasto Total: {metaAccountData ? formatCurrency(metaAccountData.spent, product?.currency || 'BRL') : 'R$ 0,00'}
                                 </p>
                               </>
                             )}
                          </>
                       )}
                     </Card>
                   </div>
                 )}
                 {visibleCards.includes('profit') && (
                   <div key="profit">
                     <Card className="h-full bg-[#1a1c23] border border-primary/20 p-4 flex flex-col justify-center cursor-move">
                       <p className="text-sm text-primary font-medium mb-1">Lucro Líquido</p>
                       <p className={`text-3xl font-bold font-headline ${kpis.profit > 0 ? 'text-green-500' : kpis.profit < 0 ? 'text-red-500' : 'text-slate-300'}`}>{formatCurrency(kpis.profit, product?.currency || 'BRL')}</p>
                     </Card>
                   </div>
                 )}

                 {visibleCards.includes('roi') && <div key="roi"><Card className="h-full bg-[#1a1c23] border-white/5 p-3 text-center flex flex-col justify-center cursor-move"><p className="text-xs text-slate-400 mb-1">ROI</p><p className="font-bold text-lg">{kpis.roi.toFixed(2)}</p></Card></div>}
                 {visibleCards.includes('roas') && <div key="roas"><Card className="h-full bg-[#1a1c23] border-white/5 p-3 text-center flex flex-col justify-center cursor-move"><p className="text-xs text-slate-400 mb-1">ROAS</p><p className="font-bold text-lg">{kpis.roas.toFixed(2)}x</p></Card></div>}
                 {visibleCards.includes('cpa') && <div key="cpa"><Card className="h-full bg-[#1a1c23] border-white/5 p-3 text-center flex flex-col justify-center cursor-move"><p className="text-xs text-slate-400 mb-1">CPA</p><p className="font-bold text-lg">{formatCurrency(kpis.cpa, product?.currency || 'BRL')}</p></Card></div>}
                 {visibleCards.includes('cpc') && <div key="cpc"><Card className="h-full bg-[#1a1c23] border-white/5 p-3 text-center flex flex-col justify-center cursor-move"><p className="text-xs text-slate-400 mb-1">CPC</p><p className="font-bold text-lg">{formatCurrency(kpis.cpc, product?.currency || 'BRL')}</p></Card></div>}
                 {visibleCards.includes('cpm') && <div key="cpm"><Card className="h-full bg-[#1a1c23] border-white/5 p-3 text-center flex flex-col justify-center cursor-move"><p className="text-xs text-slate-400 mb-1">CPM</p><p className="font-bold text-lg">{formatCurrency(kpis.cpm, product?.currency || 'BRL')}</p></Card></div>}
                 {visibleCards.includes('ctr') && <div key="ctr"><Card className="h-full bg-[#1a1c23] border-white/5 p-3 text-center flex flex-col justify-center cursor-move"><p className="text-xs text-slate-400 mb-1">CTR</p><p className="font-bold text-lg">{kpis.ctr.toFixed(2)}%</p></Card></div>}
                 {visibleCards.includes('arpu') && <div key="arpu"><Card className="h-full bg-[#1a1c23] border-white/5 p-3 text-center flex flex-col justify-center cursor-move"><p className="text-xs text-slate-400 mb-1">Ticket Médio</p><p className="font-bold text-green-400 text-lg">{formatCurrency(kpis.arpu, product?.currency || 'BRL')}</p></Card></div>}

                 {visibleCards.includes('last_sale') && (
                   <div key="last_sale">
                     <Card className="h-full bg-[#1a1c23] border-white/5 p-4 cursor-move overflow-y-auto custom-scrollbar">
                       <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                         <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vendas por Produto (Hoje)</h3>
                         <span className="text-xs text-muted-foreground">{kpis.productsSoldList.length} produto{kpis.productsSoldList.length !== 1 ? 's' : ''}</span>
                       </div>
                       <div className="space-y-2">
                         <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold px-2">
                           <span>Produto</span>
                           <span>Vendas</span>
                         </div>
                         {kpis.productsSoldList.map((p: any, i: number) => (
                           <div key={i} className="flex justify-between items-center bg-[#0f1115] p-2 rounded border border-white/5 text-sm">
                             <span className="font-medium text-slate-200 truncate pr-4">{p.name}</span>
                             <span className="font-bold">{p.count}</span>
                           </div>
                         ))}
                         {kpis.productsSoldList.length === 0 && (
                           <div className="text-center py-4 text-sm text-slate-500">Nenhuma venda aprovada hoje.</div>
                         )}
                         <div className="flex justify-between items-center p-2 text-sm font-bold border-t border-white/5 mt-2 text-slate-300">
                           <span>Total</span>
                           <span>{kpis.productsSoldToday}</span>
                         </div>
                       </div>
                     </Card>
                   </div>
                 )}

                 {visibleCards.includes('funnel') && (
                   <div key="funnel" className={`flex flex-col h-full ${isEditMode ? 'cursor-move' : ''}`}>
                      <ConversionFunnel 
                         clicks={kpis.clicks} 
                         pageViews={kpis.pageViews} 
                         ic={kpis.ic} 
                         salesGenerated={kpis.purchases + kpis.pendingPurchases} 
                         salesApproved={kpis.purchases} 
                      />
                   </div>
                 )}
                 {visibleCards.includes('hourly_sales') && (
                   <div key="hourly_sales" className={`flex flex-col h-full ${isEditMode ? 'cursor-move' : ''}`}>
                      <HourlySalesChart 
                         events={events.filter(e => isEventInDateRange(e.created_at))} 
                      />
                   </div>
                 )}
               </ResponsiveGridLayoutWithWidth>
               ) : (
                 <div className="flex-1 flex items-center justify-center min-h-[400px]">
                   <p className="text-slate-500">Carregando painel...</p>
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
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <Switch id="active-only" checked={showOnlyActive} onCheckedChange={setShowOnlyActive} />
                    <label htmlFor="active-only" className="text-xs font-bold text-slate-300 cursor-pointer select-none">Apenas Ativas</label>
                  </div>
                  {(selectedCampaignIds.length > 0 || selectedAdsetIds.length > 0) && (
                     <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground hover:text-white" onClick={() => { setSelectedCampaignIds([]); setSelectedAdsetIds([]); }}>Limpar Filtros</Button>
                  )}
                </div>
              </div>

              {(() => {
                const renderTotals = (items: any[], type: 'campaigns'|'adsets'|'ads', idKey: string) => {
                  let tPurchases = 0, tSpend = 0, tRevenue = 0, tIC = 0, tImpressions = 0, tClicks = 0;
                  
                  items.forEach(item => {
                    const m = getMetric(type, idKey, item[idKey]);
                    tPurchases += m.purchases; tSpend += m.spend; tRevenue += m.revenue;
                    tIC += m.ic; tImpressions += m.impressions; tClicks += m.clicks;
                  });

                  const tProfit = tRevenue - tSpend;
                  const tRoas = tSpend > 0 ? tRevenue / tSpend : 0;
                  const tMargin = tRevenue > 0 ? (tProfit / tRevenue) * 100 : 0;
                  const tRoi = tSpend > 0 ? tProfit / tSpend : 0;
                  const tCpa = tPurchases > 0 ? tSpend / tPurchases : 0;
                  const tCpi = tIC > 0 ? tSpend / tIC : 0;
                  const tCpc = tClicks > 0 ? tSpend / tClicks : 0;
                  const tCtr = tImpressions > 0 ? (tClicks / tImpressions) * 100 : 0;
                  const tCpm = tImpressions > 0 ? (tSpend / tImpressions) * 1000 : 0;

                  return (
                    <tfoot className="bg-[#101217] border-t-2 border-white/10 text-slate-200">
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-right uppercase text-[10px] font-black tracking-widest text-slate-400">Total</td>
                        <td className="px-3 py-3 text-right font-bold">{tPurchases.toFixed(0)}</td>
                        <td className="px-3 py-3 text-right font-medium">{formatCurrency(tCpa, product?.currency || 'BRL')}</td>
                        <td className="px-3 py-3 text-right font-bold text-white">{formatCurrency(tSpend, product?.currency || 'BRL')}</td>
                        <td className="px-3 py-3 text-right font-bold text-green-400">{formatCurrency(tRevenue, product?.currency || 'BRL')}</td>
                        <td className="px-3 py-3 text-right font-bold" style={{color: tProfit >= 0 ? '#4ade80' : '#f87171'}}>{formatCurrency(tProfit, product?.currency || 'BRL')}</td>
                        <td className="px-3 py-3 text-right font-black text-primary">{tRoas.toFixed(2)}x</td>
                        <td className="px-3 py-3 text-right font-bold">{tMargin.toFixed(2)}%</td>
                        <td className="px-3 py-3 text-right font-black" style={{color: tRoi >= 1 ? '#4ade80' : '#f87171'}}>{tRoi.toFixed(2)}</td>
                        <td className="px-3 py-3 text-right font-bold">{tIC.toFixed(0)}</td>
                        <td className="px-3 py-3 text-right font-medium">{tCpi > 0 ? formatCurrency(tCpi, product?.currency || 'BRL') : '-'}</td>
                        <td className="px-3 py-3 text-right font-medium">{formatCurrency(tCpc, product?.currency || 'BRL')}</td>
                        <td className="px-3 py-3 text-right font-bold">{tCtr.toFixed(2)}%</td>
                        <td className="px-3 py-3 text-right font-medium">{formatCurrency(tCpm, product?.currency || 'BRL')}</td>
                        <td className="px-3 py-3 text-right font-medium">{tImpressions.toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-3 text-right font-medium">{tClicks.toLocaleString('pt-BR')}</td>
                      </tr>
                    </tfoot>
                  );
                };

                return (
                  <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#14151a] text-xs uppercase text-slate-400 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="px-3 py-3 w-10"></th>
                      <th className="px-3 py-3 w-10">Status</th>
                      <th className="px-3 py-3 min-w-[180px]">Nome</th>
                      <th className="px-3 py-3 text-center min-w-[120px]">Orçamento</th>
                      <th className="px-3 py-3 text-right">Vendas</th>
                      <th className="px-3 py-3 text-right" title="Custo Por Aquisição">CPA <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right">Gastos</th>
                      <th className="px-3 py-3 text-right" title="Valor Bruto de Vendas">Faturamento <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Faturamento - Gastos">Lucro <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Retorno sobre o Investimento em Ads">ROAS <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Margem de Lucro sobre Faturamento">Margem <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Retorno sobre Investimento">ROI <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Finalizações de Compra (IC)">IC <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Custo por IC">CPI <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Custo por Clique">CPC <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Click Through Rate">CTR <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right" title="Custo por Mil Impressões">CPM <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                      <th className="px-3 py-3 text-right">Impressões</th>
                      <th className="px-3 py-3 text-right" title="Cliques no Link">Cliques <Info className="inline w-3 h-3 ml-1 opacity-50"/></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {metaTab === 'campanhas' && liveMetrics.campaigns.filter(c => {
                       const m = getMetric('campaigns', 'campaign_id', c.campaign_id);
                       if (showOnlyActive && m.status !== 'ACTIVE') return false;
                       return true;
                    }).map(c => {
                      const m = getMetric('campaigns', 'campaign_id', c.campaign_id);
                      const isSelected = selectedCampaignIds.includes(c.campaign_id);
                      const bHist = budgetHistory.filter(h => h.entity_type === 'campaign' && h.entity_id === c.campaign_id);
                      return (
                        <Fragment key={c.campaign_id}>
                          <tr className={`hover:bg-white/5 ${isSelected ? 'bg-primary/5' : ''}`}>
                            <td className="px-3 py-2"><Checkbox checked={isSelected} onCheckedChange={(checked) => {
                               if (checked) setSelectedCampaignIds(prev => [...prev, c.campaign_id]);
                               else setSelectedCampaignIds(prev => prev.filter(id => id !== c.campaign_id));
                            }}/></td>
                            <td className="px-3 py-2"><Switch checked={m.status==='ACTIVE'} onCheckedChange={()=>setConfirmModal({isOpen:true, type:'campaign', id:c.campaign_id, name:c.campaign_name})}/></td>
                            <td className="px-3 py-2 font-medium max-w-[200px] truncate">{c.campaign_name}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-300">
                               <div className="flex items-center justify-center gap-2">
                                 <span>{m.daily_budget > 0 ? `${formatCurrency(m.daily_budget, product?.currency || 'BRL')}/dia` : (m.lifetime_budget > 0 ? `${formatCurrency(m.lifetime_budget, product?.currency || 'BRL')} (Total)` : '-')}</span>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setBudgetModal({isOpen:true, type:'campaign', id:c.campaign_id, name:c.campaign_name})}><Edit2 className="w-3 h-3"/></Button>
                               </div>
                            </td>
                            <td className="px-3 py-2 text-right">{m.purchases.toFixed(0)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(m.cpa, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right text-white">{formatCurrency(m.spend, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right text-green-400">{formatCurrency(m.revenue, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right font-bold" style={{color: m.profit >= 0 ? '#4ade80' : '#f87171'}}>{formatCurrency(m.profit, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                            <td className="px-3 py-2 text-right">{m.margin.toFixed(2)}%</td>
                            <td className="px-3 py-2 text-right font-bold" style={{color: m.roi >= 1 ? '#4ade80' : '#f87171'}}>{m.roi.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{m.ic.toFixed(0)}</td>
                            <td className="px-3 py-2 text-right">{m.cpi > 0 ? formatCurrency(m.cpi, product?.currency || 'BRL') : '-'}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(m.cpc, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right">{m.ctr.toFixed(2)}%</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(m.cpm, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right">{m.impressions.toLocaleString('pt-BR')}</td>
                            <td className="px-3 py-2 text-right">{m.clicks.toLocaleString('pt-BR')}</td>
                          </tr>
                          {bHist.length > 0 && (
                            <tr className="bg-white/[0.02]">
                               <td colSpan={19} className="px-3 py-1.5 text-xs text-slate-400 whitespace-normal">
                                 <div className="flex flex-col gap-1.5">
                                    {bHist.slice(0, 1).map((hist, idx) => (
                                      <div key={idx} className="flex flex-wrap gap-x-4 gap-y-1 items-center opacity-80 border-l-2 border-primary/50 pl-3">
                                         <span><b className="text-slate-200">🔧 Orçamento:</b> <span className="line-through opacity-70">{formatCurrency(hist.old_budget, product?.currency || 'BRL')}</span> <ChevronRight className="inline w-3 h-3 text-primary mx-0.5"/> <span className="text-white font-bold">{formatCurrency(hist.new_budget, product?.currency || 'BRL')}</span></span>
                                         <span><b className="text-slate-200">ROI Antes:</b> {Number(hist.roi_before).toFixed(2)}</span>
                                         <span><b className="text-slate-200">Vendas Antes:</b> {hist.sales_before}</span>
                                         <span className="text-slate-500 text-[10px] ml-auto">{new Date(hist.created_at).toLocaleString('pt-BR')}</span>
                                      </div>
                                    ))}
                                 </div>
                               </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {metaTab === 'conjuntos' && liveMetrics.adsets.filter(a => {
                       const m = getMetric('adsets', 'adset_id', a.adset_id);
                       if (showOnlyActive && m.status !== 'ACTIVE') return false;
                       return selectedCampaignIds.length === 0 || selectedCampaignIds.includes(a.campaign_id);
                    }).map(a => {
                      const m = getMetric('adsets', 'adset_id', a.adset_id);
                      const isSelected = selectedAdsetIds.includes(a.adset_id);
                      const bHist = budgetHistory.filter(h => h.entity_type === 'adset' && h.entity_id === a.adset_id);
                      return (
                        <Fragment key={a.adset_id}>
                          <tr className={`hover:bg-white/5 ${isSelected ? 'bg-primary/5' : ''}`}>
                            <td className="px-3 py-2"><Checkbox checked={isSelected} onCheckedChange={(checked) => {
                               if (checked) setSelectedAdsetIds(prev => [...prev, a.adset_id]);
                               else setSelectedAdsetIds(prev => prev.filter(id => id !== a.adset_id));
                            }}/></td>
                            <td className="px-3 py-2"><Switch checked={m.status==='ACTIVE'} onCheckedChange={()=>setConfirmModal({isOpen:true, type:'adset', id:a.adset_id, name:a.adset_name})}/></td>
                            <td className="px-3 py-2 font-medium max-w-[200px] truncate">{a.adset_name}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-300">
                               <div className="flex items-center justify-center gap-2">
                                 <span>{m.daily_budget > 0 ? `${formatCurrency(m.daily_budget, product?.currency || 'BRL')}/dia` : (m.lifetime_budget > 0 ? `${formatCurrency(m.lifetime_budget, product?.currency || 'BRL')} (Total)` : '-')}</span>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setBudgetModal({isOpen:true, type:'adset', id:a.adset_id, name:a.adset_name})}><Edit2 className="w-3 h-3"/></Button>
                               </div>
                            </td>
                            <td className="px-3 py-2 text-right">{m.purchases.toFixed(0)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(m.cpa, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right text-white">{formatCurrency(m.spend, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right text-green-400">{formatCurrency(m.revenue, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right font-bold" style={{color: m.profit >= 0 ? '#4ade80' : '#f87171'}}>{formatCurrency(m.profit, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                            <td className="px-3 py-2 text-right">{m.margin.toFixed(2)}%</td>
                            <td className="px-3 py-2 text-right font-bold" style={{color: m.roi >= 1 ? '#4ade80' : '#f87171'}}>{m.roi.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{m.ic.toFixed(0)}</td>
                            <td className="px-3 py-2 text-right">{m.cpi > 0 ? formatCurrency(m.cpi, product?.currency || 'BRL') : '-'}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(m.cpc, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right">{m.ctr.toFixed(2)}%</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(m.cpm, product?.currency || 'BRL')}</td>
                            <td className="px-3 py-2 text-right">{m.impressions.toLocaleString('pt-BR')}</td>
                            <td className="px-3 py-2 text-right">{m.clicks.toLocaleString('pt-BR')}</td>
                          </tr>
                          {bHist.length > 0 && (
                            <tr className="bg-white/[0.02]">
                               <td colSpan={19} className="px-3 py-1.5 text-xs text-slate-400 whitespace-normal">
                                 <div className="flex flex-col gap-1.5">
                                    {bHist.slice(0, 1).map((hist, idx) => (
                                      <div key={idx} className="flex flex-wrap gap-x-4 gap-y-1 items-center opacity-80 border-l-2 border-primary/50 pl-3">
                                         <span><b className="text-slate-200">🔧 Orçamento:</b> <span className="line-through opacity-70">{formatCurrency(hist.old_budget, product?.currency || 'BRL')}</span> <ChevronRight className="inline w-3 h-3 text-primary mx-0.5"/> <span className="text-white font-bold">{formatCurrency(hist.new_budget, product?.currency || 'BRL')}</span></span>
                                         <span><b className="text-slate-200">ROI Antes:</b> {Number(hist.roi_before).toFixed(2)}</span>
                                         <span><b className="text-slate-200">Vendas Antes:</b> {hist.sales_before}</span>
                                         <span className="text-slate-500 text-[10px] ml-auto">{new Date(hist.created_at).toLocaleString('pt-BR')}</span>
                                      </div>
                                    ))}
                                 </div>
                               </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {metaTab === 'anuncios' && liveMetrics.ads.filter(a => {
                       const m = getMetric('ads', 'ad_id', a.ad_id);
                       if (showOnlyActive && m.status !== 'ACTIVE') return false;
                       return (selectedCampaignIds.length === 0 || selectedCampaignIds.includes(a.campaign_id)) && 
                              (selectedAdsetIds.length === 0 || selectedAdsetIds.includes(a.adset_id));
                    }).map(a => {
                      const m = getMetric('ads', 'ad_id', a.ad_id);
                      return (
                        <tr key={a.ad_id} className="hover:bg-white/5">
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"><Switch checked={m.status==='ACTIVE'} onCheckedChange={()=>setConfirmModal({isOpen:true, type:'ad', id:a.ad_id, name:a.ad_name})}/></td>
                          <td className="px-3 py-2 font-medium max-w-[200px] truncate">{a.ad_name}</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-300">-</td>
                          <td className="px-3 py-2 text-right">{m.purchases.toFixed(0)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpa, product?.currency || 'BRL')}</td>
                          <td className="px-3 py-2 text-right text-white">{formatCurrency(m.spend, product?.currency || 'BRL')}</td>
                          <td className="px-3 py-2 text-right text-green-400">{formatCurrency(m.revenue, product?.currency || 'BRL')}</td>
                          <td className="px-3 py-2 text-right font-bold" style={{color: m.profit >= 0 ? '#4ade80' : '#f87171'}}>{formatCurrency(m.profit, product?.currency || 'BRL')}</td>
                          <td className="px-3 py-2 text-right text-primary font-bold">{m.roas.toFixed(2)}x</td>
                          <td className="px-3 py-2 text-right">{m.margin.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right font-bold" style={{color: m.roi >= 1 ? '#4ade80' : '#f87171'}}>{m.roi.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{m.ic.toFixed(0)}</td>
                          <td className="px-3 py-2 text-right">{m.cpi > 0 ? formatCurrency(m.cpi, product?.currency || 'BRL') : '-'}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpc, product?.currency || 'BRL')}</td>
                          <td className="px-3 py-2 text-right">{m.ctr.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(m.cpm, product?.currency || 'BRL')}</td>
                          <td className="px-3 py-2 text-right">{m.impressions.toLocaleString('pt-BR')}</td>
                          <td className="px-3 py-2 text-right">{m.clicks.toLocaleString('pt-BR')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {metaTab === 'campanhas' && renderTotals(
                    liveMetrics.campaigns.filter(c => !showOnlyActive || getMetric('campaigns', 'campaign_id', c.campaign_id).status === 'ACTIVE'),
                    'campaigns', 'campaign_id'
                  )}
                  {metaTab === 'conjuntos' && renderTotals(
                    liveMetrics.adsets.filter(a => (!showOnlyActive || getMetric('adsets', 'adset_id', a.adset_id).status === 'ACTIVE') && (selectedCampaignIds.length === 0 || selectedCampaignIds.includes(a.campaign_id))),
                    'adsets', 'adset_id'
                  )}
                  {metaTab === 'anuncios' && renderTotals(
                    liveMetrics.ads.filter(a => (!showOnlyActive || getMetric('ads', 'ad_id', a.ad_id).status === 'ACTIVE') && (selectedCampaignIds.length === 0 || selectedCampaignIds.includes(a.campaign_id)) && (selectedAdsetIds.length === 0 || selectedAdsetIds.includes(a.adset_id))),
                    'ads', 'ad_id'
                  )}
                </table>
              </div>
              );
            })()}
            </TabsContent>

            {/* ABA: VENDAS */}
            <TabsContent value="vendas" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-4xl mx-auto space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline">Lista de Vendas</h2>
                   <p className="text-sm text-slate-400">Histórico de compras aprovadas e pendentes (PIX e Boleto).</p>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4 mb-4">
                   <div className="flex-1 relative">
                     <Input 
                       placeholder="Buscar por nome ou email..." 
                       value={salesSearch} 
                       onChange={e => { setSalesSearch(e.target.value); setSalesPage(1); }}
                       className="w-full bg-[#1a1c23] border-white/10 pl-10"
                     />
                     <MousePointerClick className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                   </div>
                   <div className="flex items-center gap-2">
                     <Select value={salesDateFilter} onValueChange={val => { setSalesDateFilter(val); setSalesPage(1); }}>
                       <SelectTrigger className="w-[160px] bg-[#1a1c23] border-white/10">
                         <SelectValue placeholder="Período" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">Todo o período</SelectItem>
                         <SelectItem value="hoje">Hoje</SelectItem>
                         <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                         <SelectItem value="custom">Personalizado</SelectItem>
                       </SelectContent>
                     </Select>
                     
                     {salesDateFilter === 'custom' && (
                       <div className="flex gap-2">
                         <Input type="date" value={salesDateStart} onChange={e => { setSalesDateStart(e.target.value); setSalesPage(1); }} className="bg-[#1a1c23] border-white/10" />
                         <Input type="date" value={salesDateEnd} onChange={e => { setSalesDateEnd(e.target.value); setSalesPage(1); }} className="bg-[#1a1c23] border-white/10" />
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="border border-white/10 rounded-xl bg-[#1a1c23] overflow-hidden">
                    <h3 className="font-bold text-sm p-4 border-b border-white/5 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" /> Vendas Recebidas
                      <span className="ml-auto text-xs text-muted-foreground font-normal">{filteredSales.length} venda{filteredSales.length !== 1 ? 's' : ''}</span>
                    </h3>
                    {filteredSales.length === 0 ? (
                      <div className="py-12 text-center">
                        <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">Nenhuma venda encontrada para os filtros aplicados.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead className="bg-[#14151a] text-xs uppercase text-slate-400 sticky top-0 z-10 shadow-md">
                            <tr>
                              <th className="px-4 py-3">Data</th>
                              <th className="px-4 py-3">Cliente</th>
                              <th className="px-4 py-3">Email</th>
                              <th className="px-4 py-3">Telefone</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Método</th>
                              <th className="px-4 py-3 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {paginatedSales.map(e => {
                              const rawMethod = String(e.raw_payload?.payment?.payment_method || e.raw_payload?.payment?.paymentMethod || e.raw_payload?.payment?.method || e.raw_payload?.payment_method_type || e.raw_payload?.payment_method || e.raw_payload?.payment?.type || e.raw_payload?.checkout?.payment_method || e.raw_payload?.event || e.event_type || 'Desconhecido').toLowerCase();
                              let methodIcon = null;
                              let methodName = 'Desconhecido';

                              if (rawMethod.includes('pix')) {
                                 methodIcon = '/icons/pix.png';
                                 methodName = 'Pix';
                              } else if (rawMethod.includes('credit') || rawMethod.includes('cartao') || rawMethod.includes('card')) {
                                 methodIcon = '/icons/cartao.png';
                                 methodName = 'Cartão';
                              } else if (rawMethod.includes('boleto') || rawMethod.includes('billet')) {
                                 methodName = 'Boleto';
                              } else {
                                 const rawUpper = rawMethod.toUpperCase();
                                 if (rawUpper === 'PURCHASE' || rawUpper === 'PAYMENT' || rawUpper === 'DESCONHECIDO') {
                                    methodName = '—';
                                 } else {
                                    methodName = rawUpper;
                                 }
                              }
                              const phone = e.raw_payload?.customer?.mobile_phone || e.raw_payload?.customer?.phone || e.raw_payload?.Customer?.mobile || 'Não Informado';
                              return (
                                <tr key={e.id} className="hover:bg-white/5">
                                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR')}</td>
                                  <td className="px-4 py-3 font-medium text-slate-200 max-w-[150px] sm:max-w-[200px] truncate" title={e.customer_name || ''}>
                                    <button onClick={() => setSelectedSaleForModal(e)} className="hover:underline hover:text-primary text-left truncate w-full">
                                      {e.customer_name || '—'}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] sm:max-w-[200px] truncate" title={e.customer_email || ''}>{e.customer_email || '—'}</td>
                                  <td className="px-4 py-3 text-xs text-slate-400">{phone}</td>
                                  <td className="px-4 py-3">
                                    {e.status === 'approved' ? (
                                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 text-xs">Pago</Badge>
                                    ) : e.status === 'pending' ? (
                                      <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs">Pendente</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">{e.status}</Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs uppercase text-slate-400">
                                    <div className="flex items-center gap-2">
                                      {methodIcon && <img src={methodIcon} alt={methodName} className="w-5 h-5 object-contain" />}
                                      <span>{methodName}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-green-400">{formatCurrency(e.event_value, product?.currency || 'BRL')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {totalSalesPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t border-white/5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={salesPage === 1}
                          onClick={() => setSalesPage(prev => Math.max(1, prev - 1))}
                          className="bg-transparent border-white/10"
                        >
                          Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground">Página {salesPage} de {totalSalesPages}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={salesPage === totalSalesPages}
                          onClick={() => setSalesPage(prev => Math.min(totalSalesPages, prev + 1))}
                          className="bg-transparent border-white/10"
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                 </div>
               </div>
            </TabsContent>

            {/* ABA: WEBHOOKS */}
            <TabsContent value="webhooks" className="flex-1 overflow-y-auto p-6 m-0">
               <div className="max-w-3xl mx-auto space-y-6">
                 <div>
                   <h2 className="text-xl font-bold font-headline">Webhook de Vendas</h2>
                   <p className="text-sm text-slate-400">Cole esta URL na plataforma de checkout (Hotmart, Kiwify, PerfectPay). O FluxoFy receberá as vendas automaticamente.</p>
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
                           <span className="font-bold text-orange-400">{t.percentage ? `${t.percentage}%` : formatCurrency(t.fixed_amount, product?.currency || 'BRL')}</span>
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
                           <span className="font-bold text-red-400">-{formatCurrency(e.amount, product?.currency || 'BRL')}</span>
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
{`<!-- FluxoFy & Meta Pixel Code -->
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
<!-- FluxoFy Tracking Integration -->
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/fluxofy-pixel.js" data-product-id="${id}" data-user-id="${user?.uid || ''}"${icTriggerText ? ` data-ic-text="${icTriggerText}"` : ''}${icTriggerUrl ? ` data-ic-url="${icTriggerUrl}"` : ''}></script>
<!-- End Pixel Code -->`}
                        </pre>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white"
                          onClick={() => {
                            const code = `<!-- FluxoFy & Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${pixel.pixel_id}');\nfbq('track', 'PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=${pixel.pixel_id}&ev=PageView&noscript=1"\n/></noscript>\n<!-- FluxoFy Tracking Integration -->\n<script src="${window.location.origin}/fluxofy-pixel.js" data-product-id="${id}" data-user-id="${user?.uid}"${icTriggerText ? ` data-ic-text="${icTriggerText}"` : ''}${icTriggerUrl ? ` data-ic-url="${icTriggerUrl}"` : ''}></script>\n<!-- End Pixel Code -->`;
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
                     O <strong>Token de Acesso</strong> permite que o FluxoFy envie eventos de compra diretamente para a Meta via <strong>Conversions API (CAPI)</strong>, sem depender do pixel no navegador. Isso melhora a atribuição e resolve bloqueios de ad-blockers.
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
                    <div className="flex-1 pr-4">
                      <span className="text-sm font-medium block leading-tight">Notificar Popups no Navegador</span>
                      <span className="text-xs text-muted-foreground mt-1 block leading-snug">Exibe caixas de alerta push mesmo com a aba em segundo plano.</span>
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
                    <div className="flex-1 pr-4">
                      <span className="text-sm font-medium block leading-tight">Vendas Aprovadas</span>
                      <span className="text-xs text-muted-foreground mt-1 block leading-snug">Alertar quando compras forem confirmadas.</span>
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
                    <div className="flex-1 pr-4">
                      <span className="text-sm font-medium block leading-tight">Vendas Pendentes</span>
                      <span className="text-xs text-muted-foreground mt-1 block leading-snug">Alertar quando boletos forem gerados ou PIX emitidos.</span>
                    </div>
                    <Switch 
                      checked={notifyPend} 
                      onCheckedChange={(val) => {
                        setNotifyPend(val);
                        localStorage.setItem("notify_pending", val ? "true" : "false");
                      }} 
                    />
                  </div>

                </div>

                  <div className="pt-4">
                    <Button 
                      onClick={testNotification} 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 gap-2"
                    >
                      <Volume2 className="w-5 h-5" /> Testar Alerta & Som de Venda
                    </Button>
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

      {/* Sale Details Modal */}
      <Dialog open={!!selectedSaleForModal} onOpenChange={(open) => !open && setSelectedSaleForModal(null)}>
        <DialogContent className="bg-[#14151a] border-white/10 text-white max-w-lg">
          <DialogHeader>
             <DialogTitle>Detalhes da Compra</DialogTitle>
             <DialogDescription>
               Itens adquiridos por <strong className="text-white">{selectedSaleForModal?.customer_name}</strong>
             </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             {selectedSaleForModal?.raw_payload?.product?.title && (
               <div className="bg-[#1a1c23] p-4 rounded-lg border border-white/5">
                 <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Produto Principal</p>
                 <p className="font-medium">{selectedSaleForModal.raw_payload.product.title}</p>
                 {selectedSaleForModal.raw_payload.plan?.title && (
                   <p className="text-sm text-slate-400 mt-1">Plano: {selectedSaleForModal.raw_payload.plan.title}</p>
                 )}
               </div>
             )}
             
             {selectedSaleForModal?.raw_payload?.checkout?.title && !selectedSaleForModal?.raw_payload?.product?.title && (
               <div className="bg-[#1a1c23] p-4 rounded-lg border border-white/5">
                 <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Produto Principal</p>
                 <p className="font-medium">{selectedSaleForModal.raw_payload.checkout.title}</p>
               </div>
             )}

             {selectedSaleForModal?.raw_payload?.products && selectedSaleForModal.raw_payload.products.length > 0 && (
                <div className="bg-[#1a1c23] p-4 rounded-lg border border-white/5">
                 <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Produtos no Checkout</p>
                 <ul className="space-y-2">
                   {selectedSaleForModal.raw_payload.products.map((p: any, i: number) => (
                     <li key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                       <span>{p.title || p.name}</span>
                       {p.price !== undefined && <span className="font-mono text-green-400">{formatCurrency(p.price, product?.currency || 'BRL')}</span>}
                     </li>
                   ))}
                 </ul>
               </div>
             )}

             {selectedSaleForModal?.raw_payload?.checkout?.orderbump && (
               <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                 <p className="text-xs text-primary uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                   <Plus className="w-3 h-3"/> Order Bump Adquirido
                 </p>
                 <p className="font-medium text-sm">{selectedSaleForModal.raw_payload.checkout.orderbump.title || 'Oferta Adicional'}</p>
                 {selectedSaleForModal.raw_payload.checkout.orderbump.price !== undefined && (
                   <p className="text-xs text-green-400 mt-1 font-mono">{formatCurrency(selectedSaleForModal.raw_payload.checkout.orderbump.price, product?.currency || 'BRL')}</p>
                 )}
               </div>
             )}
             
             {/* Fallback caso não tenha produtos listados */}
             {!selectedSaleForModal?.raw_payload?.product?.title && 
              !selectedSaleForModal?.raw_payload?.checkout?.title && 
              (!selectedSaleForModal?.raw_payload?.products || selectedSaleForModal.raw_payload.products.length === 0) && (
               <div className="bg-[#1a1c23] p-4 rounded-lg border border-white/5 text-center text-slate-400 text-sm">
                 Nenhum detalhe de produto especificado no payload desta compra.
               </div>
             )}
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedSaleForModal(null)} className="w-full">Fechar</Button>
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
               {id: 'meta_balance', label: 'Saldo Conta Ads'},
               {id: 'profit', label: 'Lucro Líquido'},
               {id: 'roi', label: 'ROI'},
               {id: 'roas', label: 'ROAS'},
               {id: 'cpa', label: 'CPA'},
               {id: 'cpc', label: 'CPC'},
               {id: 'cpm', label: 'CPM'},
               {id: 'ctr', label: 'CTR'},
               {id: 'arpu', label: 'Ticket Médio (ARPU)'},
               {id: 'last_sale', label: 'Última Venda / Origem'},
               {id: 'funnel', label: 'Funil Visual'},
               {id: 'hourly_sales', label: 'Vendas por Horário'}
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
