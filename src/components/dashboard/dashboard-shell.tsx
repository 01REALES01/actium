"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, FolderKanban, HardHat, LogOut, Menu, WalletCards } from "lucide-react";
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
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/sst", label: "SST", icon: HardHat },
  { href: "/presupuesto", label: "Presupuesto", icon: WalletCards },
];

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string;
};

function NavigationLinks() {
  const pathname = usePathname();

  return (
    <SidebarNav>
      {navigation.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
              active && "bg-blue-500 text-white hover:bg-blue-500",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </SidebarNav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500 text-white">
        <BarChart3 className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-semibold text-white">ACTIUM</p>
        <p className="text-xs text-slate-400">Portal de clientes</p>
      </div>
    </div>
  );
}

function SidebarBody() {
  return (
    <>
      <SidebarHeader>
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <NavigationLinks />
      </SidebarContent>
      <SidebarFooter>
        <p className="text-xs leading-5 text-slate-400">Operacion, SST y presupuesto en un solo panel.</p>
      </SidebarFooter>
    </>
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <motion.div
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="fixed inset-y-0 left-0 z-30 hidden lg:block"
      >
        <Sidebar>
          <SidebarBody />
        </Sidebar>
      </motion.div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Abrir navegacion</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-slate-800 bg-sidebar p-0 text-slate-100">
                <SidebarBody />
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm text-slate-500">Portal ACTIUM</p>
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-3 px-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-slate-900 text-xs text-white">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-48 truncate text-sm md:inline">{userEmail ?? "Usuario"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
