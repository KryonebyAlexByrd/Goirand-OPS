import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Camera, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function RecentActivity({ registros }) {
  const recientes = [...registros]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  return (
    <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-base font-semibold text-white">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        {recientes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin actividad registrada</p>
        ) : (
          <div className="space-y-3">
            {recientes.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-2 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  {r.fotos?.length > 0 ? (
                    <Camera className="w-4 h-4 text-primary" />
                  ) : (
                    <ClipboardList className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.trabajador_nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.tipo_trabajo} · {r.cantidad || 1} pza(s) · {r.proyecto_nombre || r.numero_proyecto}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {r.hora_registro || (r.created_date ? format(new Date(r.created_date), "HH:mm", { locale: es }) : "")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
