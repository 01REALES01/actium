"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";

// =============================================================================
// Parte diario SST (bitácora de operación por obra)
//
// El guardado es un check-in de personal: por cada empleado del roster se marca
// presente/ausente. La cabecera (presentes / programado / observaciones) se
// guarda en `partes_diarios_sst` (upsert por proyecto+fecha) y las inasistencias
// del día se materializan como filas de un solo día en `ausentismos` (con su
// razón), de modo que el detalle e historial ya existentes siguen siendo la
// única fuente de verdad para "quién faltó y por qué".
// =============================================================================

const AsistenciaSchema = z.object({
  empleadoId: z.string().min(1),
  presente: z.boolean(),
  tipoAusencia: z.enum(["medico", "personal", "vacaciones", "incapacidad", "otro"]).optional(),
  razon: z.string().optional().default(""),
});

const GuardarParteSchema = z.object({
  proyectoId: z.string().min(1, "Seleccione un proyecto"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  observaciones: z.string().optional().default(""),
  asistencias: z.array(AsistenciaSchema).min(1, "No hay personal asignado a la obra"),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}

export async function guardarParteDiarioAction(
  input: z.infer<typeof GuardarParteSchema>,
): Promise<{ proyectoId: string; fecha: string }> {
  const parsed = GuardarParteSchema.safeParse(input);
  if (!parsed.success) throw new Error(firstError(parsed.error));
  const data = parsed.data;

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) throw new Error("No autenticado");
  if (!puedeCrearFormularioSST(perfil.rol)) {
    throw new Error("No tiene permisos para registrar partes SST.");
  }

  // Validación de coherencia: todo ausente debe traer razón.
  const ausentes = data.asistencias.filter((a) => !a.presente);
  for (const a of ausentes) {
    if (!a.razon || a.razon.trim().length === 0) {
      throw new Error("Indique la razón de cada inasistencia.");
    }
  }

  // Tenant derivado del proyecto (empresa_id es NOT NULL).
  const { data: proyecto, error: errProy } = await supabase
    .from("proyectos")
    .select("empresa_id, subempresa_id")
    .eq("id", data.proyectoId)
    .single();

  if (errProy || !proyecto) throw new Error("Proyecto no encontrado o sin acceso.");
  const tenant = proyecto as { empresa_id: string; subempresa_id: string | null };

  const presentes = data.asistencias.filter((a) => a.presente).length;
  const programado = data.asistencias.length;

  // Las escrituras se hacen con el cliente service-role: ya validamos el rol
  // arriba (defensa en profundidad), y así el registro del parte y la sincronía
  // de inasistencias no dependen del estado de RLS en cada tabla.
  const db = createAdminClient();

  // 1. Upsert de la cabecera del parte (un parte por proyecto+fecha).
  const { error: errParte } = await (db.from("partes_diarios_sst" as any) as any).upsert(
    {
      empresa_id: tenant.empresa_id,
      subempresa_id: tenant.subempresa_id,
      proyecto_id: data.proyectoId,
      fecha: data.fecha,
      total_programado: programado,
      presentes,
      observaciones: data.observaciones || null,
      registrado_por: perfil.id,
    },
    { onConflict: "proyecto_id,fecha" },
  );

  if (errParte) {
    throw new Error("No fue posible guardar el parte diario. Verifique sus permisos.");
  }

  // 2. Sincronizar inasistencias del día. Solo gestionamos las de un día
  //    (fecha_inicio = fecha_fin = fecha) generadas por el check-in; las
  //    incapacidades de rango (varios días) no se tocan.
  const { error: errDel } = await db
    .from("ausentismos")
    .delete()
    .eq("proyecto_id", data.proyectoId)
    .eq("fecha_inicio", data.fecha)
    .eq("fecha_fin", data.fecha);

  if (errDel) {
    console.error("[parte] delete ausentismos:", errDel);
    throw new Error(`No fue posible actualizar las inasistencias: ${errDel.message}`);
  }

  if (ausentes.length > 0) {
    const rows = ausentes.map((a) => ({
      proyecto_id: data.proyectoId,
      empleado_id: a.empleadoId,
      tipo: a.tipoAusencia ?? "otro",
      fecha_inicio: data.fecha,
      fecha_fin: data.fecha,
      razon: a.razon.trim(),
      registrado_por: perfil.id,
    }));
    const { error: errIns } = await (db.from("ausentismos") as any).insert(rows);
    if (errIns) {
      console.error("[parte] insert ausentismos:", errIns);
      throw new Error(`No fue posible registrar las inasistencias: ${errIns.message}`);
    }
  }

  revalidatePath("/sst/bitacora");
  revalidatePath(`/sst/bitacora/${data.proyectoId}/${data.fecha}`);
  revalidatePath("/sst/calendario");
  return { proyectoId: data.proyectoId, fecha: data.fecha };
}
