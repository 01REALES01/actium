"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutGrid, 
  FolderKanban, 
  Users, 
  Package, 
  BarChart3, 
  Settings, 
  HelpCircle,
  LogOut,
  Menu,
  Wrench,
  Search,
  Bell,
  MessageSquare
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarNav } from "@/components/ui/sidebar";

const navigation = [
  { href: "/dashboard", label: "Panel", icon: LayoutGrid },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/field-workers", label: "Personal de Campo", icon: Users },
  { href: "/inventory", label: "Inventario", icon: Package },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
];

const secondaryNavigation = [
  { href: "/settings", label: "Configuración", icon: Settings },
  { href: "/support", label: "Soporte", icon: HelpCircle },
];


type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string;
};

function NavigationLinks() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-8">
      <SidebarNav className="gap-2">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-12 items-center gap-4 rounded-xl px-4 text-sm font-medium transition-all duration-200",
                active 
                  ? "bg-white/10 text-white shadow-lg" 
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-orange-500" : "")} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </SidebarNav>

      <div className="mt-auto pt-8 border-t border-white/5">
        <SidebarNav className="gap-2">
          {secondaryNavigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-12 items-center gap-4 rounded-xl px-4 text-sm font-medium transition-all duration-200",
                  active 
                    ? "bg-white/10 text-white shadow-lg" 
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-orange-500" : "")} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </SidebarNav>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 shadow-lg shadow-orange-500/20">
        <Wrench className="h-6 w-6 text-orange-500" strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-white">ACTIUM</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Infraestructura Metálica</p>
      </div>
    </div>
  );
}

function SidebarBody() {
  return (
    <div className="flex h-full flex-col p-6">
      <SidebarHeader className="mb-10 p-0">
        <Brand />
      </SidebarHeader>
      <SidebarContent className="p-0">
        <NavigationLinks />
      </SidebarContent>
      <SidebarFooter className="mt-auto p-0 pt-8 border-t border-white/5">
        <p className="text-xs font-medium leading-relaxed text-white/20">
          Operación, SST y presupuesto en un solo panel.
        </p>
      </SidebarFooter>
    </div>
  );
}

export function DashboardShell({ children, userEmail }: DashboardShellProps) {
  const router = useRouter();
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? "AC";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Premium Sidebar */}
      <motion.div
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block border-r border-white/5 bg-[#1A1A1A]"
      >
        <SidebarBody />
      </motion.div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/5 bg-[#121212]/80 px-8 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <input 
                type="text" 
                placeholder="Buscar en Actium..."
                className="w-full h-11 rounded-xl bg-white/5 border border-white/5 pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
                <Bell className="h-5 w-5" />
              </button>
              <button className="p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
                <MessageSquare className="h-5 w-5" />
              </button>
              <button className="p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="h-8 w-px bg-white/5" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-4 p-1.5 rounded-xl hover:bg-white/5 transition-all group">
                  <div className="flex flex-col items-end mr-1">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Ing. Ricardo S.</span>
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Director de Obra</span>
                  </div>
                  <Avatar className="h-10 w-10 border-2 border-white/10 group-hover:border-orange-500/50 transition-all">
                    <AvatarFallback className="bg-orange-500/10 text-xs font-bold text-orange-500">
                      RS
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1A1A1A] border-white/10 text-white">
                <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-white/5 focus:bg-white/5">
                  <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-8 py-10">{children}</main>
      </div>
    </div>
  );
}

