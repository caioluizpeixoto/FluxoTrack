"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, Plug, MousePointer2, Settings, LogIn, LogOut, User, Zap } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import {
  signOut,
} from "@/firebase/compat/auth";
import { getAuth } from "@/firebase/compat/auth";
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

const navItems = [
  { label: "Dashboards", icon: LayoutDashboard, href: "/" },
  { label: "Integrações", icon: Plug, href: "/integrations" },
  { label: "Eventos", icon: MousePointer2, href: "/events" },
  { label: "Config", icon: Settings, href: "/settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
    toast({ title: "Sessão encerrada", description: "Até logo!" });
    setProfileOpen(false);
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
          onClick={() => user ? setProfileOpen(true) : router.push("/login")}
        >
          <User className="w-5 h-5" />
          <span>{user ? "Perfil" : "Login"}</span>
        </button>
      </nav>

      {/* Profile Sheet — only shown when logged in */}
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
                  {user ? user.email : "Não autenticado"}
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
              <Button
                onClick={() => { setProfileOpen(false); router.push("/login"); }}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold gap-2"
              >
                <LogIn className="w-5 h-5" />
                Fazer Login
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
