import type { UserRole, Tables, TypedSupabaseClient } from "@/types/database.types";

export type PerfilUsuario = Pick<
  Tables<"usuarios">,
  "id" | "nombre" | "cargo" | "rol" | "email" | "empresa_id" | "subempresa_id" | "avatar_path"
>;

// ─── Etiquetas legibles por rol ───────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  cliente_principal: "Cliente Principal",
  subcliente: "Subcliente",
  sst: "Coordinador SST",
  operativo: "Operativo",
  financiero: "Financiero",
};

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = (
  Object.keys(ROLE_LABELS) as UserRole[]
).map((value) => ({ value, label: ROLE_LABELS[value] }));

// ─── Capacidades por rol (verdad única para mostrar/ocultar acciones) ─────────

export function esSuperAdmin(rol: UserRole | null | undefined): boolean {
  return rol === "super_admin";
}

export function esAdminOSuperior(rol: UserRole | null | undefined): boolean {
  return rol === "super_admin" || rol === "admin";
}

/**
 * Por pedido del cliente, el único rol que puede INGRESAR información (cualquier
 * cosa que no sea mera visualización) es `super_admin`. La única excepción son
 * los permisos SST (ATS/altura/caliente), que también puede diligenciar el rol
 * `sst` (ver `puedeCrearFormularioSST`). Estos helpers gobiernan tanto los
 * guards de página/acción como la visibilidad de los CTAs de escritura.
 */

/** Puede crear y editar proyectos. */
export function puedeGestionarProyectos(rol: UserRole | null | undefined): boolean {
  return esSuperAdmin(rol);
}

/**
 * Puede operar la ESTRUCTURA de presupuesto: crear/editar rubros, ajustar
 * techos, transferir y fijar presupuesto. Solo `super_admin`.
 */
export function puedeGestionarPresupuesto(rol: UserRole | null | undefined): boolean {
  return esSuperAdmin(rol);
}

/**
 * Puede operar TRANSACCIONES financieras: CxC, CxP, cobros, pagos, cuotas,
 * comprobantes y autorización de extra presupuesto (sobregiro). Lo cumplen
 * `super_admin` y `financiero`. No incluye techos/transferencias/fijar.
 */
export function puedeGestionarFinanzas(rol: UserRole | null | undefined): boolean {
  return rol === "super_admin" || rol === "financiero";
}

/** Puede registrar y firmar formularios SST. */
export function puedeGestionarSST(rol: UserRole | null | undefined): boolean {
  return esSuperAdmin(rol);
}

/**
 * Puede crear/editar y cerrar permisos SST en campo (ATS, permiso de altura,
 * permiso de caliente). Única excepción al bloqueo super_admin: el rol `sst`
 * también puede diligenciarlos (acotado por RLS a su empresa/proyecto).
 */
export function puedeCrearFormularioSST(rol: UserRole | null | undefined): boolean {
  return rol === "super_admin" || rol === "sst";
}

/**
 * Puede editar los Partes Diarios (Bitácora).
 * Por petición, solo el super_admin puede editarlos.
 */
export function puedeEditarParteDiario(rol: UserRole | null | undefined): boolean {
  return esSuperAdmin(rol);
}

/**
 * Puede ver el módulo Personal (registro de empleados y sus documentos).
 * Determina, entre otras cosas, si en el calendario general se muestran los
 * vencimientos de documentos de personal. Los roles cliente quedan excluidos.
 */
export function puedeVerPersonal(rol: UserRole | null | undefined): boolean {
  return (
    rol === "super_admin" ||
    rol === "admin" ||
    rol === "sst" ||
    rol === "operativo" ||
    rol === "cliente_principal" ||
    rol === "subcliente"
  );
}

// ─── Navegación reactiva al rol ───────────────────────────────────────────────

export type NavKey =
  | "dashboard"
  | "personal"
  | "sst"
  | "finanzas"
  | "admin";

export type NavItemDef = {
  key: NavKey;
  label: string;
  href: string;
  icon: string; // nombre de icono lucide (resuelto en el cliente)
};

const ALL_NAV: NavItemDef[] = [
  { key: "dashboard", label: "Proyectos", href: "/proyectos", icon: "FolderKanban" },
  { key: "personal", label: "Personal", href: "/field-workers", icon: "HardHat" },
  { key: "sst", label: "Permisos", href: "/sst", icon: "ShieldAlert" },
  { key: "finanzas", label: "Finanzas", href: "/finanzas", icon: "Wallet" },
  { key: "admin", label: "Administración", href: "/admin", icon: "ShieldCheck" },
];

// Qué claves de navegación ve cada rol. Finanzas es visible en modo lectura
// para admin/financiero (ven cifras, no CTAs de escritura — ver
// puedeGestionarPresupuesto); solo super_admin puede escribir.
const NAV_BY_ROLE: Record<UserRole, NavKey[]> = {
  super_admin: ["dashboard", "personal", "sst", "finanzas", "admin"],
  admin: ["dashboard", "personal", "sst", "finanzas"],
  // El rol financiero solo opera Finanzas — no accede a ninguna otra sección.
  financiero: ["finanzas"],
  sst: ["dashboard", "personal", "sst"],
  operativo: ["dashboard", "personal"],
  cliente_principal: ["dashboard", "personal"],
  subcliente: ["dashboard", "personal"],
};

export function getNavItems(rol: UserRole | null | undefined): NavItemDef[] {
  const keys = rol ? NAV_BY_ROLE[rol] : ["dashboard"];
  return ALL_NAV.filter((item) => keys.includes(item.key));
}

// ─── Lectura del perfil del usuario autenticado ──────────────────────────────

export async function getPerfilActual(
  supabase: TypedSupabaseClient,
): Promise<PerfilUsuario | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, cargo, rol, email, empresa_id, subempresa_id, avatar_path")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    // El usuario existe en auth pero no en la tabla usuarios (perfil incompleto).
    return null;
  }

  return data as PerfilUsuario;
}
