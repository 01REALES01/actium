-- =============================================================================
-- ACTIUM | Catálogo de proveedores
-- =============================================================================
-- El cliente tiene proveedores recurrentes y no quiere reescribir nombre y
-- NIT en cada factura de Cuentas por pagar. Esta tabla es solo una libreta de
-- contactos que alimenta el formulario de "Nueva factura": `cuentas_por_pagar`
-- sigue guardando proveedor_nombre/proveedor_nit como texto libre (sin FK), a
-- propósito, para que editar o eliminar un proveedor nunca altere una factura
-- ya registrada.
-- =============================================================================

CREATE TABLE public.proveedores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  nit        TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,

  CONSTRAINT chk_proveedor_nombre_no_vacio CHECK (length(trim(nombre)) > 0)
);

-- Unicidad global e insensible a mayúsculas: evita duplicados de tipeo del
-- mismo proveedor en distintas facturas/proyectos.
CREATE UNIQUE INDEX uq_proveedores_nombre
  ON public.proveedores (lower(trim(nombre)))
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.proveedores IS
  'Libreta de proveedores (nombre + NIT) para autocompletar "Nueva factura" en Cuentas por pagar. Sin relación FK con cuentas_por_pagar a propósito: esta es solo una lista de contactos, no la fuente de verdad de cada factura.';

-- =============================================================================
-- Precarga: los proveedores ya existen implícitos en las facturas registradas.
-- Uno por nombre (insensible a mayúsculas), con el NIT de su factura más
-- reciente si hay varios distintos.
-- =============================================================================
INSERT INTO public.proveedores (nombre, nit)
SELECT DISTINCT ON (lower(trim(proveedor_nombre)))
  trim(proveedor_nombre),
  proveedor_nit
FROM public.cuentas_por_pagar
ORDER BY lower(trim(proveedor_nombre)), created_at DESC;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

-- Super_admin, financiero (operan Finanzas) y admin (lectura) — igual acceso
-- que finanzas/layout.tsx.
CREATE POLICY "proveedores_select" ON public.proveedores
  FOR SELECT USING (
    (public.auth_puede_finanzas() OR public.auth_es_admin_o_superior())
    AND deleted_at IS NULL
  );

CREATE POLICY "proveedores_insert" ON public.proveedores
  FOR INSERT WITH CHECK (public.auth_puede_finanzas());

CREATE POLICY "proveedores_update" ON public.proveedores
  FOR UPDATE USING (public.auth_puede_finanzas());

-- Sin policy de DELETE: el borrado es suave (deleted_at). RLS deniega DELETE
-- por defecto.
