import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, CheckCircle2 } from "lucide-react";
import { format, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";

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
  "Admin": "bg-white/10 text-white border-white/20",
};

export default function MiArea() {
  const { user } = useAuth();
  const userArea = user?.perfil_encargado?.area_principal || user?.user_metadata?.area || "Otro";

  const { data: areaPersonas = [] } = useQuery({
    queryKey: ["encargados-area", userArea],
    queryFn: () => supabase.from('perfil_encargado').select('*').eq('area_principal', userArea).order('nombre', { ascending: true }).then(res => res.data),
  });

  const { data: areaRegistros = [] } = useQuery({
    queryKey: ["registros-area", userArea],
    queryFn: () => supabase.from('registro_trabajo').select('*').eq('area_encargado', userArea).order('created_date', { ascending: false }).limit(500).then(res => res.data),
  });

  // Stats calculation
  const hoy = new Date();
  const stats = {
    total: areaRegistros.length,
    diario: areaRegistros.filter(r => isSameDay(new Date(r.created_date), hoy)).length,
    semanal: areaRegistros.filter(r => isSameWeek(new Date(r.created_date), hoy)).length,
    mensual: areaRegistros.filter(r => isSameMonth(new Date(r.created_date), hoy)).length,
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <PageHeader title={`Mi Área: ${userArea}`} description="Métricas de producción y personal de tu área">
        <Badge className={`px-4 py-1.5 text-sm ${AREA_COLORS[userArea] || AREA_COLORS["Otro"]}`}>
          {userArea}
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
            <Users className="w-5 h-5 text-orange-500" /> Mi Equipo ({areaPersonas.length})
          </h3>
          <div className="space-y-3">
            {areaPersonas.map(p => (
              <div key={p.id} className="glass-card-dark border border-white/10 shadow-2xl rounded-xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold border border-orange-500/20">
                  {(p.nombre || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{p.nombre}</p>
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
                  <p className="text-white/50 text-sm">No hay registros de producción en esta área.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {areaRegistros.slice(0, 30).map(r => (
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
