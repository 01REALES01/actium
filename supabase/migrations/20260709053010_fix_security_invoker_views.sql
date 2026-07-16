-- =============================================================================
-- ACTIUM | Fix — security_invoker en vistas (evita bypass de RLS)
-- =============================================================================
-- Postgres 15+ crea vistas con security_invoker=false por defecto: se ejecutan
-- con los permisos del DUEÑO de la vista, no de quien consulta, lo que salta
-- por completo el RLS de las tablas subyacentes. El advisor de seguridad de
-- Supabase lo marca como ERROR. Afecta tres vistas nuevas del modulo de
-- finanzas (vw_flujo_caja_quincenal, vw_rubro_balance, vw_proyectos_finanzas)
-- y una preexistente (vw_proyecto_resumen) que tenia el mismo problema desde
-- antes de esta migracion — cualquier usuario autenticado podia ver proyectos
-- de otras empresas a traves de esa vista, sin importar las policies RLS.
-- =============================================================================
ALTER VIEW public.vw_proyecto_resumen SET (security_invoker = true);
ALTER VIEW public.vw_flujo_caja_quincenal SET (security_invoker = true);
ALTER VIEW public.vw_rubro_balance SET (security_invoker = true);
ALTER VIEW public.vw_proyectos_finanzas SET (security_invoker = true);
