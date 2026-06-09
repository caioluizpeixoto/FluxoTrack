"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { useUser } from "@/firebase";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutDashboard, Copy, Trash, Settings, DollarSign } from "lucide-react";
import LinkNext from "next/link";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Home() {
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboards();
    } else if (user === null) {
      setLoading(false);
    }
  }, [user]);

  async function loadDashboards() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('user_id', user!.uid)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setDashboards(data || []);

      // Calculate global balance
      if (data && data.length > 0) {
        const dashIds = data.map((d:any) => d.id);
        const { data: prods } = await supabase.from('products').select('id').in('dashboard_id', dashIds);
        
        if (prods && prods.length > 0) {
          const prodIds = prods.map((p:any) => p.id);
          const { data: evts } = await supabase.from('events')
            .select('event_value')
            .in('product_id', prodIds)
            .eq('event_type', 'purchase')
            .eq('status', 'approved');
            
          if (evts) {
            const total = evts.reduce((acc: number, curr: any) => acc + Number(curr.event_value || 0), 0);
            setBalance(total);
          }
        }
      }

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar', description: e.message });
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await supabase.from('dashboards').update({ name, description: desc }).eq('id', editId);
        toast({ title: 'Dashboard atualizado' });
      } else {
        await supabase.from('dashboards').insert({ user_id: user!.uid, name, description: desc });
        toast({ title: 'Dashboard criado' });
      }
      setIsModalOpen(false);
      loadDashboards();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: any) => {
    e.preventDefault(); // Prevent Link navigation
    if (!confirm('Deseja realmente excluir este dashboard e todos os produtos dentro dele?')) return;
    try {
      await supabase.from('dashboards').delete().eq('id', id);
      toast({ title: 'Dashboard excluído' });
      loadDashboards();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  const handleDuplicate = async (dash: any, e: any) => {
    e.preventDefault();
    try {
      await supabase.from('dashboards').insert({
        user_id: user!.uid,
        name: `${dash.name} (Cópia)`,
        description: dash.description
      });
      toast({ title: 'Dashboard duplicado' });
      loadDashboards();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-[#0f1115] text-slate-200">
      <DashboardSidebar />
      <main className="flex-1 w-full p-4 lg:p-12 transition-all">
        <div className="max-w-6xl mx-auto pt-16 md:pt-16">
          <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold font-headline mb-1 flex items-center gap-2">
                <LayoutDashboard className="text-primary w-7 h-7" />
                Meus Dashboards
              </h1>
              <p className="text-muted-foreground text-sm">Gerencie seus projetos e agrupe seus produtos.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {user && !loading && (
                <div className="bg-[#1a1c23] border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Saldo da Conta</p>
                    <p className="text-lg font-headline font-bold text-slate-200">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                    </p>
                  </div>
                </div>
              )}
              <Button onClick={() => { setEditId(null); setName(""); setDesc(""); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 h-full py-4 sm:py-2">
                <Plus className="w-5 h-5" /> Criar Dashboard
              </Button>
            </div>
          </header>

          {!user ? (
            <Card className="p-12 text-center bg-[#14151a] border-white/5">
              <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground">Faça login pela aba <strong>Login</strong> (ou menu lateral no desktop) para gerenciar seus dashboards.</p>
            </Card>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[1,2,3].map(i => <Card key={i} className="h-40 bg-[#14151a]/50 animate-pulse border-white/5" />)}
            </div>
          ) : dashboards.length === 0 ? (
            <Card className="p-12 text-center bg-[#14151a] border-white/5 border-dashed flex flex-col items-center justify-center">
              <LayoutDashboard className="w-16 h-16 text-slate-700 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Nenhum Dashboard Criado</h2>
              <p className="text-muted-foreground mb-6">Comece criando seu primeiro dashboard para organizar seus produtos.</p>
              <Button onClick={() => { setEditId(null); setName(""); setDesc(""); setIsModalOpen(true); }} variant="outline">
                Criar Primeiro Dashboard
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboards.map(dash => (
                <LinkNext key={dash.id} href={`/dashboards/${dash.id}`}>
                  <Card className="bg-[#14151a] border-white/5 hover:border-primary/50 transition-all cursor-pointer group flex flex-col h-full overflow-hidden relative">
                    <div className="p-6 flex-1">
                      <h3 className="text-xl font-bold font-headline mb-2 group-hover:text-primary transition-colors">{dash.name}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2">{dash.description || 'Sem descrição'}</p>
                    </div>
                    <div className="px-6 py-4 bg-[#1a1c23] border-t border-white/5 flex items-center justify-between mt-auto">
                      <span className="text-xs text-muted-foreground">Criado em: {format(new Date(dash.created_at), "dd MMM, yyyy", { locale: ptBR })}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white" onClick={(e) => { e.preventDefault(); setEditId(dash.id); setName(dash.name); setDesc(dash.description || ''); setIsModalOpen(true); }}>
                           <Settings className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white" onClick={(e) => handleDuplicate(dash, e)}>
                           <Copy className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={(e) => handleDelete(dash.id, e)}>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#14151a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Dashboard' : 'Novo Dashboard'}</DialogTitle>
            <DialogDescription>Organize seus produtos e métricas agrupando-os por nicho ou empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Dashboard</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Encapsulados" className="bg-[#0f1115] border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (Opcional)</label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Produtos físicos da loja X" className="bg-[#0f1115] border-white/10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="bg-primary hover:bg-primary/90 text-white font-bold">
              {saving ? 'Salvando...' : 'Salvar Dashboard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
