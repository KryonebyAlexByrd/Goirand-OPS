import React, { useState } from "react";
import { generateReporteObservaciones } from "@/lib/ai";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

function getHighlightStyles(percent) {
  if (percent === 0) return "border-transparent text-white/50 bg-white/5";
  if (percent > 0 && percent < 20) return "border-gray-500 text-gray-300 bg-transparent";
  if (percent >= 20 && percent < 40) return "border-yellow-500 text-yellow-300 bg-transparent";
  if (percent >= 40 && percent < 70) return "border-blue-500 text-blue-300 bg-transparent";
  if (percent >= 70 && percent < 100) return "border-emerald-500 text-emerald-300 bg-transparent";
  if (percent >= 100) return "border-emerald-500 text-emerald-950 bg-emerald-500";
  return "border-transparent";
}

function ProyectoStatusCard({ proyecto, registros }) {
  const piezasCotizadas = Array.isArray(proyecto.partidas_cotizacion) ? proyecto.partidas_cotizacion : [];
  
  let fasesArray = [];
  let totalPiezasProyecto = 0;
  let totalTrabajadas = 0;

  if (piezasCotizadas.length > 0) {
    totalPiezasProyecto = piezasCotizadas.reduce((acc, part) => acc + (Number(part.cantidad_total) || 0), 0);
    totalTrabajadas = piezasCotizadas.reduce((acc, part) => acc + (Number(part.cantidad_realizada) || 0), 0);

    fasesArray = piezasCotizadas.map(partida => {
      const tipo = partida.tipo_trabajo || 'General';
      const meta = Number(partida.cantidad_total) || 0;
      const hecho = Number(partida.cantidad_realizada) || 0;
      let percent = meta > 0 ? (hecho / meta) * 100 : (hecho > 0 ? 100 : 0);
      if (percent > 100) percent = 100;
      return { nombre: tipo, percent };
    });
  } else {
    // Si no hay partidas definidas en el proyecto, extraemos de los registros
    const registrosProyecto = registros.filter(r => r.proyecto_id === proyecto.id);
    totalTrabajadas = registrosProyecto.reduce((acc, r) => acc + (Number(r.cantidad) || 0), 0);
    totalPiezasProyecto = totalTrabajadas; // Sin meta definida

    const tiposTrabajo = {};
    registrosProyecto.forEach(r => {
      const t = r.tipo_trabajo || 'General';
      if (!tiposTrabajo[t]) tiposTrabajo[t] = { trabajadas: 0 };
      tiposTrabajo[t].trabajadas += (Number(r.cantidad) || 0);
    });
    
    fasesArray = Object.keys(tiposTrabajo).map(tipo => {
      return { nombre: tipo, percent: 100 };
    });
  }

  let progresoGlobal = totalPiezasProyecto > 0 ? (totalTrabajadas / totalPiezasProyecto) * 100 : 0;
  if (progresoGlobal > 100) progresoGlobal = 100;
  
  fasesArray.sort((a, b) => b.percent - a.percent);

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden mb-4 last:mb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{proyecto.numero_proyecto} - {proyecto.descripcion}</h3>
          <p className="text-sm text-white/50">{proyecto.cliente_nombre}</p>
        </div>
        <div className="text-right mt-2 sm:mt-0">
          <p className="text-2xl font-black text-white">{Math.round(progresoGlobal)}%</p>
          <p className="text-xs text-white/50">{totalTrabajadas} / {totalPiezasProyecto} piezas</p>
        </div>
      </div>
      
      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${progresoGlobal}%` }}></div>
      </div>
      
      <div>
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Avance por Tipo de Trabajo</p>
        <div className="flex flex-wrap gap-3">
          {fasesArray.length > 0 ? fasesArray.map(fase => (
            <div key={fase.nombre} className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all ${getHighlightStyles(fase.percent)}`}>
              {fase.nombre} {fase.percent === 100 && <CheckCircle2 className="w-3 h-3 inline-block ml-1" />}
            </div>
          )) : (
            <span className="text-xs text-white/30">Sin registros de trabajo aún</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReporteObservaciones({ registros, proyectos, periodo }) {
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const activos = proyectos.filter(p => p.estado === "Activo");

  const generarObservaciones = async () => {
    setLoading(true);
    const resumen = registros.map(r => `${r.trabajador_nombre}: ${r.tipo_trabajo} x${r.cantidad || 1} — ${r.proyecto_nombre || ""}`).join("\n");

    const proyectosInfo = activos.map(p => {
      const diasRestantes = p.fecha_entrega_estimada
        ? Math.ceil((new Date(p.fecha_entrega_estimada) - new Date()) / (1000 * 60 * 60 * 24))
        : null;
      const partidas = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
      const totalTotal = partidas.reduce((s, pt) => s + (pt.cantidad_total || 0), 0);
      const totalHecho = partidas.reduce((s, pt) => s + (pt.cantidad_realizada || 0), 0);
      const totalRestante = Math.max(0, totalTotal - totalHecho);
      const porDia = diasRestantes > 0 && totalRestante > 0 ? Math.ceil(totalRestante / diasRestantes) : null;

      const partidasStr = partidas.length > 0
        ? partidas.map(pt => `  - ${pt.tipo_trabajo}: ${pt.cantidad_realizada || 0}/${pt.cantidad_total || 0} ${pt.unidad || "pz"}(s) realizadas`).join("\n")
        : "  Sin partidas definidas";

      return `Proyecto ${p.numero_proyecto}: ${p.descripcion}
  Cliente: ${p.cliente_nombre || "—"}
  Estado: ${p.estado} | Entrega en: ${diasRestantes ?? "sin fecha"} días
  Avance: ${p.porcentaje_avance || 0}% | Fase: ${p.fase_actual || "N/A"}
  Total cotizado: ${totalTotal} pzs | Realizado: ${totalHecho} | Restante: ${totalRestante}
  Ritmo necesario: ${porDia ? `${porDia} pzs/día` : "N/A"}
  Partidas:\n${partidasStr}`;
    }).join("\n\n");

    try {
      const result = await generateReporteObservaciones(periodo, resumen + "\n\nESTADO DE PROYECTOS:\n" + proyectosInfo);
      setObservaciones(result);
    } catch (err) {
      setObservaciones("Error al generar el reporte. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border/60 mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-bold">
            Estado de Proyectos y Observaciones
          </CardTitle>
          <Button variant="outline" size="sm" onClick={generarObservaciones} disabled={loading}>
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
              : <>Generar con IA</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activos.length > 0 && (
          <div className="mb-4">
            <div className="mt-4">
              {activos.map(p => <ProyectoStatusCard key={p.id} proyecto={p} registros={registros} />)}
            </div>
          </div>
        )}

        {/* AI observations */}
        {observaciones ? (
          <div className="border-t border-border/40 pt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                Análisis IA
              </p>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(observaciones)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Compartir por WhatsApp
              </a>
            </div>
            <div className="prose prose-sm max-w-none text-foreground
              [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-primary [&>h2]:mt-6 [&>h2]:mb-2 [&>h2]:pb-1 [&>h2]:border-b [&>h2]:border-border/40
              [&>h3]:text-base [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:mt-4 [&>h3]:mb-1.5
              [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-3 [&>p]:text-foreground/90
              [&>ul]:mb-3 [&>ul]:space-y-1 [&>ul>li]:text-sm [&>ul>li]:leading-relaxed [&>ul>li]:text-foreground/90
              [&>ol]:mb-3 [&>ol]:space-y-1 [&>ol>li]:text-sm [&>ol>li]:leading-relaxed
              [&>strong]:font-semibold [&>strong]:text-foreground
              [&>blockquote]:border-l-4 [&>blockquote]:border-primary/40 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-muted-foreground [&>blockquote]:my-3
            ">
              <ReactMarkdown>{observaciones}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center pt-2 pb-1">
            Haz clic en "Generar con IA" para un análisis inteligente del reporte
          </p>
        )}
      </CardContent>
    </Card>
  );
}
