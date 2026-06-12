"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Resumen", icon: LayoutGrid, exact: true },
  { href: "/admin/empresas", label: "Empresas", icon: Building2, exact: false },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, exact: false },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 border-b border-white/5">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              active
                ? "border-actium-orange text-actium-orange"
                : "border-transparent text-white/40 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
