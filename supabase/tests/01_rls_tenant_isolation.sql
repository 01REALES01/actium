-- =============================================================================
-- ACTIUM | Test 01 — Aislamiento Multi-Tenant RLS
-- =============================================================================
-- Verifica que las policies de 0009 + el JWT hook (0010) producen el
-- aislamiento esperado entre roles y subempresas.
--
-- Pre-requisito: el seed de supabase/seed.sql debe estar cargado.
--
-- Cómo correrlo:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/01_rls_tenant_isolation.sql
--
-- En cloud: usar la connection string de Settings → Database → Direct connection.
-- En local: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f ...
--
-- El script falla con RAISE EXCEPTION si algún assert no coincide. Si termina
-- imprimiendo "OK — todos los asserts pasaron" todo está bien.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- =============================================================================
-- Helper de assertion (visible solo en esta transacción)
-- =============================================================================
CREATE OR REPLACE FUNCTION pg_temp.assert_count(
  label    TEXT,
  query    TEXT,
  expected BIGINT
) RETURNS VOID AS $$
DECLARE
  actual BIGINT;
BEGIN
  EXECUTE 'SELECT COUNT(*) FROM (' || query || ') sub' INTO actual;
  IF actual <> expected THEN
    RAISE EXCEPTION 'ASSERT FAIL [%]: esperaba %, obtuvo % (query: %)',
      label, expected, actual, query;
  END IF;
  RAISE NOTICE 'OK [%] = %', label, actual;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.set_jwt(
  p_uid           TEXT,
  p_empresa_id    TEXT,
  p_subempresa_id TEXT,
  p_rol           TEXT
) RETURNS VOID AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',           p_uid,
      'role',          'authenticated',
      'empresa_id',    p_empresa_id,
      'subempresa_id', p_subempresa_id,
      'rol',           p_rol
    )::text,
    true
  );
END;
$$ LANGUAGE plpgsql;

-- Las policies son SECURITY INVOKER y dependen del rol de Postgres.
SET LOCAL ROLE authenticated;

-- =============================================================================
-- 1. SUPER_ADMIN — ve todo
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000001', NULL, NULL, 'super_admin'
);

SELECT pg_temp.assert_count('super_admin: proyectos',     'SELECT 1 FROM public.proyectos',          2);
SELECT pg_temp.assert_count('super_admin: rubros',        'SELECT 1 FROM public.rubros',             5);
SELECT pg_temp.assert_count('super_admin: movimientos',   'SELECT 1 FROM public.movimientos',        3);
SELECT pg_temp.assert_count('super_admin: incidentes',    'SELECT 1 FROM public.incidentes',         1);
SELECT pg_temp.assert_count('super_admin: formularios',   'SELECT 1 FROM public.formularios',        1);
SELECT pg_temp.assert_count('super_admin: avances',       'SELECT 1 FROM public.proyecto_avances',   5);
SELECT pg_temp.assert_count('super_admin: empleados',     'SELECT 1 FROM public.empleados',          3);
SELECT pg_temp.assert_count('super_admin: subempresas',   'SELECT 1 FROM public.subempresas',        2);

-- =============================================================================
-- 2. ADMIN ARGOS — ve toda la empresa Argos
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000002',
  'ee000000-0000-0000-0000-000000000001',
  NULL,
  'admin'
);

SELECT pg_temp.assert_count('admin: proyectos',           'SELECT 1 FROM public.proyectos',          2);
SELECT pg_temp.assert_count('admin: rubros',              'SELECT 1 FROM public.rubros',             5);
SELECT pg_temp.assert_count('admin: movimientos',         'SELECT 1 FROM public.movimientos',        3);
SELECT pg_temp.assert_count('admin: incidentes',          'SELECT 1 FROM public.incidentes',         1);
SELECT pg_temp.assert_count('admin: formularios',         'SELECT 1 FROM public.formularios',        1);
SELECT pg_temp.assert_count('admin: avances',             'SELECT 1 FROM public.proyecto_avances',   5);
SELECT pg_temp.assert_count('admin: empleados',           'SELECT 1 FROM public.empleados',          3);
SELECT pg_temp.assert_count('admin: subempresas',         'SELECT 1 FROM public.subempresas',        2);

-- =============================================================================
-- 3. CLIENTE_PRINCIPAL — ve toda la empresa pero NO ve auditoria_logs
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000003',
  'ee000000-0000-0000-0000-000000000001',
  NULL,
  'cliente_principal'
);

SELECT pg_temp.assert_count('cliente_principal: proyectos',     'SELECT 1 FROM public.proyectos',     2);
SELECT pg_temp.assert_count('cliente_principal: rubros',        'SELECT 1 FROM public.rubros',        5);
SELECT pg_temp.assert_count('cliente_principal: auditoria_logs','SELECT 1 FROM public.auditoria_logs',0);

-- =============================================================================
-- 4. SUBCLIENTE OPERACIONES — solo PRY-001
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000004',
  'ee000000-0000-0000-0000-000000000001',
  '5e000000-0000-0000-0000-000000000001',
  'subcliente'
);

SELECT pg_temp.assert_count('sub_ops: proyectos',         'SELECT 1 FROM public.proyectos',           1);
SELECT pg_temp.assert_count('sub_ops: ve solo PRY-001',
  $$SELECT 1 FROM public.proyectos WHERE id = 'a0000000-0000-0000-0000-000000000001'$$, 1);
SELECT pg_temp.assert_count('sub_ops: NO ve PRY-002',
  $$SELECT 1 FROM public.proyectos WHERE id = 'a0000000-0000-0000-0000-000000000002'$$, 0);
SELECT pg_temp.assert_count('sub_ops: rubros (3 de PRY-001)', 'SELECT 1 FROM public.rubros',          3);
SELECT pg_temp.assert_count('sub_ops: movimientos (3 PRY-001)','SELECT 1 FROM public.movimientos',    3);
SELECT pg_temp.assert_count('sub_ops: incidentes',        'SELECT 1 FROM public.incidentes',          1);
SELECT pg_temp.assert_count('sub_ops: formularios',       'SELECT 1 FROM public.formularios',         1);
SELECT pg_temp.assert_count('sub_ops: avances PRY-001',   'SELECT 1 FROM public.proyecto_avances',    3);
SELECT pg_temp.assert_count('sub_ops: empleados (Operaciones)','SELECT 1 FROM public.empleados',      2);
SELECT pg_temp.assert_count('sub_ops: auditoria_logs (denegado)','SELECT 1 FROM public.auditoria_logs',0);

-- =============================================================================
-- 5. SUBCLIENTE MANTENIMIENTO — solo PRY-002, NO ve nada de PRY-001
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000005',
  'ee000000-0000-0000-0000-000000000001',
  '5e000000-0000-0000-0000-000000000002',
  'subcliente'
);

SELECT pg_temp.assert_count('sub_mant: proyectos',        'SELECT 1 FROM public.proyectos',           1);
SELECT pg_temp.assert_count('sub_mant: ve solo PRY-002',
  $$SELECT 1 FROM public.proyectos WHERE id = 'a0000000-0000-0000-0000-000000000002'$$, 1);
SELECT pg_temp.assert_count('sub_mant: NO ve PRY-001',
  $$SELECT 1 FROM public.proyectos WHERE id = 'a0000000-0000-0000-0000-000000000001'$$, 0);
SELECT pg_temp.assert_count('sub_mant: rubros (2 de PRY-002)','SELECT 1 FROM public.rubros',          2);
SELECT pg_temp.assert_count('sub_mant: movimientos (0)',  'SELECT 1 FROM public.movimientos',         0);
SELECT pg_temp.assert_count('sub_mant: incidentes (0)',   'SELECT 1 FROM public.incidentes',          0);
SELECT pg_temp.assert_count('sub_mant: formularios (0)',  'SELECT 1 FROM public.formularios',         0);
SELECT pg_temp.assert_count('sub_mant: avances PRY-002',  'SELECT 1 FROM public.proyecto_avances',    2);
SELECT pg_temp.assert_count('sub_mant: empleados (Mantenimiento)','SELECT 1 FROM public.empleados',   1);

-- =============================================================================
-- 6. SST — ve toda la empresa (cross-subempresa)
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000006',
  'ee000000-0000-0000-0000-000000000001',
  NULL,
  'sst'
);

SELECT pg_temp.assert_count('sst: proyectos',             'SELECT 1 FROM public.proyectos',           2);
SELECT pg_temp.assert_count('sst: empleados',             'SELECT 1 FROM public.empleados',           3);
SELECT pg_temp.assert_count('sst: incidentes',            'SELECT 1 FROM public.incidentes',          1);
SELECT pg_temp.assert_count('sst: formularios',           'SELECT 1 FROM public.formularios',         1);

-- =============================================================================
-- 7. OPERATIVO — solo proyectos donde está asignado en proyecto_usuarios
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000007',
  'ee000000-0000-0000-0000-000000000001',
  '5e000000-0000-0000-0000-000000000001',
  'operativo'
);

SELECT pg_temp.assert_count('operativo: proyectos (asignado a PRY-001)',
  'SELECT 1 FROM public.proyectos', 1);
SELECT pg_temp.assert_count('operativo: avances PRY-001', 'SELECT 1 FROM public.proyecto_avances',   3);
SELECT pg_temp.assert_count('operativo: incidentes',      'SELECT 1 FROM public.incidentes',          1);

-- =============================================================================
-- 8. FINANCIERO — ve toda la empresa, ve auditoria_logs (es admin_o_superior?
--    NO: financiero NO está en auth_es_admin_o_superior). Verifica que no ve.
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000008',
  'ee000000-0000-0000-0000-000000000001',
  NULL,
  'financiero'
);

SELECT pg_temp.assert_count('financiero: proyectos',      'SELECT 1 FROM public.proyectos',           2);
SELECT pg_temp.assert_count('financiero: rubros',         'SELECT 1 FROM public.rubros',              5);
SELECT pg_temp.assert_count('financiero: movimientos',    'SELECT 1 FROM public.movimientos',         3);
-- Solo super_admin/admin pueden ver auditoria_logs (financiero no es admin_o_superior)
SELECT pg_temp.assert_count('financiero: auditoria_logs (denegado)',
  'SELECT 1 FROM public.auditoria_logs', 0);

-- =============================================================================
-- 9. AUDITORIA_LOGS — UPDATE/DELETE deben fallar incluso para admin
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000002',
  'ee000000-0000-0000-0000-000000000001',
  NULL,
  'admin'
);

DO $$
BEGIN
  -- Intentar UPDATE de auditoria_logs debe ser bloqueado por RLS (0 filas afectadas)
  UPDATE public.auditoria_logs SET created_at = NOW() WHERE TRUE;
  IF FOUND THEN
    RAISE EXCEPTION 'FAIL: admin pudo hacer UPDATE en auditoria_logs (debe ser inmutable)';
  END IF;
  RAISE NOTICE 'OK [auditoria_logs es inmutable para admin]';
END;
$$;

DO $$
BEGIN
  DELETE FROM public.auditoria_logs WHERE TRUE;
  IF FOUND THEN
    RAISE EXCEPTION 'FAIL: admin pudo hacer DELETE en auditoria_logs (debe ser inmutable)';
  END IF;
  RAISE NOTICE 'OK [auditoria_logs no se puede DELETE]';
END;
$$;

-- =============================================================================
-- 10. VISTA vw_proyecto_resumen hereda RLS
-- =============================================================================
SELECT pg_temp.set_jwt(
  '00000000-0000-0000-0000-000000000005',
  'ee000000-0000-0000-0000-000000000001',
  '5e000000-0000-0000-0000-000000000002',
  'subcliente'
);

-- subcliente_mant solo debe ver su proyecto en la vista (si la vista existe)
DO $$
DECLARE
  v_count BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='vw_proyecto_resumen') THEN
    SELECT COUNT(*) INTO v_count FROM public.vw_proyecto_resumen;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'FAIL: vw_proyecto_resumen no respeta RLS para subcliente_mant (esperaba 1, obtuvo %)', v_count;
    END IF;
    RAISE NOTICE 'OK [vw_proyecto_resumen respeta RLS] = %', v_count;
  ELSE
    RAISE NOTICE 'SKIP [vw_proyecto_resumen no existe — migración 0012 no aplicada]';
  END IF;
END;
$$;

-- =============================================================================
-- FIN
-- =============================================================================
RESET ROLE;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'OK — todos los asserts pasaron';
  RAISE NOTICE '========================================';
END;
$$;

ROLLBACK;
