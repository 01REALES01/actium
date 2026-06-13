-- =============================================================================
-- ACTIUM | 0013 — SST: Parte diario / Bitácora de operación
-- =============================================================================
-- Un "parte diario" es el registro SST de UNA obra en UN día. Captura el
-- cabezal del check-in de personal: cuántos estaban programados y cuántos
-- efectivamente se presentaron a operación. El detalle (quién faltó y por qué,
-- qué incidentes/accidentes ocurrieron) ya vive en `ausentismos` e `incidentes`
-- ligados por (proyecto_id, fecha): este parte es la cabecera que da existencia
-- al día en la bitácora y permite reconstruir el histórico de asistencia, que
-- antes no se almacenaba.
--
-- Clave única (proyecto_id, fecha): un solo parte por obra y día (upsert).
-- =============================================================================

CREATE TABLE public.partes_diarios_sst (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  subempresa_id     UUID REFERENCES public.subempresas(id) ON DELETE RESTRICT,
  proyecto_id       UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  fecha             DATE NOT NULL,
  total_programado  INTEGER NOT NULL DEFAULT 0,   -- personal asignado a la obra ese día
  presentes         INTEGER NOT NULL DEFAULT 0,   -- cuántos vinieron a operación
  observaciones     TEXT,
  registrado_por    UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_partes_conteos CHECK (presentes >= 0 AND total_programado >= 0),
  CONSTRAINT uq_parte_proyecto_fecha UNIQUE (proyecto_id, fecha)
);

CREATE INDEX idx_partes_proyecto_fecha ON public.partes_diarios_sst (proyecto_id, fecha DESC);
CREATE INDEX idx_partes_empresa_fecha  ON public.partes_diarios_sst (empresa_id, fecha DESC);

CREATE TRIGGER trg_partes_diarios_updated_at
  BEFORE UPDATE ON public.partes_diarios_sst
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.partes_diarios_sst IS
  'Cabecera del parte diario SST por obra. Conteo de asistencia (programado/presentes). El detalle de inasistencias e incidentes se cruza por (proyecto_id, fecha).';

-- =============================================================================
-- RLS — mismo modelo que ausentismos/incidentes
-- =============================================================================
ALTER TABLE public.partes_diarios_sst ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partes_select" ON public.partes_diarios_sst
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "partes_insert" ON public.partes_diarios_sst
  FOR INSERT WITH CHECK (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
  );

CREATE POLICY "partes_update" ON public.partes_diarios_sst
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
  );

CREATE POLICY "partes_delete" ON public.partes_diarios_sst
  FOR DELETE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
  );
