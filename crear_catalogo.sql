-- Ejecuta esto en el SQL Editor de Supabase para crear la tabla de Catálogo

CREATE TABLE public.catalogo_trabajo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT,
    descripcion TEXT,
    fases JSONB DEFAULT '[]'::jsonb,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true
);

-- Si deseas habilitar RLS y políticas (opcional para tu setup actual)
-- ALTER TABLE public.catalogo_trabajo ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations for service role" ON public.catalogo_trabajo USING (true);
