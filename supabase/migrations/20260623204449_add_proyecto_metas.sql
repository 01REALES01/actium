CREATE TABLE IF NOT EXISTS public.proyecto_metas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    avance_esperado NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (proyecto_id, fecha)
);

ALTER TABLE public.proyecto_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de proyecto_metas autenticada" ON public.proyecto_metas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins pueden crear proyecto_metas" ON public.proyecto_metas FOR INSERT TO authenticated WITH CHECK (auth_rol() IN ('super_admin', 'admin', 'sst'));
CREATE POLICY "Admins pueden actualizar proyecto_metas" ON public.proyecto_metas FOR UPDATE TO authenticated USING (auth_rol() IN ('super_admin', 'admin', 'sst')) WITH CHECK (auth_rol() IN ('super_admin', 'admin', 'sst'));
CREATE POLICY "Admins pueden eliminar proyecto_metas" ON public.proyecto_metas FOR DELETE TO authenticated USING (auth_rol() IN ('super_admin', 'admin', 'sst'));
