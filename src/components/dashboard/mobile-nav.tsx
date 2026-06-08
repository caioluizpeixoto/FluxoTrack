"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, Plug, MousePointer2, Settings, LogIn, LogOut, User, Menu, Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth, useUser, useFirestore, isFirebaseConfigured } from "@/firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "@/firebase/compat/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "@/firebase/compat/firestore";
import { useState } from "react";
import LinkNext from "next/link";
import { toast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const navItems = [
  { label: "Dashboards", icon: LayoutDashboard, href: "/" },
  { label: "Integrações", icon: Plug, href: "/integrations" },
  { label: "Eventos", icon: MousePointer2, href: "/events" },
  { label: "Config", icon: Settings, href: "/settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const isConfigured = isFirebaseConfigured();
  const [profileOpen, setProfileOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
    if (!auth) return;
    signOut(auth);
    toast({ title: "Sessão encerrada", description: "Até logo!" });
    setProfileOpen(false);
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: "Bem-vindo!" });
      setProfileOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Erro no login" });
    }
  };

  const initializeUserProfile = async (uid: string, userEmail: string, name: string) => {
    if (!db) return;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        email: userEmail,
        displayName: name,
        plan: "free",
        metaConnected: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured || !auth) return;
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await initializeUserProfile(result.user.uid, email, email.split("@")[0]);
        toast({ title: "Conta criada!" });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Bem-vindo de volta!" });
      }
      setIsDialogOpen(false);
      setProfileOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar — mobile only */}
      <nav className="mobile-bottom-nav md:hidden">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname.startsWith("/dashboards/") && item.href === "/") ||
            (pathname.startsWith("/products/") && item.href === "/");
          return (
            <LinkNext
              key={item.href}
              href={item.href}
              className={cn("mobile-nav-item", isActive && "mobile-nav-item--active")}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </LinkNext>
          );
        })}

        {/* Profile / Auth tab */}
        <button
          className={cn("mobile-nav-item", profileOpen && "mobile-nav-item--active")}
          onClick={() => setProfileOpen(true)}
        >
          <User className="w-5 h-5" />
          <span>{user ? "Perfil" : "Login"}</span>
        </button>
      </nav>

      {/* Profile Sheet */}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent
          side="bottom"
          className="md:hidden rounded-t-3xl bg-[#0f1115] border-t border-white/10 pb-safe"
        >
          <SheetTitle className="sr-only">Perfil</SheetTitle>
          <SheetDescription className="sr-only">Gerenciar conta</SheetDescription>

          <div className="space-y-4 py-2">
            {/* Logo */}
            <div className="flex items-center gap-2 text-primary mb-4">
              <Zap className="w-6 h-6 fill-current" />
              <span className="text-lg font-bold font-headline tracking-tighter">AdPulse</span>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                {user ? (user.displayName?.[0] || user.email?.[0] || "U").toUpperCase() : "?"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-slate-200 truncate">
                  {user ? user.displayName || user.email?.split("@")[0] || "Usuário" : "Visitante"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user ? "Plano Ativo" : isConfigured ? "Acesso Limitado" : "Offline"}
                </span>
              </div>
            </div>

            {user ? (
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-12 rounded-xl"
              >
                <LogOut className="w-5 h-5" /> Sair da Conta
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 gap-3"
                  disabled={!isConfigured}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Entrar com Google
                </Button>

                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold gap-2"
                  disabled={!isConfigured}
                >
                  <LogIn className="w-5 h-5" />
                  Entrar com E-mail
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Email Auth Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#121212] border-white/10 text-white mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">
              {isSignUp ? "Criar Conta" : "Entrar no AdPulse"}
            </DialogTitle>
            <DialogDescription>
              {isSignUp ? "Crie sua conta para salvar suas atribuições." : "Acesse sua conta."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEmailAuth} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mobile-email">E-mail</Label>
              <Input
                id="mobile-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-password">Senha</Label>
              <Input
                id="mobile-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 h-12 rounded-xl"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={loading}>
              {loading ? "Processando..." : isSignUp ? "Cadastrar" : "Entrar"}
            </Button>
          </form>
          <div className="text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-primary hover:underline"
            >
              {isSignUp ? "Já tem conta? Entre aqui" : "Não tem conta? Cadastre-se"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
