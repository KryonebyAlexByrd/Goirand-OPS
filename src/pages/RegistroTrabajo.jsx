import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import WorkForm from "@/components/registro/WorkForm";
import TodayLog from "@/components/registro/TodayLog";

export default function RegistroTrabajo() {
  const { data: proyectos = [] } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => supabase.from('proyecto').select('*').order('created_date', { ascending: false }).limit(50).then(res => res.data),
  });

  const { data: trabajadores = [] } = useQuery({
    queryKey: ["trabajadores"],
    queryFn: () => supabase.from('trabajador').select('*').then(res => res.data),
  });

  const { data: contratistas = [] } = useQuery({
    queryKey: ["contratistas"],
    queryFn: () => supabase.from('contratista').select('*').then(res => res.data),
  });

  const { data: registros = [] } = useQuery({
    queryKey: ["registros"],
    queryFn: () => supabase.from('registro_trabajo').select('*').order('created_date', { ascending: false }).limit(100).then(res => res.data),
  });

  return (
    <div>
      <PageHeader 
        title="Registro de Trabajo" 
        description="Captura el trabajo realizado en el día, selecciona el proyecto y sube evidencia fotográfica" 
      />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <WorkForm proyectos={proyectos} trabajadores={trabajadores} contratistas={contratistas} />
        </div>
        <div className="lg:col-span-2">
          <TodayLog registros={registros} />
        </div>
      </div>
    </div>
  );
}
