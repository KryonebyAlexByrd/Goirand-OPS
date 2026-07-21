import React, { useState, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Save, Upload, FileText, Plus, Trash2, CheckCircle2, AlertTriangle, Clock, Building2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const FABRICAS = ["Tecomatla", "Tláhuac"];

const formatMoney = (v) => v ? `$${Number(v).toLocaleString("es-MX")}` : "—";

function PartidaRow({ p }) {
  const restante = Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0));
  const pct = p.cantidad_total > 0 ? Math.min(100, Math.round(((p.cantidad_realizada || 0) / p.cantidad_total) * 100)) : 0;
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-border/20 last:border-0">
      <div className="col-span-5 min-w-0">
        <p className="text-xs font-medium truncate">{p.tipo_trabajo}</p>
        {p.descripcion && <p className="text-[10px] text-muted-foreground line-clamp-1">{p.descripcion}</p>}
      </div>
      <div className="col-span-2 text-xs text-center text-muted-foreground">
        <span className="font-semibold text-foreground">{p.cantidad_realizada || 0}</span>/{p.cantidad_total || 0}
      </div>
      <div className="col-span-1 text-xs text-center font-semibold text-amber-600">{restante}</div>
      <div className="col-span-2">
        <Progress value={pct} className="h-1.5" />
        <p className="text-[10px] text-center text-muted-foreground mt-0.5">{pct}%</p>
      </div>
      <div className="col-span-2 text-xs text-right text-muted-foreground">{formatMoney(p.precio_total)}</div>
    </div>
  );
}

export default function ProyectoEditDialog({ proyecto, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...proyecto });
  const [addingCot, setAddingCot] = useState(false);
  const [merging, setMerging] = useState(false);
  const fileRef = useRef(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleFabrica = (fab) => {
    const curr = form.fabricas_asignadas || [];
    const next = curr.includes(fab) ? curr.filter(f => f !== fab) : [...curr, fab];
    set("fabricas_asignadas", next);
  };

  const mutation = useMutation({
    mutationFn: (data) => supabase.from('proyecto').update(data).eq('id', proyecto.id).select().then(res => res.data[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyecto", proyecto.id] });
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      toast.success("Proyecto actualizado");
      onClose();
    },
  });

  // Agregar cotización adicional (merge, no reemplazo)
  const handleAddCotizacion = async (file) => {
    if (!file) return;
    setMerging(true);
    toast.info("Analizando nueva cotización...");
    const { file_url } = await Promise.resolve({ file_url: 'https://placehold.co/600x400.png' });

    const result = await Promise.resolve({});

    const nuevas = (result?.partidas || []).map(p => ({
      codigo: p.codigo || "",
      tipo_trabajo: p.tipo_trabajo || "",
      descripcion: p.descripcion || "",
      cantidad_total: Number(p.cantidad_total) || 0,
      cantidad_realizada: 0,
      unidad: p.unidad || "pz",
      precio_unitario: Number(p.precio_unitario) || 0,
      precio_total: Number(p.precio_total) || 0,
    }));

    // Merge: agrega nuevas sin duplicar (por tipo_trabajo)
    const existentes = form.partidas_cotizacion || [];
    const existentesTipos = existentes.map(e => e.tipo_trabajo.toLowerCase().trim());
    const sinDuplicados = nuevas.filter(n => !existentesTipos.includes(n.tipo_trabajo.toLowerCase().trim()));
    const mergeadas = [...existentes, ...sinDuplicados];

    // Agrega el doc a la lista de cotizaciones
    const docsExistentes = form.cotizaciones_docs || [];
    const nuevoDoc = { nombre: file.name, url: file_url, folio: result?.folio || "", fecha: result?.fecha || "" };

    setForm(f => ({
      ...f,
      partidas_cotizacion: mergeadas,
      cotizaciones_docs: [...docsExistentes, nuevoDoc],
      monto_total: (f.monto_total || 0) + (result?.total || 0),
    }));

    toast.success(`${sinDuplicados.length} nuevos artículos añadidos (${nuevas.length - sinDuplicados.length} ya existían)`);
    setMerging(false);
    setAddingCot(false);
  };

  const partidas = form.partidas_cotizacion || [];
  const totalPiezas = partidas.reduce((s, p) => s + (p.cantidad_total || 0), 0);
  const totalHecho = partidas.reduce((s, p) => s + (p.cantidad_realizada || 0), 0);
  const totalRestante = Math.max(0, totalPiezas - totalHecho);
  const pctGlobal = totalPiezas > 0 ? Math.min(100, Math.round((totalHecho / totalPiezas) * 100)) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Proyecto — {proyecto.numero_proyecto}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-5 mt-1">

          {/* ── Identificación ── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Identificación</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>No. Proyecto</Label>
                <Input value={form.numero_proyecto || ""} onChange={e => set("numero_proyecto", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => set("estado", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Activo", "Pausado", "Completado", "Cancelado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Descripción *</Label>
                <Textarea value={form.descripcion || ""} onChange={e => set("descripcion", e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={form.cliente_nombre || ""} onChange={e => set("cliente_nombre", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select value={form.prioridad} onValueChange={v => set("prioridad", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Alta", "Media", "Baja"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ── Fábricas ── */}
          <section className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Fábricas Asignadas
            </p>
            <div className="flex gap-2">
              {FABRICAS.map(fab => {
                const active = (form.fabricas_asignadas || []).includes(fab);
                return (
                  <button key={fab} type="button" onClick={() => toggleFabrica(fab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${active ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary/50"}`}>
                    {fab}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Fechas ── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fechas</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha Inicio</Label>
                <Input type="date" value={form.fecha_inicio || ""} onChange={e => set("fecha_inicio", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Entrega Estimada</Label>
                <Input type="date" value={form.fecha_entrega_estimada || ""} onChange={e => set("fecha_entrega_estimada", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Entrega Real</Label>
                <Input type="date" value={form.fecha_entrega_real || ""} onChange={e => set("fecha_entrega_real", e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── Avance ── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Avance</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>% Avance (0–100)</Label>
                <Input type="number" min={0} max={100} value={form.porcentaje_avance || 0}
                  onFocus={e => e.target.select()}
                  onChange={e => set("porcentaje_avance", Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fase Actual</Label>
                <Input value={form.fase_actual || ""} onChange={e => set("fase_actual", e.target.value)} placeholder="Ej: 3. Armado" />
              </div>
            </div>
          </section>

          {/* ── Financiero ── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Financiero</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto Total</Label>
                <Input type="number" min={0} value={form.monto_total || 0} onFocus={e => e.target.select()}
                  onChange={e => set("monto_total", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Anticipo Recibido</Label>
                <Input type="number" min={0} value={form.anticipo_recibido || 0} onFocus={e => e.target.select()}
                  onChange={e => set("anticipo_recibido", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Forma de Pago</Label>
                <Input value={form.forma_pago || ""} onChange={e => set("forma_pago", e.target.value)} placeholder="Ej: 60% anticipo, 40% contra entrega" />
              </div>
            </div>
          </section>

          {/* ── Cotizaciones documentos ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Cotizaciones
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => setAddingCot(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar cotización
              </Button>
            </div>

            {/* Input oculto para nueva cotización */}
            <input ref={fileRef} type="file" accept=".pdf,.xlsx,.csv" className="hidden"
              onChange={e => { handleAddCotizacion(e.target.files[0]); e.target.value = ""; }} />

            {addingCot && (
              <div className="rounded-xl border-2 border-dashed border-primary/30 bg-accent/20 p-4 space-y-2">
                <p className="text-sm font-medium">Selecciona el PDF de la nueva cotización para agregarla al proyecto</p>
                <p className="text-xs text-muted-foreground">Los artículos nuevos se añadirán sin borrar los existentes</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => fileRef.current?.click()} disabled={merging}>
                    {merging ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Analizando...</> : <><Upload className="w-3.5 h-3.5 mr-1" /> Seleccionar PDF</>}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAddingCot(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Lista de docs existentes */}
            {(form.cotizaciones_docs || []).length > 0 && (
              <div className="space-y-1">
                {(form.cotizaciones_docs || []).map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate">{doc.nombre}</span>
                    {doc.folio && <span className="text-muted-foreground">Folio: {doc.folio}</span>}
                    {doc.fecha && <span className="text-muted-foreground">{doc.fecha}</span>}
                    {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-primary" /></a>}
                    <button type="button" onClick={() => {
                      const docs = (form.cotizaciones_docs || []).filter((_, j) => j !== i);
                      set("cotizaciones_docs", docs);
                    }}><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Pedido Total (partidas) ── */}
          {partidas.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Contenido del Pedido ({partidas.length} artículos)</p>

              {/* Totales rápidos */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-muted/30 rounded-xl p-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Cotizado</p>
                  <p className="text-sm font-bold">{totalPiezas} pz</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2">
                  <p className="text-[10px] text-emerald-600 uppercase">Realizado</p>
                  <p className="text-sm font-bold text-emerald-700">{totalHecho} pz</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-2">
                  <p className="text-[10px] text-amber-600 uppercase">Restante</p>
                  <p className="text-sm font-bold text-amber-700">{totalRestante} pz</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Avance</p>
                  <p className="text-sm font-bold">{pctGlobal}%</p>
                </div>
              </div>
              <Progress value={pctGlobal} className="h-2" />

              {/* Tabla de partidas */}
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase">
                  <div className="col-span-5">Artículo</div>
                  <div className="col-span-2 text-center">Hecho/Total</div>
                  <div className="col-span-1 text-center">Resto</div>
                  <div className="col-span-2">Avance</div>
                  <div className="col-span-2 text-right">Valor</div>
                </div>
                <div className="px-3 max-h-52 overflow-y-auto">
                  {partidas.map((p, i) => <PartidaRow key={i} p={p} />)}
                </div>
              </div>
            </section>
          )}

          {/* ── Notas ── */}
          <div className="space-y-1.5">
            <Label>Notas Internas</Label>
            <Textarea value={form.notas_internas || ""} onChange={e => set("notas_internas", e.target.value)} rows={3} placeholder="Observaciones..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={mutation.isPending || !form.descripcion} className="bg-primary hover:bg-primary/90">
              {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
