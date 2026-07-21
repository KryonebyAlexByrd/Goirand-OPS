import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, ChevronLeft, ArrowRight, ClipboardList, CheckCircle2 } from "lucide-react";
import { format, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";

const AREAS = ["Contratistas", "Recepción", "Cortado", "Tableros", "Armado", "Pulido", "Barnizado", "Empaque", "Entrega", "Otro"];

const AREA_COLORS = {
  "Contratistas": "bg-stone-500/10 text-stone-600 border-stone-200",
  "Recepción": "bg-sky-500/10 text-sky-600 border-sky-200",
  "Cortado": "bg-orange-500/10 text-orange-600 border-orange-200",
  "Tableros": "bg-amber-500/10 text-amber-600 border-amber-200",
  "Armado": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "Pulido": "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  "Barnizado": "bg-red-500/10 text-red-600 border-red-200",
  "Empaque": "bg-purple-500/10 text-purple-600 border-purple-200",
  "Entrega": "bg-blue-500/10 text-blue-600 border-blue-200",
  "Otro": "bg-gray-500/10 text-gray-600 border-gray-200",
};

export default function AreasDashboard() {
  const [selectedArea, setSelectedArea] = useState(null);

  const { data: encargados = [] } = useQuery({
    queryKey: ["encargados"],
    queryFn: () => supabase.from('perfil_encargado').select('*').order('nombre', { ascending: true }).then(res => res.data),
  });

  const { data: todosRegistros = [] } = useQuery({
    queryKey: ["todos-registros"],
    queryFn: () => supabase.from('registro_trabajo').select('*').order('created_date', { ascending: false }).limit(2000).then(res => res.data),
  });

  const baseAreas = Object.keys(AREA_COLORS).filter(k => k !== "Otro" && k !== "Admin");
  
  const groupedAreas = baseAreas.reduce((acc, area) => {
    acc[area] = [];
    return acc;
  }, {});

  encargados.forEach((curr) => {
    const area = curr.area_principal || "Sin Área";
    if (area !== "Admin") {
      if (!groupedAreas[area]) groupedAreas[area] = [];
      groupedAreas[area].push(curr);
    }
  });

  const areasList = Object.keys(groupedAreas).sort();

  if (selectedArea) {
    const areaPersonas = groupedAreas[selectedArea] || [];
    const areaRegistros = todosRegistros.filter(r => r.area_encargado === selectedArea);
    
    // Stats calculation
    const hoy = new Date();
    const stats = {
      total: areaRegistros.length,
      diario: areaRegistros.filter(r => isSameDay(new Date(r.created_date), hoy)).length,
      semanal: areaRegistros.filter(r => isSameWeek(new Date(r.created_date), hoy)).length,
      mensual: areaRegistros.filter(r => isSameMonth(new Date(r.created_date), hoy)).length,
    };

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground" onClick={() => setSelectedArea(null)}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Volver a Áreas
        </Button>
        
        <PageHeader title={`Dashboard: ${selectedArea}`} description="Métricas de producción y personal del área">
          <Badge className={`px-4 py-1.5 text-sm ${AREA_COLORS[selectedArea] || AREA_COLORS["Otro"]}`}>
            {selectedArea}
          </Badge>
        </PageHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">Diario</p>
              <h2 className="text-3xl font-black text-white">{stats.diario}</h2>
              <p className="text-xs text-white/50 mt-1">registros hoy</p>
            </CardContent>
          </Card>
          <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">Semanal</p>
              <h2 className="text-3xl font-black text-white">{stats.semanal}</h2>
              <p className="text-xs text-white/50 mt-1">registros esta semana</p>
            </CardContent>
          </Card>
          <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-2">Mensual</p>
              <h2 className="text-3xl font-black text-white">{stats.mensual}</h2>
              <p className="text-xs text-white/50 mt-1">registros este mes</p>
            </CardContent>
          </Card>
          <Card className="glass-card-dark border-orange-500/30 bg-orange-500/10 shadow-2xl rounded-3xl">
            <CardContent className="p-6">
              <p className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-2">Histórico</p>
              <h2 className="text-3xl font-black text-orange-500">{stats.total}</h2>
              <p className="text-xs text-orange-500/70 mt-1">registros totales</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Columna Izquierda: Encargados */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Personal Asignado ({areaPersonas.length})
            </h3>
            <div className="space-y-3">
              {areaPersonas.map(p => (
                <div key={p.id} className="glass-card-dark border border-white/10 shadow-2xl rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                    {(p.nombre || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">{p.nombre}</p>
                    <p className="text-xs text-white/50">ID: {p.id.substring(0,8)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Registros recientes */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" /> Registros Recientes
            </h3>
            <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
              <CardContent className="p-0">
                {areaRegistros.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">No hay registros de producción en esta área.</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {areaRegistros.slice(0, 20).map(r => (
                      <div key={r.id} className="p-4 flex gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                        {r.fotos?.[0] ? (
                          <img src={r.fotos[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                            <CheckCircle2 className="w-5 h-5 text-white/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold truncate text-white">{r.tipo_trabajo}</p>
                            <span className="text-[10px] text-white/50">{format(new Date(r.created_date), "dd/MMM HH:mm", { locale: es })}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {r.fase && (
                              <Badge variant="outline" className={`text-[10px] px-2 py-0 border-0 ${r.es_finalizado ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-white/70"}`}>
                                {r.es_finalizado ? "Finalizado" : r.fase}
                              </Badge>
                            )}
                            <span className="text-xs font-bold text-white/80">{r.cantidad} pzs</span>
                            <span className="text-xs text-white/50 truncate">{r.proyecto_nombre}</span>
                            <span className="text-xs text-white/50 font-medium">por {r.trabajador_nombre}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Métricas por Área" description="Selecciona un área para ver sus estadísticas de producción" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {areasList.map(area => {
          const colorClass = AREA_COLORS[area] || AREA_COLORS["Otro"];
          const count = groupedAreas[area].length;
          return (
            <Card key={area} className="group cursor-pointer hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] hover:border-orange-500/30 transition-all glass-card-dark border-white/10 shadow-2xl rounded-3xl" onClick={() => setSelectedArea(area)}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${colorClass}`}>
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="bg-background">{count} Encargados</Badge>
                </div>
                <h3 className="text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">{area}</h3>
                <div className="flex items-center gap-2 text-sm text-primary font-bold mt-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                  Ver Dashboard <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
