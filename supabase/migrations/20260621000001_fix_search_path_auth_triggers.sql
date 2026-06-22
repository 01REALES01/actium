-- =============================================================================
-- ACTIUM | 0014 — Fix search_path en funciones SECURITY DEFINER de Auth
-- =============================================================================
-- handle_new_user, sync_ultimo_login y custom_access_token_hook son invocadas
-- por el rol interno supabase_auth_admin (triggers en auth.users / JWT hook),
-- cuyo search_path NO incluye 'public'. Sin un search_path explicito, el cast
-- bare `::user_role` dentro de handle_new_user falla con
-- "type \"user_role\" does not exist", bloqueando TODO alta de usuario
-- (auth.admin.createUser y signUp por igual).
--
-- Se fija search_path en las tres funciones de este grupo para que resuelvan
-- siempre los tipos/objetos de 'public' sin depender del rol que las invoque.
-- =============================================================================

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_ultimo_login() SET search_path = public, pg_temp;
ALTER FUNCTION public.custom_access_token_hook(jsonb) SET search_path = public, pg_temp;
