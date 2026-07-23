import React, { useState, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload, FileText, X, CheckCircle2, Building2 } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { toast } from "sonner";

// Configuramos el worker de pdfjs a través de un CDN público para evitar problemas de build en Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
    toast.info("Analizando archivo localmente...");
    
    // Objeto URL falso para la preview en UI
    const file_url = URL.createObjectURL(file);
    let partidas = [];
    let totalMonto = 0;
    
    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        // PARSEO DE EXCEL / CSV
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Leer como array de arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        for (let row of jsonData) {
          if (!row || row.length < 4) continue;
          let clave = "";
          let descripcion = "";
          let cant = 0;
          let pu = 0;
          let pt = 0;
          
          for (let i = 0; i < row.length; i++) {
             let cell = row[i];
             if (cell == null || cell === "") continue;
             if (typeof cell === 'string') {
               // Buscamos patrones de claves tipo BR-201, C-10, etc.
               if (cell.match(/^[A-Z]{2,4}-\d+(?:\.\d+)?$/i)) clave = cell.trim();
               else if (cell.length > 10 && !descripcion && !cell.toLowerCase().includes('total')) descripcion = cell.trim();
             }
             if (typeof cell === 'number') {
               if (cell > 0 && cell < 1000 && cant === 0) cant = cell;
               else if (cell > 100 && pt === 0 && pu > 0) pt = cell; // Segundo numero grande
               else if (cell > 100 && pu === 0) pu = cell; // Primer numero grande
             }
          }
          
          if (clave && descripcion) {
             const finalCant = cant || 1;
             const finalPt = pt || (pu * finalCant) || 0;
             partidas.push({
               codigo: clave,
               tipo_trabajo: descripcion.split('\n')[0].substring(0, 50).trim(), // Usar un pedazo de la descripción como tipo corto
               descripcion: descripcion,
               cantidad_total: finalCant,
               cantidad_realizada: 0,
               unidad: "pz",
               precio_unitario: pu || 0,
               precio_total: finalPt
             });
             totalMonto += finalPt;
          }
        }
      } else if (file.type === 'application/pdf') {
        // PARSEO DE PDF MEDIANTE PATRONES EXACTOS (HEURÍSTICA)
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const strings = textContent.items.map(item => item.str);
          fullText += strings.join(" ") + " \n ";
        }
        
        // Regex para buscar el patrón: CLAVE DESCRIPCION CANTIDAD $ P.U. $ P.T.
        // Ej: BR-201 Sofá ... 12 $ 102,850.00 $ 1,234,200.00
        const regex = /([A-Z]{2,4}-\d+(?:\.\d+)?)\s+([\s\S]+?)\s+(\d+)\s+\$\s+([\d,.]+)\s+\$\s+([\d,.]+)/g;
        let match;
        
        while ((match = regex.exec(fullText)) !== null) {
           const clave = match[1].trim();
           const descripcionBruta = match[2].trim();
           const cant = parseInt(match[3], 10);
           const pu = parseFloat(match[4].replace(/,/g, ''));
           const pt = parseFloat(match[5].replace(/,/g, ''));
           
           // Limpiamos la descripción (tomamos la primera línea limpia o un pedazo como título)
           const lineasDesc = descripcionBruta.split('\n').map(l => l.trim()).filter(l => l);
           let tipoTrabajo = clave;
           let descCorta = descripcionBruta;
           
           if (lineasDesc.length > 0) {
             // A veces la primera línea es la descripción corta
             tipoTrabajo = lineasDesc[0].substring(0, 40).trim();
             // Si el tipo quedó muy genérico, usamos la clave
             if (tipoTrabajo.length < 3) tipoTrabajo = clave;
           }
           
           partidas.push({
             codigo: clave,
             tipo_trabajo: tipoTrabajo,
             descripcion: descCorta,
             cantidad_total: cant,
             cantidad_realizada: 0,
             unidad: "pz",
             precio_unitario: pu,
             precio_total: pt
           });
           totalMonto += pt;
        }
      }
      
      if (partidas.length === 0) {
        toast.warning("No se encontraron piezas que coincidan con el formato (Clave, Cantidad, Precio)");
      } else {
        setPartidasExtraidas(partidas);
        setDocCot({ nombre: file.name, url: file_url, folio: "", fecha: new Date().toISOString() });
        
        setForm(f => ({
          ...f,
          monto_total: totalMonto > 0 ? totalMonto : f.monto_total,
          partidas_cotizacion: partidas,
          cotizaciones_docs: [{ nombre: file.name, url: file_url, folio: "", fecha: new Date().toISOString() }],
        }));
        
        toast.success(`${partidas.length} artículos extraídos del archivo`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error leyendo el archivo. Intenta con un formato diferente.");
    }
    
    setExtracting(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalForm = { ...form };
    delete finalForm.cotizaciones_docs; // Evitar que rompa Supabase ya que no existe en el esquema
    delete finalForm.cliente_telefono;
    delete finalForm.cliente_email;
    delete finalForm.monto_pagado;
    onSubmit(finalForm);
  };

  const partidasToShow = partidasExtraidas.length > 0 ? partidasExtraidas : (form.partidas_cotizacion || []);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cotización CSV/Excel — primera sección para que sea lo primero */}
      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-accent/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Subir Cotización Excel/CSV</p>
          <span className="text-xs text-muted-foreground">(recomendado — auto-rellena el proyecto)</span>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden"
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
            {extracting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analizando...</> : <><Upload className="w-3.5 h-3.5 mr-1.5" /> Seleccionar Archivo</>}
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
