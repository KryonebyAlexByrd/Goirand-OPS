import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  verde: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  amarillo: { className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  rojo: { className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  Activo: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Pausado: { className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  Completado: { className: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  Cancelado: { className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  Alta: { className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  Media: { className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  Baja: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

export default function StatusBadge({ status, className: extraClass }) {
  const config = statusConfig[status] || statusConfig.verde;
  return (
    <Badge variant="outline" className={cn("font-medium border gap-1.5", config.className, extraClass)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {status}
    </Badge>
  );
}
