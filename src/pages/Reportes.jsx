import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, Calendar, Activity, Zap, Layers, Users, CheckCircle2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { exportToCSV } from "@/lib/exportUtils";
import ReporteObservaciones from "@/components/reportes/ReporteObservaciones";
import AutomatizacionWhatsApp from "@/components/reportes/AutomatizacionWhatsApp";
import { cn } from "@/lib/utils";

const AREA_COLORS = {
  "Contratistas": "bg-stone-500 text-stone-950 border-stone-500",
  "Recepción": "bg-sky-500 text-sky-950 border-sky-500",
  "Cortado": "bg-orange-500 text-orange-950 border-orange-500",
  "Tableros": "bg-amber-500 text-amber-950 border-amber-500",
  "Armado": "bg-emerald-500 text-emerald-950 border-emerald-500",
  "Pulido": "bg-indigo-500 text-indigo-950 border-indigo-500",
  "Barnizado": "bg-red-500 text-red-950 border-red-500",
  "Empaque": "bg-purple-500 text-purple-950 border-purple-500",
  "Entrega": "bg-blue-500 text-blue-950 border-blue-500",
  "Otro": "bg-zinc-500 text-zinc-950 border-zinc-500",
};

export default function Reportes() {
  const [periodo, setPeriodo] = useState("diario");
  const [fechaFiltro, setFechaFiltro] = useState(format(new Date(), "yyyy-MM-dd"));
  const [proyectoFiltro, setProyectoFiltro] = useState("all");
  const [areaActiva, setAreaActiva] = useState("Todas");

  const { data: registros = [] } = useQuery({
    queryKey: ["registros-all"],
    queryFn: () => supabase.from('registro_trabajo').select('*').order('created_date', { ascending: false }).limit(2000).then(res => res.data),
  });

  const { data: proyectos = [] } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => supabase.from('proyecto').select('*').order('created_date', { ascending: false }).limit(100).then(res => res.data),
  });

  const filteredRegistros = useMemo(() => {
    const fecha = new Date(fechaFiltro);
    return registros.filter(r => {
      if (!r.fecha) return false;
      const regDate = new Date(r.fecha);
      let inRange = false;
      if (periodo === "diario") {
        inRange = r.fecha === fechaFiltro;
      } else if (periodo === "semanal") {
        const weekStart = startOfWeek(fecha, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(fecha, { weekStartsOn: 1 });
        inRange = isWithinInterval(regDate, { start: weekStart, end: weekEnd });
      } else {
        const monthStart = startOfMonth(fecha);
        const monthEnd = endOfMonth(fecha);
        inRange = isWithinInterval(regDate, { start: monthStart, end: monthEnd });
      }
      const matchProy = proyectoFiltro === "all" || r.proyecto_id === proyectoFiltro;
      return inRange && matchProy;
    });
  }, [registros, periodo, fechaFiltro, proyectoFiltro]);

  // Agrupar por áreas
  const registrosPorArea = useMemo(() => {
    const grupos = {};
    filteredRegistros.forEach(r => {
      const area = r.area || r.area_encargado || "Sin Área";
      if (!grupos[area]) grupos[area] = [];
      grupos[area].push(r);
    });
    return grupos;
  }, [filteredRegistros]);

  const areasDisponibles = Object.keys(registrosPorArea).sort();

  const handleExportCSV = () => {
    // Export logic
    const exportData = filteredRegistros.map(r => ({
      "Encargado": r.encargado_nombre || "",
      "Trabajador": r.trabajador_nombre,
      "Área": r.area || r.area_encargado || "",
      "Tipo de Trabajo": r.tipo_trabajo,
      "Fase": r.fase || "",
      "Finalizado": r.es_finalizado ? "Sí" : "No",
      "Cantidad": r.cantidad || 1,
      "Proyecto": r.proyecto_nombre || r.numero_proyecto || "",
      "Fecha": r.fecha,
      "Hora": r.hora_registro || "",
    }));
    const periodoLabel = periodo === "diario" ? fechaFiltro : periodo === "semanal" ? `semana-${fechaFiltro}` : `mes-${fechaFiltro.substring(0, 7)}`;
    exportToCSV(exportData, `reporte-${periodo}-${periodoLabel}`);
  };

  const periodoTitle = periodo === "diario"
    ? format(new Date(fechaFiltro), "dd 'de' MMMM yyyy", { locale: es })
    : periodo === "semanal"
    ? `Semana del ${format(startOfWeek(new Date(fechaFiltro), { weekStartsOn: 1 }), "dd/MM")} al ${format(endOfWeek(new Date(fechaFiltro), { weekStartsOn: 1 }), "dd/MM/yyyy")}`
    : format(new Date(fechaFiltro), "MMMM yyyy", { locale: es });

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Reportes Analíticos" description="Rendimiento por áreas y proyectos" />

      {/* Panel de Filtros Inteligente */}
      <div className="sticky top-0 z-30 pt-4 pb-4 bg-black/80 backdrop-blur-xl border-b border-white/10 mb-6 px-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setPeriodo("diario")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${periodo === "diario" ? "bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>Diario</button>
            <button onClick={() => setPeriodo("semanal")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${periodo === "semanal" ? "bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>Semanal</button>
            <button onClick={() => setPeriodo("mensual")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${periodo === "mensual" ? "bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>Mensual</button>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 h-10 border border-white/10">
              <Calendar className="w-4 h-4 text-orange-500" />
              <Input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="bg-transparent border-0 text-white focus-visible:ring-0 p-0 h-auto w-32" />
            </div>
            <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
              <SelectTrigger className="w-full sm:w-56 glass-input rounded-full px-5 h-10 border-white/10">
                <SelectValue placeholder="Todos los proyectos" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl shadow-xl">
                <SelectItem value="all" className="focus:bg-orange-600/20 focus:text-orange-500 cursor-pointer rounded-lg">Todos los proyectos</SelectItem>
                {proyectos.map(p => (
                  <SelectItem key={p.id} value={p.id} className="focus:bg-orange-600/20 focus:text-orange-500 cursor-pointer rounded-lg">{p.numero_proyecto} — {p.descripcion}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredRegistros.length === 0} className="rounded-full bg-white text-black hover:bg-zinc-200 border-0 px-6 h-10 font-bold hidden sm:flex">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Global Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors"></div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4 text-orange-500" /> Registros</p>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-5xl font-black text-white leading-none">{filteredRegistros.length}</p>
            <p className="text-sm font-medium text-orange-500 mb-1">tickets</p>
          </div>
        </Card>
        <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2"><Layers className="w-4 h-4 text-blue-500" /> Prod. Total</p>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-5xl font-black text-white leading-none">{filteredRegistros.reduce((s, r) => s + (r.cantidad || 1), 0)}</p>
            <p className="text-sm font-medium text-blue-500 mb-1">piezas</p>
          </div>
        </Card>
        <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Finalizados</p>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-5xl font-black text-white leading-none">{filteredRegistros.filter(r => r.es_finalizado).reduce((s, r) => s + (r.cantidad || 1), 0)}</p>
            <p className="text-sm font-medium text-emerald-500 mb-1">piezas</p>
          </div>
        </Card>
        <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors"></div>
          <p className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" /> Personal</p>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-5xl font-black text-white leading-none">{new Set(filteredRegistros.map(r => r.trabajador_nombre)).size}</p>
            <p className="text-sm font-medium text-purple-500 mb-1">activos</p>
          </div>
        </Card>
      </div>

      {/* Observaciones IA (si quieres mantenerlo aquí) */}
      <ReporteObservaciones registros={filteredRegistros} proyectos={proyectos} periodo={periodoTitle} />

      {/* Distribution by Area */}
      {filteredRegistros.length > 0 && (
        <div className="mb-8 mt-6">
          <h3 className="text-lg font-black text-white mb-4">Distribución por Áreas</h3>
          <div className="flex h-6 rounded-full overflow-hidden bg-white/5 shadow-inner">
            {areasDisponibles.map(area => {
              const count = registrosPorArea[area].length;
              const percent = (count / filteredRegistros.length) * 100;
              const colorClass = AREA_COLORS[area] ? AREA_COLORS[area].split(" ")[0].replace("bg-", "") : "zinc-500";
              return (
                <div key={area} style={{ width: `${percent}%` }} className={`bg-${colorClass} hover:opacity-80 transition-opacity cursor-pointer`} title={`${area}: ${count} tickets`} />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {areasDisponibles.map(area => {
              const count = registrosPorArea[area].length;
              const colorClass = AREA_COLORS[area] ? AREA_COLORS[area].split(" ")[0].replace("bg-", "") : "zinc-500";
              return (
                <div key={area} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-${colorClass}`}></div>
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{area} ({count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs de Áreas */}
      <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-6">
        <button
          onClick={() => setAreaActiva("Todas")}
          className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-black transition-all ${areaActiva === "Todas" ? "bg-white text-black shadow-xl" : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"}`}
        >
          Todas las Áreas
        </button>
        {areasDisponibles.map(area => (
          <button
            key={area}
            onClick={() => setAreaActiva(area)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all ${areaActiva === area ? AREA_COLORS[area] || AREA_COLORS["Otro"] + " shadow-xl border-2" : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/10"}`}
          >
            {area}
          </button>
        ))}
      </div>

      {/* Registros Grouped by Area */}
      <div className="space-y-12">
        {areasDisponibles
          .filter(area => areaActiva === "Todas" || areaActiva === area)
          .map(area => {
            const records = registrosPorArea[area];
            return (
              <div key={area} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-4 h-8 rounded-full ${AREA_COLORS[area] ? AREA_COLORS[area].split(" ")[0] : "bg-zinc-500"}`}></div>
                  <h2 className="text-2xl font-black text-white">{area}</h2>
                  <Badge variant="outline" className="bg-white/5 text-white border-white/10 ml-2">{records.length} registros</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {records.map(r => (
                    <div key={r.id} className="glass-card-dark rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all hover:bg-white/5 flex flex-col justify-between group">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-lg font-black text-white leading-tight">{r.tipo_trabajo}</p>
                            <p className="text-sm font-bold text-orange-400">{r.cantidad} {r.cantidad === 1 ? "pieza" : "piezas"}</p>
                          </div>
                          {r.es_finalizado && (
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1 mb-4">
                          <p className="text-sm text-white/80"><span className="text-white/40">Trabajador:</span> {r.trabajador_nombre}</p>
                          {r.encargado_nombre && <p className="text-sm text-white/80"><span className="text-white/40">Encargado:</span> {r.encargado_nombre}</p>}
                          <p className="text-sm text-white/80 truncate"><span className="text-white/40">Proyecto:</span> {r.proyecto_nombre || r.numero_proyecto || "—"}</p>
                          {r.fase && <p className="text-sm text-white/80"><span className="text-white/40">Fase:</span> {r.fase}</p>}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-white/40 pt-3 border-t border-white/10 mt-auto">
                        <span>{format(new Date(r.created_date), "dd/MMM", { locale: es })} {r.hora_registro ? `· ${r.hora_registro}` : ""}</span>
                        {r.fotos?.length > 0 && <span>📸 {r.fotos.length} foto(s)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {filteredRegistros.length === 0 && (
            <div className="text-center py-24 glass-card-dark rounded-3xl border-white/10">
              <Zap className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-xl font-bold text-white/50">No hay producción registrada</p>
              <p className="text-sm text-white/30 mt-2">Intenta cambiar los filtros de fecha o proyecto.</p>
            </div>
          )}
        {/* Estado de Proyectos y Observaciones */}
        <div className="mt-12 space-y-8">
          <AutomatizacionWhatsApp />
        </div>
      </div>
    </div>
  );
}
