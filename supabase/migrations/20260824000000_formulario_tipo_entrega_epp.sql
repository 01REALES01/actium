-- =============================================================================
-- ACTIUM | Cargo de Entrega de EPP
-- =============================================================================
-- Agrega el quinto tipo de formulario SST: el cargo de entrega de elementos de
-- protección personal. A diferencia de los otros cuatro tipos, este formulario
-- es individual — un registro y un PDF por trabajador, no por jornada — y por
-- eso necesita tabla hija con FK a `empleados`: es el único formato SST donde
-- se puede consultar el historial de dotación de una persona concreta.
--
-- `epp_entregas` guarda la cabecera (1:1 con `formularios`, igual que las
-- tablas `*_detalles` de los otros tipos) y `epp_entrega_items` cada elemento
-- entregado. Los datos del trabajador y del elemento se congelan en la fila:
-- si el empleado se retira o el catálogo cambia, el cargo firmado debe seguir
-- diciendo lo que decía cuando se firmó.
-- =============================================================================

ALTER TYPE formulario_tipo ADD VALUE IF NOT EXISTS 'entrega_epp';

-- El consecutivo usa el prefijo EPP-{AÑO}-{NNNN}. La comparación se hace sobre
-- TEXT y no sobre el enum: usar un valor de enum recién agregado dentro de la
-- misma transacción que lo crea es un error en PostgreSQL.
CREATE OR REPLACE FUNCTION public.generar_codigo_formulario()
RETURNS TRIGGER AS $$
DECLARE
  v_anio     SMALLINT;
  v_num      INTEGER;
  v_prefijo  TEXT;
BEGIN
  IF NEW.codigo_consecutivo IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_anio := EXTRACT(YEAR FROM NOW())::SMALLINT;

  v_prefijo := CASE NEW.tipo::TEXT
    WHEN 'ats'              THEN 'ATS'
    WHEN 'permiso_altura'   THEN 'ALT'
    WHEN 'permiso_caliente' THEN 'CAL'
    WHEN 'preoperacional'   THEN 'PRE'
    WHEN 'entrega_epp'      THEN 'EPP'
    ELSE UPPER(NEW.tipo::TEXT)
  END;

  INSERT INTO public.formulario_secuencias (empresa_id, tipo, anio, ultimo_num)
  VALUES (NEW.empresa_id, NEW.tipo, v_anio, 1)
  ON CONFLICT (empresa_id, tipo, anio)
  DO UPDATE SET ultimo_num = formulario_secuencias.ultimo_num + 1
  RETURNING ultimo_num INTO v_num;

  NEW.codigo_consecutivo := v_prefijo || '-' || v_anio::TEXT || '-' || LPAD(v_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Cabecera del cargo (1:1 con formularios, igual que ats_detalles / altura_detalles)
-- =============================================================================
CREATE TABLE public.epp_entregas (
  formulario_id     UUID PRIMARY KEY REFERENCES public.formularios(id) ON DELETE CASCADE,
  empleado_id       UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  trabajador_nombre TEXT NOT NULL,
  trabajador_cedula TEXT,
  trabajador_cargo  TEXT,
  area              TEXT,
  fecha_entrega     DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_epp_entregas_empleado ON public.epp_entregas (empleado_id);

COMMENT ON TABLE public.epp_entregas IS
  'Cabecera del cargo de entrega de EPP. 1:1 con formularios donde tipo=entrega_epp. Los datos del trabajador se congelan al firmar.';

-- =============================================================================
-- Elementos entregados en ese cargo
-- =============================================================================
CREATE TABLE public.epp_entrega_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.epp_entregas(formulario_id) ON DELETE CASCADE,
  elemento_id     TEXT NOT NULL,   -- id del catálogo (ELEMENTOS_EPP) o 'adicional' para filas libres
  elemento        TEXT NOT NULL,   -- rótulo congelado
  unidad          TEXT NOT NULL,
  cantidad        NUMERIC(6,2) NOT NULL CHECK (cantidad > 0),
  fecha_recepcion DATE NOT NULL
);

CREATE INDEX idx_epp_items_formulario ON public.epp_entrega_items (formulario_id);
CREATE INDEX idx_epp_items_elemento   ON public.epp_entrega_items (elemento_id);

COMMENT ON TABLE public.epp_entrega_items IS
  'Elementos entregados en un cargo de EPP. Permite consultar el historial de dotación de un trabajador sin abrir cada PDF.';

-- =============================================================================
-- RLS — mismo patrón que ats_detalles / altura_detalles / caliente_detalles
-- =============================================================================
ALTER TABLE public.epp_entregas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epp_entrega_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epp_entregas_select" ON public.epp_entregas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "epp_entregas_insert" ON public.epp_entregas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
    AND public.auth_rol() IN ('super_admin', 'sst')
  );

CREATE POLICY "epp_entregas_update" ON public.epp_entregas
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
    AND public.auth_rol() IN ('super_admin', 'sst')
  );

CREATE POLICY "epp_entregas_delete" ON public.epp_entregas
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
  );

CREATE POLICY "epp_items_select" ON public.epp_entrega_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id)
    )
  );

CREATE POLICY "epp_items_insert" ON public.epp_entrega_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id)
    )
    AND public.auth_rol() IN ('super_admin', 'sst')
  );

CREATE POLICY "epp_items_update" ON public.epp_entrega_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id)
    )
    AND public.auth_rol() IN ('super_admin', 'sst')
  );

CREATE POLICY "epp_items_delete" ON public.epp_entrega_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id)
    )
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
  );
