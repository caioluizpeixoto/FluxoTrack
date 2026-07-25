"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/firebase";
import { useState, useEffect, useCallback } from "react";
import { Loader2, UserPlus, Trash2, ShieldAlert, Check, X, Clock, ShieldCheck, RefreshCw, KeyRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface AuthorizedUser {
  id: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: 'approved' | 'pending' | 'rejected';
  invited_by?: string;
  created_at: string;
}

export default function UsersManagementPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [fetching, setFetching] = useState(true);
  
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Redireciona se não for Admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== 'Admin' && user.email?.toLowerCase().trim() !== 'caioluispeixotos@gmail.com') {
        toast({ variant: "destructive", title: "Acesso negado", description: "Apenas o administrador (caioluispeixotos@gmail.com) pode gerenciar usuários." });
        router.replace("/");
      }
    }
  }, [user, loading, router]);

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar usuários");
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao buscar usuários", description: err.message });
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || adding) return;
    setAdding(true);
    
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", email: newEmail, role: "Viewer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao pré-aprovar");
      
      toast({ title: "Usuário pré-aprovado com sucesso!" });
      setNewEmail("");
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setAdding(false);
    }
  };

  const handleApproveUser = async (id: string, email: string) => {
    setActionId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", id, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao aprovar");

      toast({ title: "Cadastro aprovado!", description: `O acesso e o e-mail de ${email} foram liberados.` });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao aprovar", description: err.message });
    } finally {
      setActionId(null);
    }
  };

  const handleRejectUser = async (id: string, email: string) => {
    if (!confirm(`Deseja rejeitar e remover a solicitação de ${email}?`)) return;
    setActionId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", id, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao rejeitar");

      toast({ title: "Solicitação rejeitada", description: `A solicitação de ${email} foi removida.` });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao rejeitar", description: err.message });
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveUser = async (id: string, email: string) => {
    if (email.toLowerCase().trim() === 'caioluispeixotos@gmail.com') {
      toast({ variant: "destructive", title: "Ação não permitida", description: "O Administrador principal não pode ser removido." });
      return;
    }
    
    if (!confirm(`Tem certeza que deseja revogar o acesso de ${email}?`)) return;
    
    setActionId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", id, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao revogar");

      toast({ title: "Acesso revogado com sucesso." });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setActionId(null);
    }
  };

  const handleSetPassword = async (email: string) => {
    const newPass = prompt(`Digite a nova senha para ${email}:`);
    if (!newPass) return;
    if (newPass.length < 6) {
      toast({ variant: "destructive", title: "Senha muito curta", description: "A senha deve ter no mínimo 6 caracteres." });
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_password", email, password: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao alterar senha");

      toast({ title: "Senha alterada com sucesso!", description: `A nova senha para ${email} foi gravada.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved' || u.email.toLowerCase().trim() === 'caioluispeixotos@gmail.com');

  if (loading || (user && user.role !== 'Admin' && user.email?.toLowerCase().trim() !== 'caioluispeixotos@gmail.com' && !fetching)) {
    return (
      <div className="flex min-h-screen bg-[#0f1115]">
        <DashboardSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0f1115]">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                Aprovação de Usuários
              </h1>
              <p className="text-slate-400 text-sm">
                Gerencie solicitações de acesso, libere usuários e redefina senhas se necessário.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={fetching}
              className="border-white/10 hover:bg-white/10 text-slate-300 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {/* Seção 1: Solicitações de Cadastro Pendentes */}
          <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                  Solicitações de Cadastro Pendentes ({pendingUsers.length})
                </CardTitle>
                <CardDescription className="text-amber-200/70 text-xs">
                  Usuários cadastrados no sistema aguardando sua autorização.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {fetching ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-xs">
                  Nenhuma solicitação pendente de aprovação no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((pu) => (
                    <div
                      key={pu.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/5"
                    >
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">{pu.email}</p>
                        <p className="text-[11px] text-slate-400">
                          Solicitado em: {new Date(pu.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          onClick={() => handleApproveUser(pu.id, pu.email)}
                          disabled={actionId === pu.id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1 text-xs h-9 flex-1 sm:flex-initial"
                        >
                          {actionId === pu.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Aprovar Acesso
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectUser(pu.id, pu.email)}
                          disabled={actionId === pu.id}
                          className="font-semibold gap-1 text-xs h-9"
                        >
                          <X className="h-3.5 w-3.5" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seção 2: Pré-aprovar Novo E-mail */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Pré-Aprovar E-mail</CardTitle>
              <CardDescription>Autorize previamente um e-mail para que ele tenha acesso imediato assim que se cadastrar.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@exemplo.com" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="border-white/10 bg-white/5 text-slate-100"
                  />
                </div>
                <Button type="submit" disabled={adding || !newEmail} className="w-full sm:w-auto font-semibold">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Pré-Aprovar E-mail
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Seção 3: Usuários Autorizados Ativos */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Usuários Aprovados (Ativos)</CardTitle>
            </CardHeader>
            <CardContent>
              {fetching ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : approvedUsers.length === 0 ? (
                <div className="text-center p-8 text-slate-400 flex flex-col items-center">
                  <ShieldAlert className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhum usuário ativo encontrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3">E-mail</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedUsers.map((u) => {
                        const isMainAdmin = u.email.toLowerCase().trim() === 'caioluispeixotos@gmail.com';
                        return (
                          <tr key={u.id} className="border-b border-white/10 last:border-0">
                            <td className="px-4 py-4 font-medium text-slate-200 flex items-center gap-2">
                              {u.email}
                              {isMainAdmin && (
                                <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                  Administrador Principal
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-xs">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Aprovado
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetPassword(u.email)}
                                  className="h-8 px-2.5 border-white/10 hover:bg-white/10 text-slate-300 text-xs gap-1"
                                >
                                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                                  Alterar Senha
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => handleRemoveUser(u.id, u.email)}
                                  disabled={isMainAdmin}
                                  className="h-8 px-2"
                                >
                                  <Trash2 className="h-4 w-4 mr-1 text-xs" /> Revogar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
