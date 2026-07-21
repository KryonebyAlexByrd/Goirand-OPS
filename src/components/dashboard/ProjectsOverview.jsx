import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/shared/StatusBadge";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function getTrafficLight(proyecto) {
  if (!proyecto.fecha_entrega_estimada) return "amarillo";
  const hoy = new Date();
  const entrega = new Date(proyecto.fecha_entrega_estimada);
  const diffDays = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));
  const avance = proyecto.porcentaje_avance || 0;
  if (diffDays < 0) return "rojo";
  if (diffDays < 15 && avance < 80) return "rojo";
  if (diffDays < 30 && avance < 60) return "amarillo";
  return "verde";
}

const lightColors = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500"
};

export default function ProjectsOverview({ proyectos }) {
  const activos = proyectos.filter(p => p.estado === "Activo");

  return (
    <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Proyectos Activos</CardTitle>
          <Link to="/proyectos" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No hay proyectos activos</p>
        )}
        {activos.slice(0, 5).map((p) => {
          const light = getTrafficLight(p);
          return (
            <Link key={p.id} to={`/proyectos/${p.id}`} className="block">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className={cn("w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-card", lightColors[light], 
                  light === "rojo" ? "ring-red-200" : light === "amarillo" ? "ring-amber-200" : "ring-emerald-200"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{p.numero_proyecto}</span>
                    <StatusBadge status={p.prioridad} />
                  </div>
                  <p className="text-sm font-medium truncate mt-0.5">{p.descripcion}</p>
                  <p className="text-xs text-muted-foreground">{p.cliente_nombre} · {p.tipo_producto}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{p.porcentaje_avance || 0}%</p>
                  <Progress value={p.porcentaje_avance || 0} className="w-20 h-1.5 mt-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
