"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RegistrarAvanceSchema = z.object({
  proyectoId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  avanceReal: z.number().min(0).max(100),
  avanceProyectado: z.number().min(0).max(100),
  notas: z.string().optional(),
});

export async function registrarAvanceAction(
  input: z.infer<typeof RegistrarAvanceSchema>,
): Promise<{ id: string }> {
  const parsed = RegistrarAvanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Datos inválidos: ${parsed.error.message}`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("registrar_avance_proyecto", {
    p_proyecto_id: parsed.data.proyectoId,
    p_fecha: parsed.data.fecha,
    p_avance_real: parsed.data.avanceReal,
    p_avance_proyectado: parsed.data.avanceProyectado,
    p_notas: parsed.data.notas ?? null,
  } as any);

  if (error) throw new Error(error.message);

  revalidatePath(`/proyectos/${parsed.data.proyectoId}`);
  return { id: data as string };
}

