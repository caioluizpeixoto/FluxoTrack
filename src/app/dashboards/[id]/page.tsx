"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { useUser } from "@/firebase";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutDashboard, Settings, ArrowLeft, Package, Trash, DollarSign } from "lucide-react";
import LinkNext from "next/link";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatters";
import { useParams, useRouter } from "next/navigation";

export default function DashboardDetails() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user && id) {
      loadData();
    }
  }, [user, id]);

  async function loadData() {
    setLoading(true);
    try {
      const [dashRes, prodRes, accRes] = await Promise.all([
        supabase.from('dashboards').select('*').eq('id', id).single(),
        supabase.from('products').select('*').eq('dashboard_id', id).order('created_at', { ascending: false }),
        supabase.from('meta_ad_accounts').select('*').eq('user_id', user!.uid)
      ]);
      
      if (dashRes.error) throw dashRes.error;
      setDashboard(dashRes.data);
      setProducts(prodRes.data || []);
      setAdAccounts(accRes.data || []);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar', description: e.message });
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await supabase.from('products').update({ 
          name, 
          price: Number(price) || 0,
          product_cost: Number(cost) || 0
        }).eq('id', editId);
        
        if (accountId) {
           // Upsert ad account for product
           const { data: existing } = await supabase.from('product_ad_accounts').select('id').eq('product_id', editId).maybeSingle();
           if (existing) {
             await supabase.from('product_ad_accounts').update({ ad_account_id: accountId }).eq('id', existing.id);
           } else {
             await supabase.from('product_ad_accounts').insert({ user_id: user!.uid, product_id: editId, ad_account_id: accountId });
           }
        }
        toast({ title: 'Produto atualizado' });
      } else {
        const { data: newProd, error: prodErr } = await supabase.from('products').insert({ 
          user_id: user!.uid, 
          dashboard_id: id,
          name, 
          price: Number(price) || 0,
          product_cost: Number(cost) || 0,
          status: 'active'
        }).select().single();
        
        if (prodErr) throw prodErr;
        
        if (accountId && newProd) {
          await supabase.from('product_ad_accounts').insert({ user_id: user!.uid, product_id: newProd.id, ad_account_id: accountId });
        }
        
        toast({ title: 'Produto criado' });
      }
      setIsModalOpen(false);
      loadData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prodId: string, e: any) => {
    e.preventDefault(); 
    if (!confirm('Deseja realmente excluir este produto e todas suas métricas?')) return;
    try {
      await supabase.from('products').delete().eq('id', prodId);
      toast({ title: 'Produto excluído' });
      loadData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-[#0f1115] text-slate-200">
      <DashboardSidebar />
      <main className="flex-1 w-full p-4 lg:p-12 transition-all">
        <div className="max-w-6xl mx-auto pt-16">
          
          <div className="mb-6">
            <LinkNext href="/" className="text-muted-foreground hover:text-white flex items-center gap-2 text-sm w-fit transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar aos Dashboards
            </LinkNext>
          </div>

          {loading ? (
            <div className="h-20 w-1/3 bg-white/5 animate-pulse rounded-lg mb-8" />
          ) : (
            <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold font-headline mb-1 flex items-center gap-2">
                  <LayoutDashboard className="text-primary w-7 h-7" />
                  {dashboard?.name}
                </h1>
                <p className="text-muted-foreground text-sm">{dashboard?.description || 'Nenhuma descrição.'}</p>
              </div>
              
              <Button onClick={() => { setEditId(null); setName(""); setPrice(""); setCost(""); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 w-full sm:w-auto">
                <Plus className="w-5 h-5" /> Novo Produto
              </Button>
            </header>
          )}

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-48 bg-[#14151a]/50 animate-pulse border-white/5" />
             </div>
          ) : products.length === 0 ? (
            <Card className="p-12 text-center bg-[#14151a] border-white/5 border-dashed flex flex-col items-center justify-center">
              <Package className="w-16 h-16 text-slate-700 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Nenhum Produto Criado</h2>
              <p className="text-muted-foreground mb-6">Comece criando seu primeiro produto para visualizar métricas isoladas.</p>
              <Button onClick={() => { setEditId(null); setName(""); setPrice(""); setCost(""); setIsModalOpen(true); }} variant="outline">
                Criar Primeiro Produto
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map(prod => (
                <LinkNext key={prod.id} href={`/products/${prod.id}`}>
                  <Card className="bg-[#14151a] border-white/5 hover:border-primary/50 transition-all cursor-pointer group flex flex-col h-full overflow-hidden">
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                           <h3 className="text-xl font-bold font-headline mb-1 group-hover:text-primary transition-colors">{prod.name}</h3>
                           <div className="flex items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-green-500"/> {formatCurrency(prod.price || 0)}</span>
                              <span>Custo: {formatCurrency(prod.product_cost || 0)}</span>
                           </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${prod.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {prod.status === 'active' ? 'Ativo' : 'Inativo'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
                         <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Gasto Hoje</p>
                            <p className="font-bold text-slate-300">-</p>
                         </div>
                         <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Vendas Hoje</p>
                            <p className="font-bold text-slate-300">-</p>
                         </div>
                         <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase mb-1">Lucro Hoje</p>
                            <p className="font-bold text-green-400">-</p>
                         </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-[#1a1c23] border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-2">Clique para ver métricas detalhadas <ArrowLeft className="w-3 h-3 rotate-180"/></span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white" onClick={(e) => { e.preventDefault(); setEditId(prod.id); setName(prod.name); setPrice(prod.price?.toString()); setCost(prod.product_cost?.toString()); setIsModalOpen(true); }}>
                           <Settings className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={(e) => handleDelete(prod.id, e)}>
                           <Trash className="w-4 h-4" />
                         </Button>
                      </div>
                    </div>
                  </Card>
                </LinkNext>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Modal de Produto */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#14151a] border-white/10 text-white sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>Dados básicos do produto. Vínculos de campanhas são feitos dentro da página do produto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Produto</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Curso de Vendas" className="bg-[#0f1115] border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço de Venda (R$)</label>
                <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="97.00" className="bg-[#0f1115] border-white/10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Custo do Produto (R$)</label>
                <Input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" className="bg-[#0f1115] border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Conta de Anúncios Principal</label>
              <select 
                 className="flex h-10 w-full rounded-md border border-white/10 bg-[#0f1115] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                 value={accountId}
                 onChange={(e) => setAccountId(e.target.value)}
              >
                 <option value="">Selecione uma conta...</option>
                 {adAccounts.map(acc => (
                   <option key={acc.account_id} value={acc.account_id}>{acc.account_name} ({acc.account_id})</option>
                 ))}
              </select>
              <p className="text-xs text-muted-foreground">O produto puxará automaticamente todas as campanhas desta conta.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="bg-primary hover:bg-primary/90 text-white font-bold">
              {saving ? 'Salvando...' : 'Salvar Produto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
