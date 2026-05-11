-- =============================================================================
-- ACTIUM | 0010 — Custom Access Token Hook
-- =============================================================================
-- Supabase llama a esta función al firmar cada JWT. Inyecta empresa_id,
-- subempresa_id y rol como claims de nivel superior para que las RLS policies
-- (helpers en 0008) puedan leerlos via auth.jwt() ->> 'campo'.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_user_id   UUID;
  v_claims    JSONB;
  v_usuario   RECORD;
BEGIN
  v_user_id := (event ->> 'user_id')::UUID;
  v_claims  := event -> 'claims';

  SELECT empresa_id, subempresa_id, rol
    INTO v_usuario
    FROM public.usuarios
   WHERE id = v_user_id;

  IF FOUND THEN
    v_claims := v_claims
      || jsonb_build_object(
           'empresa_id',    v_usuario.empresa_id,
           'subempresa_id', v_usuario.subempresa_id,
           'rol',           v_usuario.rol
         );
  END IF;

  RETURN jsonb_build_object('claims', v_claims);
END;
$$;

-- Permisos requeridos por Supabase Auth para invocar el hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
