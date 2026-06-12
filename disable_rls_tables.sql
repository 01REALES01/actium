-- Script para permitir la escritura en las tablas de eventos durante desarrollo
-- Desactiva el RLS (Row Level Security) temporalmente para las tablas clave
-- que estamos utilizando en el Dashboard de Proyectos y el Calendario SST.

ALTER TABLE public.proyecto_avances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ausentismos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos DISABLE ROW LEVEL SECURITY;

-- Nota: Una vez pases a produccion real, deberas volver a habilitarlas y 
-- asegurarte de que las politicas usen (auth.jwt() -> 'user_metadata' ->> 'rol')
-- en lugar de auth.jwt() ->> 'rol'.
