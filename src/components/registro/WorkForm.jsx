import React, { useState, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { updateProjectProgress } from "@/utils/projectProgress";

const AREAS = [
  "Contratistas", "Recepción", "Cortado", "Tableros", "Armado",
  "Pulido", "Barnizado", "Empaque", "Entrega", "Otro"
];

const FASES_POR_TIPO = {
  "Silla Beatriz": ["Contratista", "Barniz", "Tapicería"],
  "Poltrona":      ["Contratista", "Barniz", "Tapicería"],
  "Sofás":         ["Contratista", "Barniz", "Tapicería"],
  "Consola":       ["Habilitación", "Armado", "Pulido", "Barniz", "Empaque"],
  "Espejo":        ["Habilitación", "Armado", "Tapicería", "Herraje", "Empaque"],
  "Base de Cama":  ["Habilitación", "Corte", "Armado", "Pulido", "Barniz"],
  "Toallado":      ["Habilitación", "Armado", "Pulido", "Barniz", "Empaque"],
  "Mesa":          ["Contratista", "Armado", "Barniz", "Mármol"],
};
const FASES_DEFAULT = [
  "Habilitación", "Corte", "Armado", "Pulido", "Barniz",
  "Tapicería", "Herrería", "Herraje", "Calidad", "Contratista", "Empaque", "Mármol",
];

function getFases(tipoTrabajo, catalogo = []) {
  const catalogItem = catalogo.find(
    c => c.nombre?.toLowerCase() === (tipoTrabajo || "").toLowerCase()
  );
  if (catalogItem?.fases?.length > 0) return [...catalogItem.fases, "Finalizado"];
  const key = Object.keys(FASES_POR_TIPO).find(
    k => k.toLowerCase() === (tipoTrabajo || "").toLowerCase()
  );
  return [...(key ? FASES_POR_TIPO[key] : FASES_DEFAULT), "Finalizado"];
}

export default function WorkForm({ proyectos, trabajadores, contratistas = [], onSuccess }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [personaType, setPersonaType] = useState("trabajador");
  const [form, setForm] = useState({
    trabajador_id: "",
    trabajador_nombre: "",
    trabajador_libre: "",
    area: "",
    area_custom: "",
    proyecto_id: "",
    proyecto_nombre: "",
    numero_proyecto: "",
    proyecto_libre: "",
    tipo_trabajo: "",
    fase: "",
    fase_custom: "",
    cantidad: 1,
    descripcion: "",
    fotos: [],
    notas: "",
    encargado_nombre: "",
    es_contratista: false,
    contratista_id: "",
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ["catalogo"],
    queryFn: () => supabase.from('catalogo_trabajo').select('*').order('nombre', { ascending: true }).limit(200).then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      let finalProjectId = data.proyecto_id;
      
      // 1. Si no hay ID de proyecto pero el usuario escribió uno libre, lo creamos
      if (!finalProjectId && data.proyecto_libre) {
        const { data: newProy, error: proyError } = await supabase.from('proyecto').insert({
          descripcion: data.proyecto_libre,
          numero_proyecto: "S/N",
          estado: "Activo"
        }).select().single();
        
        if (newProy) {
          finalProjectId = newProy.id;
          data.proyecto_nombre = newProy.descripcion;
        }
      }

      // 2. Si el tipo de trabajo es nuevo (no está en el catálogo), lo agregamos
      if (data.tipo_trabajo && data.tipo_trabajo !== "Otro") {
        const { data: exists } = await supabase.from('catalogo_trabajo')
          .select('id').ilike('nombre', data.tipo_trabajo).maybeSingle();
          
        if (!exists) {
          await supabase.from('catalogo_trabajo').insert({ 
            nombre: data.tipo_trabajo, 
            fases: ["General"] 
          });
        }
      }

      // 3. Insertar el registro final
      const insertData = { 
        ...data, 
        proyecto_id: finalProjectId || null,
        trabajador_id: data.trabajador_id || null,
        contratista_id: data.contratista_id || null
      };
      delete insertData.proyecto_libre;

      const { data: result, error } = await supabase.from('registro_trabajo').insert(insertData).select();
      if (error) throw error;
      
      // Actualizar el progreso del proyecto si está finalizado o es nuevo
      await updateProjectProgress(
        finalProjectId,
        data.tipo_trabajo,
        data.cantidad || 1,
        data.es_finalizado || false
      );

      return result[0];
    },
    onError: (err) => {
      toast.error("Error al registrar: " + (err.message || JSON.stringify(err)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registros"] });
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      queryClient.invalidateQueries({ queryKey: ["catalogo"] });
      toast.success("Trabajo registrado exitosamente");
      setForm(f => ({
        ...f,
        proyecto_id: "", proyecto_nombre: "", numero_proyecto: "", proyecto_libre: "",
        tipo_trabajo: "", fase: "", fase_custom: "",
        cantidad: 1, descripcion: "", fotos: [], notas: "",
      }));
      onSuccess?.();
    },
  });

  const handlePersonaChange = (id) => {
    if (id === "__libre") {
      setForm(f => ({ ...f, trabajador_id: "", trabajador_nombre: "", area: "", contratista_id: "", es_contratista: false }));
      return;
    }
    if (personaType === "trabajador") {
      const t = trabajadores.find(t => String(t.id) === String(id));
      if (t) setForm(f => ({ ...f, trabajador_id: t.id, trabajador_nombre: t.nombre, trabajador_libre: "", area: t.area || "", es_contratista: false, contratista_id: "" }));
    } else {
      const c = contratistas.find(c => String(c.id) === String(id));
      if (c) setForm(f => ({ ...f, contratista_id: c.id, trabajador_nombre: c.nombre, trabajador_libre: "", area: c.categoria || "", es_contratista: true, trabajador_id: "" }));
    }
  };

  const handleProyectoChange = (id) => {
    if (id === "__libre") {
      setForm(f => ({ ...f, proyecto_id: "", proyecto_nombre: "", numero_proyecto: "", tipo_trabajo: "", fase: "", fase_custom: "" }));
      return;
    }
    const proy = proyectos.find(p => String(p.id) === String(id));
    if (proy) setForm(f => ({ ...f, proyecto_id: proy.id, proyecto_nombre: proy.descripcion, numero_proyecto: proy.numero_proyecto || "", proyecto_libre: "", tipo_trabajo: "", fase: "", fase_custom: "" }));
  };

  const proyectoActual = proyectos.find(p => p.id === form.proyecto_id);
  const partidasProyecto = Array.isArray(proyectoActual?.partidas_cotizacion)
    ? proyectoActual.partidas_cotizacion.filter(p => p.tipo_trabajo)
    : [];

  const tipoTrabajoFinal = form.tipo_trabajo && !["__otro"].includes(form.tipo_trabajo) ? form.tipo_trabajo : "";
  const fases = tipoTrabajoFinal ? getFases(tipoTrabajoFinal, catalogo) : [];
  const faseFinal = form.fase === "__nueva" ? form.fase_custom.trim() : form.fase;

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await Promise.resolve({ file_url: 'https://placehold.co/600x400.png' });
      urls.push(file_url);
    }
    setForm(f => ({ ...f, fotos: [...f.fotos, ...urls] }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const now = new Date();
    const areaFinal = form.area === "__otro" ? form.area_custom : form.area;
    const nombreFinal = form.trabajador_id || form.contratista_id ? form.trabajador_nombre : form.trabajador_libre;
    const proyNombre = form.proyecto_id ? form.proyecto_nombre : form.proyecto_libre;

    createMutation.mutate({
      trabajador_id: form.trabajador_id,
      trabajador_nombre: nombreFinal,
      area: areaFinal,
      proyecto_id: form.proyecto_id || "",
      proyecto_nombre: proyNombre,
      numero_proyecto: form.proyecto_id ? form.numero_proyecto : "",
      tipo_trabajo: form.tipo_trabajo || "Otro",
      fase: faseFinal,
      es_finalizado: faseFinal === "Finalizado",
      cantidad: form.cantidad,
      descripcion: form.descripcion,
      fotos: form.fotos,
      notas: form.notas,
      encargado_nombre: form.encargado_nombre,
      es_contratista: form.es_contratista,
      contratista_id: form.contratista_id,
      fecha: format(now, "yyyy-MM-dd"),
      hora_registro: format(now, "HH:mm"),
      proyecto_libre: form.proyecto_libre // Used in mutationFn
    });
  };

  const personaSeleccionada = form.trabajador_id || form.contratista_id;
  const proyectoValido = form.proyecto_id || form.proyecto_libre;
  const tipoValido = !!form.tipo_trabajo && form.tipo_trabajo !== "__otro";
  const areaValida = form.area === "__otro" ? !!form.area_custom : true; // Area is optional unless "Otro" is selected
  const nombreValido = personaSeleccionada || form.trabajador_libre;
  const faseValida = faseFinal.trim() !== "";
  const canSubmit = nombreValido && proyectoValido && tipoValido && areaValida && faseValida;

  const missingFields = [];
  if (!nombreValido) missingFields.push("Persona");
  if (!proyectoValido) missingFields.push("Proyecto");
  if (!tipoValido) missingFields.push("Tipo de Trabajo");
  if (!areaValida) missingFields.push("Área custom");
  if (!faseValida) missingFields.push("Fase");

  const listaPersonas = personaType === "trabajador" ? trabajadores : contratistas;

  return (
    <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Plus className="w-5 h-5 text-orange-500" />
          Registrar Trabajo del Día
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Tipo persona tabs */}
            <div className="md:col-span-2 space-y-2">
              <Label>Persona *</Label>
              <div className="flex gap-2 mb-2">
                <button type="button"
                  onClick={() => { setPersonaType("trabajador"); setForm(f => ({ ...f, trabajador_id: "", contratista_id: "", trabajador_nombre: "", trabajador_libre: "", es_contratista: false })); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${personaType === "trabajador" ? "bg-orange-600 text-white border-orange-500 shadow-lg" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                  Trabajador
                </button>
                <button type="button"
                  onClick={() => { setPersonaType("contratista"); setForm(f => ({ ...f, trabajador_id: "", contratista_id: "", trabajador_nombre: "", trabajador_libre: "", es_contratista: true })); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${personaType === "contratista" ? "bg-orange-600 text-white border-orange-500 shadow-lg" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                  Contratista
                </button>
              </div>
              <Select
                value={personaType === "trabajador" ? (form.trabajador_id || (form.trabajador_libre ? "__libre" : "")) : (form.contratista_id || (form.trabajador_libre ? "__libre" : ""))}
                onValueChange={handlePersonaChange}>
                <SelectTrigger className="glass-input rounded-full px-5"><SelectValue placeholder={`Seleccionar ${personaType}`} /></SelectTrigger>
                <SelectContent className="glass-card-dark text-white border-white/10">
                  {listaPersonas.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nombre}{p.area || p.categoria ? ` — ${p.area || p.categoria}` : ""}</SelectItem>
                  ))}
                  <SelectItem value="__libre">✏️ Escribir nombre...</SelectItem>
                </SelectContent>
              </Select>
              {!personaSeleccionada && (
                <Input value={form.trabajador_libre} onChange={(e) => setForm(f => ({ ...f, trabajador_libre: e.target.value }))} placeholder="Nombre del trabajador o contratista..." className="glass-input rounded-full px-5 mt-2" />
              )}
            </div>

            {/* Área */}
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={form.area} onValueChange={(v) => setForm(f => ({ ...f, area: v, area_custom: "" }))}>
                <SelectTrigger className="glass-input rounded-full px-5"><SelectValue placeholder="Seleccionar área (opcional)" /></SelectTrigger>
                <SelectContent className="glass-card-dark text-white border-white/10">
                  {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  <SelectItem value="__otro">✏️ Escribir área...</SelectItem>
                </SelectContent>
              </Select>
              {form.area === "__otro" && (
                <Input value={form.area_custom} onChange={(e) => setForm(f => ({ ...f, area_custom: e.target.value }))} placeholder="Nombre del área..." className="glass-input rounded-full px-5" />
              )}
            </div>

            {/* Proyecto */}
            <div className="space-y-2">
              <Label>Proyecto *</Label>
              <Select value={form.proyecto_id || (form.proyecto_libre ? "__libre" : "")} onValueChange={handleProyectoChange}>
                <SelectTrigger className="glass-input rounded-full px-5"><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
                <SelectContent className="glass-card-dark text-white border-white/10">
                  {proyectos.filter(p => p.estado === "Activo").map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.numero_proyecto} — {p.descripcion}</SelectItem>
                  ))}
                  <SelectItem value="__libre">✏️ Otro proyecto...</SelectItem>
                </SelectContent>
              </Select>
              {!form.proyecto_id && (
                <Input value={form.proyecto_libre} onChange={(e) => setForm(f => ({ ...f, proyecto_libre: e.target.value }))} placeholder="Nombre del proyecto..." className="glass-input rounded-full px-5" />
              )}
            </div>

            {/* Tipo de trabajo */}
            <div className="space-y-2">
              <Label>Tipo de Trabajo *</Label>
              {partidasProyecto.length > 0 ? (
                <Select value={form.tipo_trabajo} onValueChange={(v) => setForm(f => ({ ...f, tipo_trabajo: v === "__otro" ? "" : v, fase: "", fase_custom: "" }))}>
                  <SelectTrigger className="glass-input rounded-full px-5"><SelectValue placeholder="Seleccionar tipo de trabajo" /></SelectTrigger>
                  <SelectContent className="glass-card-dark text-white border-white/10">
                    {partidasProyecto.map((p, i) => {
                      const restante = (p.cantidad_total || 0) - (p.cantidad_realizada || 0);
                      return (
                        <SelectItem key={i} value={p.tipo_trabajo}>
                          {p.tipo_trabajo}
                          {p.cantidad_total > 0 && <span className="text-white/50 ml-2 text-xs">({restante > 0 ? `${restante} restantes` : "Completo"})</span>}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="__otro">✏️ Otro tipo...</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {(partidasProyecto.length === 0 || form.tipo_trabajo === "" || !partidasProyecto.find(p => p.tipo_trabajo === form.tipo_trabajo)) && (
                <Input
                  value={form.tipo_trabajo === "__otro" ? "" : form.tipo_trabajo}
                  onChange={(e) => setForm(f => ({ ...f, tipo_trabajo: e.target.value, fase: "", fase_custom: "" }))}
                  placeholder="Ej: Muebles, Sillas, Puertas..."
                  className="glass-input rounded-full px-5"
                />
              )}
            </div>

            {/* Fase — aparece cuando hay tipo de trabajo */}
            {tipoTrabajoFinal && (
              <div className="space-y-2">
                <Label>Fase *</Label>
                <Select value={form.fase} onValueChange={(v) => setForm(f => ({ ...f, fase: v, fase_custom: v !== "__nueva" ? "" : f.fase_custom }))}>
                  <SelectTrigger className="glass-input rounded-full px-5"><SelectValue placeholder="Seleccionar fase" /></SelectTrigger>
                  <SelectContent className="glass-card-dark text-white border-white/10">
                    {fases.map(f => (
                      <SelectItem key={f} value={f}>
                        {f === "Finalizado" ? "✅ Finalizado — pieza terminada" : f}
                      </SelectItem>
                    ))}
                    <SelectItem value="__nueva">✏️ Nueva fase...</SelectItem>
                  </SelectContent>
                </Select>
                {form.fase === "__nueva" && (
                  <Input
                    value={form.fase_custom}
                    onChange={(e) => setForm(f => ({ ...f, fase_custom: e.target.value }))}
                    placeholder="Nombre de la nueva fase..."
                    className="glass-input rounded-full px-5"
                  />
                )}
                {form.fase === "Finalizado" && (
                  <p className="text-[11px] text-emerald-500 font-medium">✅ Se marcará como pieza terminada.</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Cantidad (piezas)</Label>
              <Input type="number" min={1} value={form.cantidad} onFocus={(e) => e.target.select()} onChange={(e) => setForm(f => ({ ...f, cantidad: parseInt(e.target.value) || 1 }))} className="glass-input rounded-full px-5" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Encargado</Label>
              <Input value={form.encargado_nombre} onChange={(e) => setForm(f => ({ ...f, encargado_nombre: e.target.value }))} placeholder="Nombre del encargado" className="glass-input rounded-full px-5" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={form.descripcion} onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Describe lo que se realizó..." rows={3} className="glass-input rounded-2xl p-4" />
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <Label>Fotos del trabajo</Label>
            <div className="flex flex-wrap gap-3">
              {form.fotos.map((url, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, fotos: f.fotos.filter((_, i) => i !== idx) }))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-orange-500 flex flex-col items-center justify-center gap-1 transition-colors text-white/50 hover:text-orange-500 bg-white/5 hover:bg-white/10">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-[10px] font-medium">Archivo</span></>}
              </button>
              <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={uploading}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-orange-500 flex flex-col items-center justify-center gap-1 transition-colors text-white/50 hover:text-orange-500 bg-white/5 hover:bg-white/10">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Camera className="w-5 h-5" /><span className="text-[10px] font-medium">Cámara</span></>}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadFiles(Array.from(e.target.files))} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => uploadFiles(Array.from(e.target.files))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas adicionales</Label>
            <Input value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones..." className="glass-input rounded-full px-5" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button type="submit" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 rounded-full text-white font-bold transition-transform hover:scale-[1.02]" disabled={!canSubmit || createMutation.isPending}>
              {createMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                : <><Upload className="w-4 h-4 mr-2" /> Registrar Trabajo</>}
            </Button>
            {!canSubmit && missingFields.length > 0 && (
              <p className="text-xs text-orange-400 font-medium">Falta llenar: {missingFields.join(", ")}</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
