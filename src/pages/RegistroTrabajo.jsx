import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Camera, Package } from "lucide-react";

export default function RegistroTrabajo() {
  const { data: registros = [] } = useQuery({
    queryKey: ["registros-historicos"],
    queryFn: () => supabase.from('registro_trabajo')
      .select('*')
      .order('created_date', { ascending: false, nullsFirst: false })
      .limit(300)
      .then(res => res.data),
  });

  // Agrupar registros por fecha
  const grouped = registros.reduce((acc, r) => {
    const fecha = r.fecha || (r.created_date ? r.created_date.split('T')[0] : 'Sin fecha');
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(r);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <PageHeader 
        title="Historial de Registros" 
        description="Explora el historial completo de todos los trabajos registrados en tiempo real, divididos por día." 
      />
      
      {dates.length === 0 ? (
        <div className="text-center py-12 text-white/50">Cargando registros...</div>
      ) : (
        <div className="space-y-8">
          {dates.map(date => {
            let dateTitle = "Fecha desconocida";
            if (date !== "Sin fecha") {
              try {
                dateTitle = format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: es });
              } catch(e) {
                dateTitle = date;
              }
            }

            return (
              <Card key={date} className="glass-card-dark border-white/10 shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/10 bg-white/5">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-white capitalize">
                    <Clock className="w-5 h-5 text-orange-500" />
                    {dateTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grouped[date].map((r) => (
                      <div key={r.id} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/50 transition-colors shadow-lg">
                        {r.fotos?.length > 0 ? (
                          <img src={r.fotos[0]} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-black/40 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-orange-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">{r.trabajador_nombre}</span>
                            <span className="text-xs text-white/50 flex-shrink-0">· {r.hora_registro}</span>
                          </div>
                          <p className="text-xs text-orange-400 mt-0.5 truncate">
                            {r.fase}
                          </p>
                          <p className="text-xs text-white/70 mt-0.5 line-clamp-2">
                            {r.tipo_trabajo} · {r.cantidad || 1} pza(s) · {r.proyecto_nombre || r.numero_proyecto}
                          </p>
                          {r.descripcion && <p className="text-xs text-white/90 mt-1 line-clamp-2">{r.descripcion}</p>}
                          {r.fotos?.length > 1 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Camera className="w-3 h-3 text-white/50" />
                              <span className="text-[11px] text-white/50">{r.fotos.length} fotos</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  );
}
