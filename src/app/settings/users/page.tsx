"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/firebase";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect, useCallback } from "react";
import { Loader2, UserPlus, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface AuthorizedUser {
  id: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  invited_by: string;
  created_at: string;
}

export default function UsersManagementPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [fetching, setFetching] = useState(true);
  
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<'Admin' | 'Editor' | 'Viewer'>("Viewer");
  const [adding, setAdding] = useState(false);

  // Redireciona se não for Admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== 'Admin') {
        toast({ variant: "destructive", title: "Acesso negado", description: "Apenas administradores podem gerenciar usuários." });
        router.replace("/");
      }
    }
  }, [user, loading, router]);

  const fetchUsers = useCallback(async () => {
    if (!user || user.role !== 'Admin') return;
    
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('authorized_users')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao buscar usuários", description: err.message });
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || adding) return;
    setAdding(true);
    
    try {
      const { error } = await supabase
        .from('authorized_users')
        .insert([{
          email: newEmail,
          role: newRole,
          invited_by: user?.email,
        }]);
        
      if (error) {
        if (error.code === '23505') {
          throw new Error("Este e-mail já está autorizado.");
        }
        throw error;
      }
      
      toast({ title: "Usuário autorizado com sucesso!" });
      setNewEmail("");
      setNewRole("Viewer");
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async (id: string, email: string) => {
    if (email === user?.email) {
      toast({ variant: "destructive", title: "Ação não permitida", description: "Você não pode remover a si mesmo." });
      return;
    }
    
    if (!confirm(`Tem certeza que deseja remover o acesso de ${email}?`)) return;
    
    try {
      const { error } = await supabase
        .from('authorized_users')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast({ title: "Acesso removido com sucesso." });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const handleChangeRole = async (id: string, role: string) => {
    try {
      const { error } = await supabase
        .from('authorized_users')
        .update({ role })
        .eq('id', id);
        
      if (error) throw error;
      toast({ title: "Permissão alterada com sucesso." });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao alterar permissão", description: err.message });
    }
  };

  if (loading || (user && user.role !== 'Admin' && !fetching)) {
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Gerenciar Usuários</h1>
            <p className="text-slate-400">Controle quem tem acesso à plataforma e suas permissões.</p>
          </div>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Usuário</CardTitle>
              <CardDescription>Autorize um novo e-mail a acessar a plataforma.</CardDescription>
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
                    className="border-white/10 bg-white/5"
                  />
                </div>
                <div className="w-full sm:w-48 space-y-2">
                  <Label>Nível de Acesso</Label>
                  <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                    <SelectTrigger className="border-white/10 bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Editor">Editor</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={adding || !newEmail} className="w-full sm:w-auto">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Convidar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Usuários Autorizados</CardTitle>
            </CardHeader>
            <CardContent>
              {fetching ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center p-8 text-slate-400 flex flex-col items-center">
                  <ShieldAlert className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3">E-mail</th>
                        <th className="px-4 py-3">Permissão</th>
                        <th className="px-4 py-3">Convidado por</th>
                        <th className="px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/10 last:border-0">
                          <td className="px-4 py-4 font-medium text-slate-200">{u.email}</td>
                          <td className="px-4 py-4">
                            <Select 
                              value={u.role} 
                              onValueChange={(val) => handleChangeRole(u.id, val)}
                              disabled={u.email === user?.email}
                            >
                              <SelectTrigger className="w-32 h-8 border-white/10 bg-white/5 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Editor">Editor</SelectItem>
                                <SelectItem value="Viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-4 text-slate-400">{u.invited_by || '-'}</td>
                          <td className="px-4 py-4">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleRemoveUser(u.id, u.email)}
                              disabled={u.email === user?.email}
                              className="h-8 px-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
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
