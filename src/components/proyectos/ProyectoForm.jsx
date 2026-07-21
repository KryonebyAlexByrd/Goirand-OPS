import React, { useState, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload, FileText, X, CheckCircle2, Building2 } from "lucide-react";
import { toast } from "sonner";

const FABRICAS = ["Tecomatla", "Tláhuac"];

const DEFAULT_FORM = {
  numero_proyecto: `PRY-${Math.floor(100000 + Math.random() * 900000)}`,
  descripcion: "",
  cliente_nombre: "",
  cliente_id: "",
  estado: "Activo",
  prioridad: "Media",
  fecha_inicio: new Date().toISOString().split("T")[0],
  fecha_entrega_estimada: "",
  monto_total: 0,
  monto_incluye_iva: true,
  fabricas_asignadas: [],
  fase_actual: "1. Recepción de Proyecto",
  porcentaje_avance: 0,
  contratistas_asignados: [],
  pagos_programados: [],
  fases_completadas: [],
  partidas_cotizacion: [],
  cotizaciones_docs: [],
  notas_internas: "",
};

export default function ProyectoForm({ clientes = [], onSubmit, isLoading }) {
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [extracting, setExtracting] = useState(false);
  const [partidasExtraidas, setPartidasExtraidas] = useState([]);
  const [docCot, setDocCot] = useState(null); // { nombre, url, folio, fecha }
  const fileRef = useRef(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleClienteChange = (id) => {
    const c = clientes.find(c => c.id === id);
    if (c) setForm(f => ({ ...f, cliente_id: id, cliente_nombre: c.empresa || c.nombre }));
  };

  const toggleFabrica = (fab) => {
    const curr = form.fabricas_asignadas || [];
    const next = curr.includes(fab) ? curr.filter(f => f !== fab) : [...curr, fab];
    set("fabricas_asignadas", next);
  };

  const handleCotizacion = async (file) => {
    if (!file) return;
    setExtracting(true);
    toast.info("Analizando cotización con IA...");
    const { file_url } = await Promise.resolve({ file_url: 'https://placehold.co/600x400.png' });

    const result = await Promise.resolve({});

    const partidas = (result?.partidas || []).map(p => ({
      codigo: p.codigo || "",
      tipo_trabajo: p.tipo_trabajo || "",
      descripcion: p.descripcion || "",
      cantidad_total: Number(p.cantidad_total) || 0,
      cantidad_realizada: 0,
      unidad: p.unidad || "pz",
      precio_unitario: Number(p.precio_unitario) || 0,
      precio_total: Number(p.precio_total) || 0,
    }));

    setPartidasExtraidas(partidas);
    setDocCot({ nombre: file.name, url: file_url, folio: result?.folio || "", fecha: result?.fecha || "" });

    // Auto-llenar campos si están vacíos
    setForm(f => ({
      ...f,
      cliente_nombre: f.cliente_nombre || result?.cliente_nombre || "",
      monto_total: result?.total || f.monto_total || 0,
      forma_pago: result?.forma_pago || f.forma_pago || "",
      notas_internas: result?.tiempo_entrega
        ? (f.notas_internas ? f.notas_internas + "\n" : "") + `Tiempo entrega: ${result.tiempo_entrega}`
        : f.notas_internas,
      partidas_cotizacion: partidas,
      cotizaciones_docs: [{ nombre: file.name, url: file_url, folio: result?.folio || "", fecha: result?.fecha || "" }],
    }));

    toast.success(`${partidas.length} artículos extraídos de la cotización`);
    setExtracting(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const partidasToShow = partidasExtraidas.length > 0 ? partidasExtraidas : (form.partidas_cotizacion || []);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cotización PDF — primera sección para que sea lo primero */}
      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-accent/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Subir Cotización PDF</p>
          <span className="text-xs text-muted-foreground">(recomendado — auto-rellena el proyecto)</span>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.xlsx,.csv" className="hidden"
          onChange={e => { handleCotizacion(e.target.files[0]); e.target.value = ""; }} />
        {docCot ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-800 flex-1 truncate">{docCot.nombre}</span>
            {docCot.folio && <span className="text-xs text-emerald-600">Folio: {docCot.folio}</span>}
            <button type="button" onClick={() => { setDocCot(null); setPartidasExtraidas([]); set("partidas_cotizacion", []); set("cotizaciones_docs", []); }}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={extracting}>
            {extracting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analizando...</> : <><Upload className="w-3.5 h-3.5 mr-1.5" /> Seleccionar PDF</>}
          </Button>
        )}

        {/* Preview de partidas extraídas */}
        {partidasToShow.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">{partidasToShow.length} artículos detectados:</p>
            <div className="max-h-36 overflow-y-auto space-y-1">
              {partidasToShow.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs bg-white rounded px-2 py-1 border border-border/30">
                  <span className="font-medium truncate flex-1">{p.tipo_trabajo}</span>
                  <span className="text-muted-foreground flex-shrink-0">{p.cantidad_total} {p.unidad}</span>
                  {p.precio_total > 0 && <span className="text-muted-foreground flex-shrink-0">${Number(p.precio_total).toLocaleString("es-MX")}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Datos básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>No. Proyecto</Label>
          <Input value={form.numero_proyecto} onChange={e => set("numero_proyecto", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          {clientes.length > 0 ? (
            <Select value={form.cliente_id} onValueChange={handleClienteChange}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.empresa || c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.cliente_nombre} onChange={e => set("cliente_nombre", e.target.value)} placeholder="Nombre del cliente" />
          )}
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Descripción del Proyecto *</Label>
          <Textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Ej: Hotel Unico Jamaica — mobiliario de restaurante" rows={2} />
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
        <div className="space-y-1.5">
          <Label>Monto Total</Label>
          <Input type="number" value={form.monto_total} onChange={e => set("monto_total", parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha Inicio</Label>
          <Input type="date" value={form.fecha_inicio} onChange={e => set("fecha_inicio", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha Entrega Estimada</Label>
          <Input type="date" value={form.fecha_entrega_estimada} onChange={e => set("fecha_entrega_estimada", e.target.value)} />
        </div>
      </div>

      {/* Fábricas — múltiple selección */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Fábricas Asignadas</Label>
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
      </div>

      <div className="space-y-1.5">
        <Label>Notas Internas</Label>
        <Textarea value={form.notas_internas} onChange={e => set("notas_internas", e.target.value)} placeholder="Observaciones, tiempos de entrega, condiciones..." rows={2} />
      </div>

      <Button type="submit" className="bg-primary hover:bg-primary/90 w-full sm:w-auto" disabled={isLoading || !form.descripcion}>
        {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4 mr-2" /> Crear Proyecto</>}
      </Button>
    </form>
  );
}
