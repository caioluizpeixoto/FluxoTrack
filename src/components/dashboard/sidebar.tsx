"use client";

import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  MousePointer2, 
  Settings, 
  Webhook, 
  Zap,
  Sparkles,
  LogOut,
  LogIn,
  Menu,
  ShieldCheck,
  Code2,
  Plug,
  Mail,
  Lock,
  AlertTriangle,
  Facebook
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth, useUser, useFirestore, isFirebaseConfigured } from "@/firebase";
import { 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "@/firebase/compat/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "@/firebase/compat/firestore";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import LinkNext from "next/link";
import { toast } from "@/hooks/use-toast";

const navItems = [
  { label: "Meus Dashboards", icon: LayoutDashboard, href: "/" },
  { label: "Integrações", icon: Plug, href: "/integrations" },
  { label: "Logs de Eventos", icon: MousePointer2, href: "/events" },
  { label: "Configurações", icon: Settings, href: "/settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const isConfigured = isFirebaseConfigured();

  const handleSignOut = () => {
    if (!auth) return;
    signOut(auth);
    toast({ title: "Sessão encerrada", description: "Até logo!" });
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast({ variant: "destructive", title: "Erro", description: "Firebase não configurado corretamente." });
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: "Bem-vindo!", description: "Login realizado com Google." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no login", description: "Não foi possível entrar com Google." });
    }
  };

  const NavLinks = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <LinkNext
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
            pathname === item.href || (pathname.startsWith('/dashboards/') && item.href === '/') || (pathname.startsWith('/products/') && item.href === '/')
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className={cn(
            "w-5 h-5",
            pathname === item.href || (pathname.startsWith('/dashboards/') && item.href === '/') || (pathname.startsWith('/products/') && item.href === '/') ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )} />
          {item.label}
        </LinkNext>
      ))}
    </nav>
  );

  return (
    <>
      <div className="fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-[#14151a] border-white/10 shadow-xl hover:bg-[#1a1c23] hover:text-white transition-all text-slate-300">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-[#0f1115] border-r border-white/5 shadow-2xl">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <SheetDescription className="sr-only">Acesse as ferramentas do AdPulse.</SheetDescription>
            <div className="flex h-full flex-col">
              <div className="p-6 border-b border-white/5">
                <LinkNext href="/" className="flex items-center gap-2 text-primary w-fit" onClick={() => setOpen(false)}>
                  <Zap className="w-8 h-8 fill-current glow-primary" />
                  <span className="text-xl font-bold font-headline tracking-tighter">AdPulse</span>
                </LinkNext>
              </div>
              <div className="flex-1 px-4 py-6 overflow-y-auto">
                {!isConfigured && (
                  <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-yellow-500">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Firebase Offline</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Vá em Configurações para conectar seu banco de dados.
                    </p>
                  </div>
                )}
                <NavLinks />
              </div>
              <div className="p-4 mt-auto border-t border-white/5 bg-[#14151a]">
                 <AuthSection user={user} handleGoogleSignIn={handleGoogleSignIn} handleSignOut={handleSignOut} isConfigured={isConfigured} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function AuthSection({ user, handleGoogleSignIn, handleSignOut, isConfigured }: any) {
  const auth = useAuth();
  const db = useFirestore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const initializeUserProfile = async (uid: string, userEmail: string, name: string) => {
    if (!db) return;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, { uid, email: userEmail, displayName: name, plan: "free", metaConnected: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured || !auth) return;
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await initializeUserProfile(result.user.uid, email, email.split('@')[0]);
        toast({ title: "Conta criada!" });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Bem-vindo de volta!" });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error?.message || "Ocorreu um erro." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
        <ShieldCheck className={cn("w-5 h-5", isConfigured ? "text-primary" : "text-muted-foreground")} />
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-bold text-slate-200 font-headline uppercase truncate">
            {user ? (user.displayName || user.email?.split('@')[0] || "Usuário") : "Visitante"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {user ? "Plano Ativo" : isConfigured ? "Acesso Limitado" : "Offline"}
          </span>
        </div>
      </div>
      
      {user ? (
        <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 px-3">
          <LogOut className="w-5 h-5" /> Sair
        </Button>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" disabled={!isConfigured} className="w-full justify-start gap-3 text-primary hover:bg-primary/10 h-10 px-3">
              <LogIn className="w-5 h-5" /> Entrar ou Cadastrar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">{isSignUp ? "Criar Conta" : "Entrar no AdPulse"}</DialogTitle>
              <DialogDescription>{isSignUp ? "Crie sua conta para salvar suas atribuições e pixels." : "Acesse sua conta para gerenciar seu dashboard."}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEmailAuth} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full glow-primary font-bold" disabled={loading}>
                {loading ? "Processando..." : (isSignUp ? "Cadastrar Agora" : "Entrar")}
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#121212] px-4 text-muted-foreground">Ou continue com</span></div>
            </div>

            <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 gap-2" onClick={handleGoogleSignIn} disabled={loading}>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
            <div className="text-center mt-4">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-primary hover:underline transition-all">
                {isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se agora"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
