import React, { useState, useRef } from "react";
import { parseCotizacion } from "@/lib/ai";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Save, Pencil, Clock, AlertTriangle, CheckCircle2, Upload, Loader2, FileText, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

function getPartidaStatus(partida, diasRestantes) {
  const restante = (partida.cantidad_total || 0) - (partida.cantidad_realizada || 0);
  if (restante <= 0) return "completado";
  if (diasRestantes === null) return "sin-fecha";
  if (diasRestantes < 0) return "vencido";
  const porDia = diasRestantes > 0 ? restante / diasRestantes : Infinity;
  if (porDia > 10) return "riesgo";
  return "ok";
}

const statusConfig = {
  completado: { label: "Completo", className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  ok: { label: "En tiempo", className: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  riesgo: { label: "En riesgo", className: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertTriangle },
  vencido: { label: "Vencido", className: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
  "sin-fecha": { label: "Sin fecha", className: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
};

const formatMoney = (v) => v ? `$${Number(v).toLocaleString("es-MX")}` : "—";

// ── Mobile card (read-only) ──────────────────────────────────────────────────
function PartidaMobileCard({ partida, diasRestantes }) {
  const restante = Math.max(0, (partida.cantidad_total || 0) - (partida.cantidad_realizada || 0));
  const pct = partida.cantidad_total > 0 ? Math.min(100, Math.round(((partida.cantidad_realizada || 0) / partida.cantidad_total) * 100)) : 0;
  const porDia = diasRestantes > 0 && restante > 0 ? Math.ceil(restante / diasRestantes) : null;
  const status = getPartidaStatus(partida, diasRestantes);
  const Cfg = statusConfig[status];
  const Icon = Cfg.icon;

  return (
    <div className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {partida.codigo && <p className="text-[10px] text-muted-foreground font-mono">{partida.codigo}</p>}
          <p className="text-sm font-semibold leading-snug">{partida.tipo_trabajo}</p>
          {partida.descripcion && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{partida.descripcion}</p>}
        </div>
        <Badge className={`text-[10px] shrink-0 flex items-center gap-0.5 ${Cfg.className}`}>
          <Icon className="w-2.5 h-2.5" />
          {porDia !== null && restante > 0 ? `${porDia}/día` : Cfg.label}
        </Badge>
      </div>
      <Progress value={pct} className="h-1.5" />
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{partida.cantidad_realizada || 0}</span>
          {" / "}{partida.cantidad_total || 0} {partida.unidad || "pz"}
        </span>
        <span className="text-amber-600 font-semibold">{restante} restante</span>
        {partida.precio_total && <span className="text-muted-foreground">{formatMoney(partida.precio_total)}</span>}
      </div>
    </div>
  );
}

// ── Desktop row (read-only) ──────────────────────────────────────────────────
function PartidaDesktopRow({ partida, diasRestantes }) {
  const restante = Math.max(0, (partida.cantidad_total || 0) - (partida.cantidad_realizada || 0));
  const pct = partida.cantidad_total > 0 ? Math.min(100, Math.round(((partida.cantidad_realizada || 0) / partida.cantidad_total) * 100)) : 0;
  const porDia = diasRestantes > 0 && restante > 0 ? Math.ceil(restante / diasRestantes) : null;
  const status = getPartidaStatus(partida, diasRestantes);
  const Cfg = statusConfig[status];
  const Icon = Cfg.icon;

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2.5 border-b border-border/30 last:border-0">
      <div className="col-span-4 min-w-0">
        {partida.codigo && <p className="text-[10px] text-muted-foreground font-mono">{partida.codigo}</p>}
        <p className="text-sm font-medium truncate">{partida.tipo_trabajo}</p>
        {partida.descripcion && <p className="text-[10px] text-muted-foreground line-clamp-1">{partida.descripcion}</p>}
      </div>
      <div className="col-span-2 text-xs text-center text-muted-foreground">
        {partida.cantidad_realizada || 0} / {partida.cantidad_total || 0} {partida.unidad || "pz"}
      </div>
      <div className="col-span-1 text-xs text-center font-semibold text-amber-600">{restante}</div>
      <div className="col-span-2">
        <Progress value={pct} className="h-2" />
        <p className="text-[10px] text-center text-muted-foreground mt-0.5">{pct}%</p>
      </div>
      <div className="col-span-2 text-xs text-center text-muted-foreground">{formatMoney(partida.precio_total)}</div>
      <div className="col-span-1 flex items-center justify-end">
        <Badge className={`text-[10px] ${Cfg.className} flex items-center gap-0.5`}>
          <Icon className="w-2.5 h-2.5" />
          {porDia !== null && restante > 0 ? `${porDia}/día` : Cfg.label}
        </Badge>
      </div>
    </div>
  );
}

// ── Edit row ─────────────────────────────────────────────────────────────────
function PartidaEditRow({ partida, onChange, onDelete }) {
  return (
    <div className="grid grid-cols-12 gap-1.5 items-center py-2 border-b border-border/30 last:border-0">
      <div className="col-span-12 sm:col-span-1">
        <Input value={partida.codigo || ""} onChange={e => onChange({ ...partida, codigo: e.target.value })} placeholder="Código" className="h-7 text-xs" />
      </div>
      <div className="col-span-12 sm:col-span-3">
        <Input value={partida.tipo_trabajo} onChange={e => onChange({ ...partida, tipo_trabajo: e.target.value })} placeholder="Descripción / tipo" className="h-7 text-xs" />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <Input type="number" min={0} value={partida.cantidad_total || ""} onFocus={e => e.target.select()} onChange={e => onChange({ ...partida, cantidad_total: parseFloat(e.target.value) || 0 })} placeholder="Total" className="h-7 text-xs text-center" />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <Input type="number" min={0} value={partida.cantidad_realizada || ""} onFocus={e => e.target.select()} onChange={e => onChange({ ...partida, cantidad_realizada: parseFloat(e.target.value) || 0 })} placeholder="Hecho" className="h-7 text-xs text-center" />
      </div>
      <div className="col-span-3 sm:col-span-1">
        <Input value={partida.unidad || ""} onChange={e => onChange({ ...partida, unidad: e.target.value })} placeholder="pz" className="h-7 text-xs text-center" />
      </div>
      <div className="col-span-5 sm:col-span-2">
        <Input type="number" min={0} value={partida.precio_unitario || ""} onFocus={e => e.target.select()} onChange={e => onChange({ ...partida, precio_unitario: parseFloat(e.target.value) || 0, precio_total: (parseFloat(e.target.value) || 0) * (partida.cantidad_total || 0) })} placeholder="P.U." className="h-7 text-xs text-center" />
      </div>
      <div className="col-span-1 flex justify-end">
        <button onClick={onDelete} className="text-destructive hover:text-destructive/70 transition-colors p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PartidasCotizacion({ proyecto, isAdmin }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [partidas, setPartidas] = useState(
    Array.isArray(proyecto.partidas_cotizacion) ? proyecto.partidas_cotizacion : []
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const diasRestantes = proyecto.fecha_entrega_estimada
    ? differenceInDays(parseISO(proyecto.fecha_entrega_estimada), new Date())
    : null;

  const mutation = useMutation({
    mutationFn: (data) => supabase.from('proyecto').update({ partidas_cotizacion: data }).eq('id', proyecto.id).select().then(res => res.data[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto", proyecto.id] });
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      setEditing(false);
      toast.success("Pedido total guardado");
    },
  });

  const addPartida = () => {
    setPartidas(p => [...p, { codigo: "", tipo_trabajo: "", descripcion: "", cantidad_total: 0, cantidad_realizada: 0, unidad: "pz", precio_unitario: 0, precio_total: 0 }]);
    setEditing(true);
  };

  const updatePartida = (idx, val) => setPartidas(p => p.map((x, i) => i === idx ? val : x));
  const deletePartida = (idx) => setPartidas(p => p.filter((_, i) => i !== idx));
  const handleSave = () => mutation.mutate(partidas);
  const handleCancel = () => {
    setPartidas(Array.isArray(proyecto.partidas_cotizacion) ? proyecto.partidas_cotizacion : []);
    setEditing(false);
  };

  // ── File upload + AI extraction ──────────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    toast.info("Analizando archivo con IA Gemini...");

    try {
      const result = await parseCotizacion(file);
      const extracted = result?.partidas || [];
    if (extracted.length === 0) {
      toast.error("No se encontraron partidas en el archivo");
      setUploading(false);
      return;
    }

    const nuevas = extracted.map(p => ({
      codigo: p.codigo || "",
      tipo_trabajo: p.tipo_trabajo || "",
      descripcion: p.descripcion || "",
      cantidad_total: Number(p.cantidad_total) || 0,
      cantidad_realizada: 0,
      unidad: p.unidad || "pz",
      precio_unitario: Number(p.precio_unitario) || 0,
      precio_total: Number(p.precio_total) || 0,
    }));

    setPartidas(nuevas);
    setEditing(true);
      toast.success(`${nuevas.length} partidas extraídas. Revisa y guarda.`);
    } catch (err) {
      toast.error(err.message || "Error analizando el documento");
    } finally {
      setUploading(false);
    }
  };

  const totalPiezas = partidas.reduce((s, p) => s + (p.cantidad_total || 0), 0);
  const totalHecho = partidas.reduce((s, p) => s + (p.cantidad_realizada || 0), 0);
  const totalRestante = Math.max(0, totalPiezas - totalHecho);
  const totalValor = partidas.reduce((s, p) => s + (p.precio_total || 0), 0);
  const pctGlobal = totalPiezas > 0 ? Math.min(100, Math.round((totalHecho / totalPiezas) * 100)) : 0;

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Pedido Total
            {diasRestantes !== null && (
              <Badge variant="outline" className="text-xs ml-1">
                {diasRestantes > 0 ? `${diasRestantes} días` : diasRestantes === 0 ? "Hoy" : `${Math.abs(diasRestantes)} días vencido`}
              </Badge>
            )}
          </CardTitle>
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Upload button */}
              <input ref={fileRef} type="file" accept=".pdf,.xlsx,.csv" className="hidden" onChange={e => { handleFileUpload(e.target.files[0]); e.target.value = ""; }} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Analizando...</> : <><Upload className="w-3.5 h-3.5 mr-1" /> Subir cotización</>}
              </Button>
              {!editing && partidas.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {partidas.length === 0 && !editing ? (
          <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-medium">Sin partidas registradas</p>
              <p className="text-xs mt-1">Sube un PDF o Excel de cotización para importar automáticamente</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2 justify-center flex-wrap">
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> Subir cotización (PDF/Excel)
                </Button>
                <Button size="sm" onClick={addPartida}><Plus className="w-3.5 h-3.5 mr-1" /> Agregar manualmente</Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── EDIT MODE ── */}
            {editing && (
              <div className="mb-4">
                {/* Edit header — desktop only */}
                <div className="hidden sm:grid grid-cols-12 gap-1.5 mb-1 text-[10px] font-semibold text-muted-foreground uppercase">
                  <div className="col-span-1">Código</div>
                  <div className="col-span-3">Descripción</div>
                  <div className="col-span-2 text-center">Total</div>
                  <div className="col-span-2 text-center">Hecho</div>
                  <div className="col-span-1 text-center">Unidad</div>
                  <div className="col-span-2 text-center">P.U. $</div>
                  <div className="col-span-1" />
                </div>
                <div>
                  {partidas.map((p, idx) => (
                    <PartidaEditRow key={idx} partida={p} onChange={val => updatePartida(idx, val)} onDelete={() => deletePartida(idx)} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={addPartida}><Plus className="w-3.5 h-3.5 mr-1" /> Agregar fila</Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleSave} disabled={mutation.isPending}>
                    {mutation.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Guardando...</> : <><Save className="w-3.5 h-3.5 mr-1" /> Guardar</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancel}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* ── READ MODE ── */}
            {!editing && partidas.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <div className="grid grid-cols-12 gap-2 mb-1 text-[10px] font-semibold text-muted-foreground uppercase">
                    <div className="col-span-4">Artículo</div>
                    <div className="col-span-2 text-center">Hecho / Total</div>
                    <div className="col-span-1 text-center">Resto</div>
                    <div className="col-span-2">Avance</div>
                    <div className="col-span-2 text-center">Valor</div>
                    <div className="col-span-1 text-right">Estado</div>
                  </div>
                  {partidas.map((p, idx) => (
                    <PartidaDesktopRow key={idx} partida={p} diasRestantes={diasRestantes} />
                  ))}
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {partidas.map((p, idx) => (
                    <PartidaMobileCard key={idx} partida={p} diasRestantes={diasRestantes} />
                  ))}
                </div>
              </>
            )}

            {/* ── TOTALS ── */}
            {partidas.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Avance global</span>
                    <span className="text-xs font-bold">{pctGlobal}%</span>
                  </div>
                  <Progress value={pctGlobal} className="h-2" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-muted/30 rounded-xl p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Cotizado</p>
                    <p className="text-base font-bold">{totalPiezas}</p>
                    <p className="text-[10px] text-muted-foreground">piezas</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2">
                    <p className="text-[10px] text-emerald-600 uppercase">Realizado</p>
                    <p className="text-base font-bold text-emerald-700">{totalHecho}</p>
                    <p className="text-[10px] text-emerald-600">piezas</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2">
                    <p className="text-[10px] text-amber-600 uppercase">Restante</p>
                    <p className="text-base font-bold text-amber-700">{totalRestante}</p>
                    <p className="text-[10px] text-amber-600">piezas</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Valor total</p>
                    <p className="text-base font-bold">{totalValor > 0 ? `$${(totalValor/1000).toFixed(0)}k` : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">MXN s/IVA</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
