"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FolderKanban, HardHat, LogOut, Menu, WalletCards, Wrench } from "lucide-react";
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
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]",
              active &&
                "border-l-2 border-actium-orange bg-actium-orange/10 font-medium text-actium-orange hover:bg-actium-orange/10 hover:text-actium-orange",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
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
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-actium-orange shadow-actium">
        <Wrench className="h-5 w-5 text-white" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-display text-lg tracking-widest text-[--text-primary]">ACTIUM</p>
        <p className="text-xs text-[--text-muted]">Portal de clientes</p>
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
        <p className="text-xs leading-5 text-[--text-muted]">
          Operación, SST y presupuesto en un solo panel.
        </p>
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
    <div className="min-h-screen bg-[--bg-primary] text-[--text-primary]">
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

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[--border-subtle] bg-[--bg-primary]/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                  <span className="sr-only">Abrir navegación</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 border-r border-[--border-subtle] bg-[--bg-secondary] p-0 text-[--text-primary]"
              >
                <SidebarBody />
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-xs uppercase tracking-wider text-[--text-muted]">Portal ACTIUM</p>
              <h1 className="font-display text-xl text-[--text-primary]">Dashboard</h1>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-3 px-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-actium-orange/20 text-xs font-semibold text-actium-orange">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-48 truncate text-sm text-[--text-secondary] md:inline">
                  {userEmail ?? "Usuario"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
