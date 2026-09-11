"use server";

// =============================================================================
// Datos del propio usuario. Por ahora, su firma.
// =============================================================================
// La firma se guarda como data URL en una columna de `usuarios` y no en
// Storage. El generador de PDF ya consume data URLs y los formatos guardan sus
// firmas así, mientras que meterla en el bucket obligaría a firmar URLs y a que
// el generador saliera a la red para dibujar un PNG de decenas de kilobytes.
//
// Como en el resto de acciones, la escritura pasa por `createAdminClient()`
// DESPUÉS de resolver la sesión: `auth_rol()` no lee bien el JWT y la RLS
// rechazaría la escritura. Lo que hace segura esa elevación es que el id del
// usuario sale de `auth.getUser()` y NUNCA del cliente: nadie puede escribir la
// firma de otra persona porque no hay forma de nombrarla.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Resultado } from "@/lib/actions/soldadura";

const PREFIJO_PNG = "data:image/png;base64,";

/** Tope del PNG ya decodificado. Una firma recortada pesa decenas de KB. */
const MAX_BYTES = 200 * 1024;

class ErrorDeUso extends Error {}

/**
 * Id del usuario autenticado.
 *
 * Mismo trato que `exigirSuperAdmin` en `soldadura.ts`: un fallo de red al
 * validar el token no significa que la sesión no exista, así que no se responde
 * "sesión expirada" ante cualquier tropiezo. A diferencia de aquella, esta no
 * exige rol: la firma es de cualquier usuario autenticado, sobre su propia fila.
 */
async function exigirSesion(): Promise<string> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new ErrorDeUso("Su sesión expiró. Vuelva a iniciar sesión.");
    return data.user.id;
  } catch (e) {
    if (e instanceof ErrorDeUso) throw e;
    console.error("[perfil] no se pudo verificar la sesión contra Supabase:", e);
    throw new ErrorDeUso(
      "No fue posible verificar su sesión: el servidor no respondió a tiempo. Intente de nuevo.",
    );
  }
}

/** Guarda la firma del usuario de la sesión para reutilizarla en otros documentos. */
export async function guardarMiFirmaAction(dataUrl: string): Promise<Resultado<null>> {
  try {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith(PREFIJO_PNG)) {
      throw new ErrorDeUso("La firma debe ser una imagen PNG.");
    }

    const base64 = dataUrl.slice(PREFIJO_PNG.length);
    const relleno = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const bytes = Math.floor((base64.length * 3) / 4) - relleno;
    if (bytes <= 0) throw new ErrorDeUso("La firma llegó vacía.");
    if (bytes > MAX_BYTES) {
      throw new ErrorDeUso("La imagen de la firma es demasiado grande. Use un recorte de la firma, no la hoja completa.");
    }

    const usuarioId = await exigirSesion();
    const { error } = await (createAdminClient().from("usuarios") as any)
      .update({ firma_png: dataUrl })
      .eq("id", usuarioId);

    if (error) throw new ErrorDeUso(`No fue posible guardar su firma: ${error.message}`);
    return { ok: true, datos: null };
  } catch (e) {
    if (e instanceof ErrorDeUso) return { ok: false, error: e.message };
    console.error("[perfil] fallo inesperado al guardar la firma:", e);
    return { ok: false, error: "No fue posible guardar su firma. Intente de nuevo." };
  }
}
