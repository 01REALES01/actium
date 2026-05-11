-- =============================================================================
-- ACTIUM | 0008 — Helpers JWT y Trigger handle_new_user
-- =============================================================================
-- Funciones SECURITY DEFINER que leen claims del JWT sin tocar tablas en
-- cada query. Son el punto central que usan las RLS policies de 0009.
-- Todas viven en schema 'public' para que sean llamables desde policies.
--
-- Claims esperados en el JWT (seteados por handle_new_user + refresh):
--   empresa_id    uuid | null
--   subempresa_id uuid | null
--   rol           user_role
-- =============================================================================

-- =============================================================================
-- HELPERS DE CLAIMS JWT
-- =============================================================================

-- Retorna el empresa_id del usuario autenticado (NULL para super_admin)
CREATE OR REPLACE FUNCTION public.auth_empresa_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(auth.jwt() ->> 'empresa_id', '')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Retorna el subempresa_id del usuario autenticado (NULL si no aplica)
CREATE OR REPLACE FUNCTION public.auth_subempresa_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(auth.jwt() ->> 'subempresa_id', '')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Retorna el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.auth_rol()
RETURNS user_role AS $$
BEGIN
  RETURN (auth.jwt() ->> 'rol')::user_role;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- TRUE si el usuario es super_admin
CREATE OR REPLACE FUNCTION public.auth_es_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((auth.jwt() ->> 'rol') = 'super_admin', FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- TRUE si el usuario tiene rol admin o superior (super_admin, admin)
CREATE OR REPLACE FUNCTION public.auth_es_admin_o_superior()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((auth.jwt() ->> 'rol') IN ('super_admin', 'admin'), FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- TRUE si el usuario puede ver datos de la empresa dada
-- super_admin ve todo; los demas deben pertenecer a la empresa
CREATE OR REPLACE FUNCTION public.auth_tiene_acceso_empresa(p_empresa_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.auth_es_super_admin()
    OR public.auth_empresa_id() = p_empresa_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- TRUE si el usuario puede ver datos de la subempresa dada
-- super_admin y admin ven todas las subempresas de su empresa;
-- subcliente y operativo solo la suya propia
CREATE OR REPLACE FUNCTION public.auth_tiene_acceso_subempresa(
  p_empresa_id    UUID,
  p_subempresa_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rol user_role;
BEGIN
  IF NOT public.auth_tiene_acceso_empresa(p_empresa_id) THEN
    RETURN FALSE;
  END IF;

  v_rol := public.auth_rol();

  -- Roles con acceso a todas las subempresas de su empresa
  IF v_rol IN ('super_admin', 'admin', 'cliente_principal', 'sst', 'financiero') THEN
    RETURN TRUE;
  END IF;

  -- subcliente y operativo: solo su propia subempresa
  RETURN public.auth_subempresa_id() = p_subempresa_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- TRUE si el usuario puede acceder al proyecto dado
-- Operativo: solo proyectos donde esta explicitamente asignado
-- Demas roles: heredan acceso por subempresa/empresa
CREATE OR REPLACE FUNCTION public.auth_tiene_acceso_proyecto(
  p_proyecto_id    UUID,
  p_empresa_id     UUID DEFAULT NULL,
  p_subempresa_id  UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rol                user_role;
  v_user_empresa_id    UUID;
  v_user_subempresa_id UUID;
  v_proj_empresa_id    UUID;
  v_proj_subempresa_id UUID;
BEGIN
  v_rol                := public.auth_rol();
  v_user_empresa_id    := public.auth_empresa_id();
  v_user_subempresa_id := public.auth_subempresa_id();

  IF public.auth_es_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- Usar valores provistos o buscar si son NULL (solo si no es super_admin)
  v_proj_empresa_id    := p_empresa_id;
  v_proj_subempresa_id := p_subempresa_id;

  IF v_proj_empresa_id IS NULL THEN
    SELECT empresa_id, subempresa_id INTO v_proj_empresa_id, v_proj_subempresa_id
    FROM public.proyectos
    WHERE id = p_proyecto_id AND deleted_at IS NULL;
  END IF;

  -- Si no existe el proyecto o no pertenece a la empresa del usuario
  IF v_proj_empresa_id IS NULL OR v_proj_empresa_id <> v_user_empresa_id THEN
    RETURN FALSE;
  END IF;

  -- Operativo: solo proyectos asignados explicitamente
  IF v_rol = 'operativo' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.proyecto_usuarios
      WHERE proyecto_id = p_proyecto_id
        AND usuario_id = auth.uid()
        AND retirado_at IS NULL
    );
  END IF;

  -- Subcliente: solo proyectos de su subempresa
  IF v_rol = 'subcliente' THEN
    RETURN v_proj_subempresa_id = v_user_subempresa_id;
  END IF;

  -- Admin, cliente_principal, sst, financiero: todos los proyectos de la empresa
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: handle_new_user
-- =============================================================================
-- Crea la fila en public.usuarios cuando se registra un nuevo auth.user.
-- Los metadatos (empresa_id, subempresa_id, rol, nombre) deben incluirse
-- en raw_user_meta_data al crear el usuario via Admin API o signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_meta JSONB;
BEGIN
  v_meta := NEW.raw_user_meta_data;

  INSERT INTO public.usuarios (
    id,
    empresa_id,
    subempresa_id,
    rol,
    nombre,
    email,
    telefono,
    cedula,
    cargo,
    activo
  ) VALUES (
    NEW.id,
    NULLIF(v_meta ->> 'empresa_id', '')::UUID,
    NULLIF(v_meta ->> 'subempresa_id', '')::UUID,
    COALESCE((v_meta ->> 'rol')::user_role, 'operativo'),
    COALESCE(v_meta ->> 'nombre', NEW.email),
    NEW.email::CITEXT,
    v_meta ->> 'telefono',
    v_meta ->> 'cedula',
    v_meta ->> 'cargo',
    TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- El trigger va en auth.users (schema auth, manejado por Supabase)
CREATE OR REPLACE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- TRIGGER: sync_ultimo_login
-- =============================================================================
-- Actualiza usuarios.ultimo_login cuando el usuario hace login
-- (Supabase actualiza auth.users.last_sign_in_at en cada sesion)
CREATE OR REPLACE FUNCTION public.sync_ultimo_login()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.usuarios
    SET ultimo_login = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_sync_ultimo_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_ultimo_login();
