
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
  UserPlus
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@/firebase";
import { 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import LinkNext from "next/link";
import { toast } from "@/hooks/use-toast";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Integrações", icon: Plug, href: "/integrations" },
  { label: "Pixel AdPulse", icon: Code2, href: "/pixel" },
  { label: "Logs de Eventos", icon: MousePointer2, href: "/events" },
  { label: "IA Path Mapping", icon: Sparkles, href: "/ai-insights" },
  { label: "Webhooks", icon: Webhook, href: "/webhooks" },
  { label: "Configurações", icon: Settings, href: "/settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  const handleSignOut = () => {
    signOut(auth);
    toast({ title: "Sessão encerrada", description: "Até logo!" });
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: "Bem-vindo!", description: "Login realizado com Google." });
    } catch (error: any) {
      console.error(error);
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
            pathname === item.href 
              ? "bg-primary/10 text-primary" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className={cn(
            "w-5 h-5",
            pathname === item.href ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )} />
          {item.label}
        </LinkNext>
      ))}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/50 backdrop-blur-md border-white/10">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-background border-r border-border/50">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <SheetDescription className="sr-only">Acesse as ferramentas do AdPulse.</SheetDescription>
            <div className="flex h-full flex-col">
              <div className="p-6">
                <LinkNext href="/" className="flex items-center gap-2 text-primary">
                  <Zap className="w-8 h-8 fill-current glow-primary" />
                  <span className="text-xl font-bold font-headline tracking-tighter">AdPulse</span>
                </LinkNext>
              </div>
              <div className="flex-1 px-4">
                <NavLinks />
              </div>
              <div className="p-4 mt-auto">
                 <AuthSection user={user} handleGoogleSignIn={handleGoogleSignIn} handleSignOut={handleSignOut} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden lg:flex h-full flex-col bg-background border-r border-border/50 w-64 fixed left-0 top-0 z-30">
        <div className="p-6">
          <LinkNext href="/" className="flex items-center gap-2 text-primary">
            <Zap className="w-8 h-8 fill-current glow-primary" />
            <span className="text-xl font-bold font-headline tracking-tighter">AdPulse</span>
          </LinkNext>
        </div>

        <div className="flex-1 px-4">
          <NavLinks />
        </div>

        <div className="p-4 mt-auto">
          <AuthSection user={user} handleGoogleSignIn={handleGoogleSignIn} handleSignOut={handleSignOut} />
        </div>
      </aside>
    </>
  );
}

function AuthSection({ user, handleGoogleSignIn, handleSignOut }: any) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "Conta criada!", description: "Seu cadastro foi realizado com sucesso." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Bem-vindo de volta!", description: "Login realizado com sucesso." });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      let message = "Ocorreu um erro na autenticação.";
      if (error.code === 'auth/email-already-in-use') message = "Este e-mail já está em uso.";
      if (error.code === 'auth/wrong-password') message = "Senha incorreta.";
      if (error.code === 'auth/user-not-found') message = "Usuário não encontrado.";
      toast({ variant: "destructive", title: "Erro", description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
        <ShieldCheck className="w-5 h-5 text-accent" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-bold text-accent font-headline uppercase truncate">
            {user ? (user.displayName || user.email?.split('@')[0] || "Usuário") : "Modo Teste"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {user ? "Plano Pro Ativo" : "Acesso Limitado"}
          </span>
        </div>
      </div>
      
      {user ? (
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 px-3"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-primary hover:bg-primary/10 h-10 px-3"
            >
              <LogIn className="w-5 h-5" />
              Entrar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">
                {isSignUp ? "Criar Conta" : "Entrar no AdPulse"}
              </DialogTitle>
              <DialogDescription>
                {isSignUp 
                  ? "Cadastre seu e-mail para salvar suas configurações." 
                  : "Acesse sua conta para gerenciar suas atribuições."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEmailAuth} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full glow-primary font-bold" disabled={loading}>
                {loading ? "Processando..." : (isSignUp ? "Cadastrar" : "Entrar")}
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#121212] px-4 text-muted-foreground">Ou continue com</span></div>
            </div>

            <Button 
              variant="outline" 
              className="w-full border-white/10 hover:bg-white/5 gap-2"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>

            <div className="text-center mt-4">
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-primary hover:underline transition-all"
              >
                {isSignUp ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se agora"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
