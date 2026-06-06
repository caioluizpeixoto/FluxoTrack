
"use client";

import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  MousePointer2, 
  Target, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  Webhook, 
  Zap,
  Sparkles,
  LogOut,
  LogIn,
  Menu,
  X
} from "lucide-react";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@/firebase";
import { signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import LinkNext from "next/link";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Logs de Eventos", icon: MousePointer2, href: "/events" },
  { label: "Meta Ads Sync", icon: Target, href: "/meta-ads" },
  { label: "IA Path Mapping", icon: Sparkles, href: "/ai-insights" },
  { label: "Funis", icon: BarChart3, href: "/funnels" },
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
  };

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
      {/* Mobile Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/50 backdrop-blur-md border-white/10">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-background border-r border-border/50">
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
                 <AuthSection user={user} handleSignIn={handleSignIn} handleSignOut={handleSignOut} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
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
          <AuthSection user={user} handleSignIn={handleSignIn} handleSignOut={handleSignOut} />
        </div>
      </aside>
    </>
  );
}

function AuthSection({ user, handleSignIn, handleSignOut }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
        <ShieldCheck className="w-5 h-5 text-accent" />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-accent font-headline uppercase">
            {user ? "Plano Pro" : "Modo Teste"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {user ? "Ativo" : "Login opcional"}
          </span>
        </div>
      </div>
      
      {user ? (
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </Button>
      ) : (
        <Button 
          variant="ghost" 
          onClick={handleSignIn}
          className="w-full justify-start gap-3 text-primary hover:bg-primary/10"
        >
          <LogIn className="w-5 h-5" />
          Fazer Login
        </Button>
      )}
    </div>
  );
}
