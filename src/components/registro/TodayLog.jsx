import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Camera, Package } from "lucide-react";

export default function TodayLog({ registros }) {
  const hoy = format(new Date(), "yyyy-MM-dd");
  const registrosHoy = registros
    .filter(r => r.fecha === hoy)
    .sort((a, b) => (b.hora_registro || "").localeCompare(a.hora_registro || ""));

  return (
    <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
          <Clock className="w-4 h-4 text-orange-500" />
          Registros de Hoy — {format(new Date(), "dd 'de' MMMM", { locale: es })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {registrosHoy.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay registros para hoy aún</p>
        ) : (
          <div className="space-y-3">
            {registrosHoy.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors shadow-lg">
                {r.fotos?.length > 0 ? (
                  <img src={r.fotos[0]} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-orange-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{r.trabajador_nombre}</span>
                    <span className="text-xs text-white/50">· {r.hora_registro}</span>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    {r.tipo_trabajo} · {r.cantidad || 1} pza(s) · {r.proyecto_nombre || r.numero_proyecto}
                  </p>
                  {r.descripcion && <p className="text-xs text-white/90 mt-1">{r.descripcion}</p>}
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
        )}
      </CardContent>
    </Card>
  );
}
