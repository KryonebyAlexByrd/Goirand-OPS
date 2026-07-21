import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import StatsGrid from "@/components/dashboard/StatsGrid";
import ProjectsOverview from "@/components/dashboard/ProjectsOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { FolderKanban, ClipboardList, HardHat, Users } from "lucide-react";

export default function Dashboard() {
  const { data: proyectos = [] } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => supabase.from('proyecto').select('*').order('created_date', { ascending: false }).limit(50).then(res => res.data),
  });

  const { data: registros = [] } = useQuery({
    queryKey: ["registros"],
    queryFn: () => supabase.from('registro_trabajo').select('*').order('created_date', { ascending: false }).limit(20).then(res => res.data),
  });

  const { data: contratistas = [] } = useQuery({
    queryKey: ["contratistas"],
    queryFn: () => supabase.from('contratista').select('*').then(res => res.data),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => supabase.from('cliente').select('*').then(res => res.data),
  });

  const activos = proyectos.filter(p => p.estado === "Activo");
  const hoy = new Date().toISOString().split("T")[0];
  const registrosHoy = registros.filter(r => r.fecha === hoy);

  const stats = [
    { label: "Proyectos Activos", value: activos.length, icon: FolderKanban, color: "#E8661B", sub: `${proyectos.length} totales` },
    { label: "Registros Hoy", value: registrosHoy.length, icon: ClipboardList, color: "#10B981", sub: "Trabajos capturados" },
    { label: "Contratistas", value: contratistas.length, icon: HardHat, color: "#6366F1", sub: `${contratistas.filter(c => c.disponible).length} disponibles` },
    { label: "Clientes", value: clientes.length, icon: Users, color: "#F59E0B", sub: "En cartera" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Vista general del control de producción" />
      <div className="space-y-6">
        <StatsGrid stats={stats} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProjectsOverview proyectos={proyectos} />
          </div>
          <div>
            <RecentActivity registros={registros} />
          </div>
        </div>
      </div>
    </div>
  );
}
