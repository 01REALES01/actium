"use client";
import * as React from "react";


import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Bell,
  MessageSquare,
  FolderKanban,
  HardHat,
  ShieldAlert,
  ShieldCheck,
  Calculator,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarContent, SidebarFooter, SidebarHeader, SidebarNav } from "@/components/ui/sidebar";
import { SidebarCalendar } from "@/components/dashboard/sidebar-calendar";

import { ROLE_LABELS, type NavItemDef } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database.types";

// Resuelve el nombre de icono (string desde el servidor) al componente lucide.
const ICON_MAP: Record<string, LucideIcon> = {
  FolderKanban,
  HardHat,
  ShieldAlert,
  Calculator,
  ShieldCheck,
};

const secondaryNavigation = [
  { href: "/settings", label: "Configuración", icon: Settings },
  { href: "/support", label: "Soporte", icon: HelpCircle },
];

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string;
  nombre: string;
  rol: UserRole | null;
  cargo: string | null;
  navItems: NavItemDef[];
};

function NavigationLinks({
  navItems,
  onNavigate,
  rol,
  isCollapsed,
}: {
  navItems: NavItemDef[];
  onNavigate?: () => void;
  rol?: UserRole | null;
  isCollapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <SidebarNav className="gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICON_MAP[item.icon] ?? FolderKanban;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-12 items-center rounded-xl font-medium transition-all duration-200",
                isCollapsed ? "justify-center w-12 mx-auto px-0" : "gap-4 px-4 text-sm",
                active
                  ? "bg-white/10 text-white shadow-lg"
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active ? "text-orange-500" : "")} strokeWidth={2} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </SidebarNav>

      {!isCollapsed && <SidebarCalendar />}

      {rol === "super_admin" && (
      <div className="pt-6 border-t border-white/5">
        <SidebarNav className="gap-2">
          {secondaryNavigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-12 items-center rounded-xl font-medium transition-all duration-200",
                  isCollapsed ? "justify-center w-12 mx-auto px-0" : "gap-4 px-4 text-sm",
                  active
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-orange-500" : "")} strokeWidth={2} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </SidebarNav>
      </div>
      )}
    </div>
  );
}

function Brand({ isCollapsed }: { isCollapsed?: boolean }) {
  return (
    <div className={cn("flex items-center py-4", isCollapsed ? "justify-center" : "justify-start")}>
      {isCollapsed ? (
        <Image
          src="/logo-actium-mark-orange.png"
          alt="Actium"
          width={35}
          height={40}
          priority
          className="object-contain transition-all duration-300 h-10 w-auto"
        />
      ) : (
        <Image
          src="/logo-actium-07-orange-white.png"
          alt="Actium"
          width={157}
          height={40}
          priority
          className="object-contain h-10 w-auto transition-all duration-300"
        />
      )}
    </div>
  );
}

function SidebarBody({
  navItems,
  onNavigate,
  rol,
  isCollapsed,
  onToggleCollapse,
}: {
  navItems: NavItemDef[];
  onNavigate?: () => void;
  rol?: UserRole | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-6 relative">
      <SidebarHeader className="mb-10 p-0 relative">
        <Brand isCollapsed={isCollapsed} />
      </SidebarHeader>
      
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A1A] border border-white/10 text-white hover:bg-white/10 transition-all z-50 hidden lg:flex shadow-md"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}

      <SidebarContent className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-0 pr-1">
        <NavigationLinks navItems={navItems} onNavigate={onNavigate} rol={rol} isCollapsed={isCollapsed} />
      </SidebarContent>
      <SidebarFooter className="mt-auto p-0 pt-8 border-t border-white/5 overflow-hidden whitespace-nowrap text-ellipsis">
        {!isCollapsed && (
          <p className="text-xs font-medium leading-relaxed text-white/20">
            Operación, SST y presupuesto en un solo panel.
          </p>
        )}
      </SidebarFooter>
    </div>
  );
}

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

export function DashboardShell({ children, userEmail, nombre, rol, cargo, navItems }: DashboardShellProps) {
  const router = useRouter();
  const initials = getInitials(nombre);
  const rolLabel = rol ? ROLE_LABELS[rol] : "Sin rol";
  const cargoLabel = cargo ?? rolLabel;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const [open, setOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-r border-white/5 bg-[#1A1A1A] p-0 text-white">
          <SidebarBody navItems={navItems} onNavigate={() => setOpen(false)} rol={rol} isCollapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? 96 : 288 }}
        className="fixed inset-y-0 left-0 z-30 hidden lg:block border-r border-white/5 bg-[#1A1A1A] overflow-visible"
      >
        <SidebarBody navItems={navItems} rol={rol} isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      </motion.div>

      <div className={cn("transition-all duration-300", isCollapsed ? "lg:pl-24" : "lg:pl-72")}>
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/5 bg-[#121212]/80 px-4 md:px-8 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-4 md:gap-8">
            {/* Mobile Menu Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/40 hover:text-white"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <div className="relative flex-1 max-w-md hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <input
                type="text"
                placeholder="Buscar en Actium..."
                className="w-full h-11 rounded-xl bg-white/5 border border-white/5 pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-1 md:gap-2">
              <button className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
                <Bell className="h-5 w-5" />
              </button>
              <button className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all hidden sm:block">
                <MessageSquare className="h-5 w-5" />
              </button>
              <button className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all hidden sm:block">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="h-8 w-px bg-white/5" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 md:gap-4 p-1.5 rounded-xl hover:bg-white/5 transition-all group">
                  <div className="flex flex-col items-end mr-1 hidden sm:flex">
                    <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
                      {nombre}
                    </span>
                    <span className="text-[8px] md:text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      {cargoLabel}
                    </span>
                  </div>
                  <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-white/10 group-hover:border-orange-500/50 transition-all">
                    <AvatarFallback className="bg-orange-500/10 text-[10px] md:text-xs font-bold text-orange-500">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1A1A1A] border-white/10 text-white">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{nombre}</span>
                    <span className="text-[10px] font-normal text-white/40">{userEmail}</span>
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-orange-500">
                      {rolLabel}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={handleLogout} className="hover:bg-white/5 focus:bg-white/5">
                  <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 md:px-8 py-6 md:py-10">{children}</main>
      </div>
    </div>
  );
}
