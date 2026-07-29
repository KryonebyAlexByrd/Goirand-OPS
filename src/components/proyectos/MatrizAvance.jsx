import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, CheckCircle2 } from "lucide-react";

const AREAS = ["Contratista", "Corte", "Barniz", "Empaque", "Herraje"];

export default function MatrizAvance({ partidas = [] }) {
  if (!partidas || partidas.length === 0) {
    return (
      <Card className="glass-card-dark border-white/10 mt-6">
        <CardContent className="p-8 text-center text-muted-foreground">
          No hay artículos en este proyecto para mostrar el avance.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-dark border-white/10 mt-8 shadow-2xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-black/20 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <CardTitle className="text-xl font-bold text-white">Matriz de Producción (Avances por Área)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white font-bold py-4 pl-6">Artículo</TableHead>
              <TableHead className="text-center text-white/80 font-bold text-xs uppercase">Meta</TableHead>
              {AREAS.map(area => (
                <TableHead key={area} className="text-center text-white/80 font-bold text-xs uppercase min-w-[90px]">
                  {area}
                </TableHead>
              ))}
              <TableHead className="text-center text-orange-400 font-bold text-xs uppercase">FIN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partidas.map((partida, i) => {
              const total = partida.cantidad_total || 0;
              const globalRealizada = partida.cantidad_realizada || 0;
              const isDone = globalRealizada >= total && total > 0;
              
              return (
                <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      {partida.imagen_url ? (
                        <img src={partida.imagen_url} alt="img" className="w-8 h-8 rounded-md object-cover bg-black/50 border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-black/30 border border-white/5 flex items-center justify-center text-muted-foreground"><Package className="w-3 h-3" /></div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{partida.tipo_trabajo || "Sin nombre"}</p>
                        {partida.codigo && <p className="text-[10px] text-muted-foreground font-mono">{partida.codigo}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white font-bold text-xs">
                      {total}
                    </span>
                  </TableCell>
                  
                  {AREAS.map(area => {
                    const cantArea = (partida.avance_areas && partida.avance_areas[area]) || 0;
                    const isActive = cantArea > 0;
                    const isComplete = cantArea >= total && total > 0;
                    
                    return (
                      <TableCell key={area} className="text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {isActive ? (
                            <div className={`w-3.5 h-3.5 rounded-full ${isComplete ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-emerald-500/50'}`} />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-white/10" />
                          )}
                          {isActive && <span className="text-[10px] font-bold text-white/70">{cantArea}</span>}
                        </div>
                      </TableCell>
                    );
                  })}
                  
                  <TableCell className="text-center border-l border-white/5 bg-white/[0.02]">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      {isDone ? (
                        <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.9)] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      )}
                      {globalRealizada > 0 && !isDone && <span className="text-[10px] font-bold text-white/50">{globalRealizada}</span>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
