import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarFinanzas } from "@/lib/auth/roles";
import { listCxC, getCxCResumen } from "@/lib/data/cxc";
import { CxCTable } from "@/components/finanzas/cxc-table";
import { formatCOP } from "@/lib/format";

export default async function CxCPage() {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect("/proyectos");
  }

  const [cuentas, resumen] = await Promise.all([listCxC(supabase), getCxCResumen(supabase)]);
  const puedeEscribir = puedeGestionarFinanzas(perfil.rol);

  const kpis = [
    { label: "Pendiente", valor: formatCOP(resumen.pendiente) },
    { label: "Vencido", valor: formatCOP(resumen.vencido), alerta: resumen.vencido > 0 },
    { label: "Cobrado este mes", valor: formatCOP(resumen.cobradoMes) },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <Link
          href="/finanzas"
          className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Finanzas
        </Link>
        <h1 className="mt-2 font-display text-3xl text-[--text-primary]">Cuentas por cobrar</h1>
        <p className="mt-2 text-sm text-[--text-secondary]">Facturas emitidas a clientes.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1">
              <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`font-display text-2xl ${kpi.alerta ? "text-danger" : "text-actium-orange"}`}>
                {kpi.valor}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CxCTable cuentas={cuentas} mostrarProyecto puedeEscribir={puedeEscribir} />
    </div>
  );
}
