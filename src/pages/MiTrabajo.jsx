import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, X, Loader2, ClipboardList, LogOut, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Fases por tipo de trabajo (fallback si no está en catálogo) ────────────
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

// ── Item draft vacío ───────────────────────────────────────────────────────
const EMPTY_ITEM = {
  proyecto_id: "", proyecto_nombre: "", numero_proyecto: "",
  subproyecto_id: "", subproyecto_nombre: "",
  contratista_id: "", contratista_nombre: "",
  proyecto_libre: "", tipo_trabajo: "", tipo_libre: false,
  tipo_custom: "", fase: "", fase_custom: "", cantidad: 1,
};

// ── Selector de fase reutilizable ──────────────────────────────────────────
function FaseSelector({ tipoFinal, fase, fase_custom, catalogo, onChange }) {
  const fases = getFases(tipoFinal, catalogo);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-white/90">Fase *</Label>
      <Select value={fase} onValueChange={v => onChange({ fase: v, fase_custom: v !== "__nueva" ? "" : fase_custom })}>
        <SelectTrigger className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus:ring-white/50"><SelectValue placeholder="Seleccionar fase" /></SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl shadow-xl">
          {fases.map(f => (
            <SelectItem key={f} value={f} className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">
              {f === "Finalizado" ? "✅ Finalizado — pieza terminada" : f}
            </SelectItem>
          ))}
          <SelectItem value="__nueva" className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">✏️ Nueva fase...</SelectItem>
        </SelectContent>
      </Select>
      {fase === "__nueva" && (
        <Input
          value={fase_custom}
          onChange={e => onChange({ fase, fase_custom: e.target.value })}
          placeholder="Nombre de la nueva fase..."
          autoFocus
          className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus-visible:ring-white/50"
        />
      )}
      {fase && fase !== "__nueva" && fase !== "Finalizado" && (
        <p className="text-[11px] text-zinc-400">
          Pieza marcada como <strong>en proceso</strong> (fase: {fase}).
        </p>
      )}
      {fase === "Finalizado" && (
        <p className="text-[11px] text-orange-400 font-medium">
          ✅ Esta pieza se marcará como <strong>terminada</strong>.
        </p>
      )}
    </div>
  );
}

// ── Formulario para agregar / editar una actividad ─────────────────────────
function WorkItemForm({ draft, setDraft, proyectos, contratistas, catalogo, userArea, onAdd, addLabel = "Agregar" }) {
  const pActual = proyectos.find(p => p.id === draft.proyecto_id);
  const masterProjects = proyectos.filter(p => !p.parent_project_id);
  const subProjects = proyectos.filter(p => p.parent_project_id === draft.proyecto_id);

  // Consideramos las partidas del proyecto actual, y si seleccionó subproyecto, las del subproyecto
  const targetProject = draft.subproyecto_id ? proyectos.find(p => p.id === draft.subproyecto_id) : pActual;
  const partidas = Array.isArray(targetProject?.partidas_cotizacion)
    ? targetProject.partidas_cotizacion.filter(p => p.tipo_trabajo)
    : [];

  const isContratistas = userArea === "Contratistas" || userArea === "Recepción";

  const isCustomMode = draft.tipo_libre || partidas.length === 0;
  const tipoFinal = isCustomMode ? draft.tipo_custom : draft.tipo_trabajo;
  const faseFinal = draft.fase === "__nueva" ? draft.fase_custom.trim() : draft.fase;
  
  const proyectoValido = draft.proyecto_id || draft.proyecto_libre.trim();
  const tipoValido = tipoFinal.trim() !== "";
  const faseValida = faseFinal.trim() !== "";
  const contratistaValido = !isContratistas || draft.contratista_id;

  const canAdd = proyectoValido && tipoValido && faseValida && contratistaValido;

  const missingFields = [];
  if (isContratistas && !draft.contratista_id) missingFields.push("Contratista");
  if (!proyectoValido) missingFields.push("Proyecto");
  if (!tipoValido) missingFields.push("Producto / Trabajo");
  if (!faseValida) missingFields.push("Fase");

  return (
    <div className="space-y-3">
      {/* Contratista (solo si es área de contratistas) */}
      {isContratistas && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-white/90">Contratista que entrega *</Label>
          <Select
            value={draft.contratista_id || ""}
            onValueChange={(v) => {
              const c = contratistas.find(x => String(x.id) === String(v));
              setDraft(d => ({ ...d, contratista_id: c?.id || "", contratista_nombre: c?.nombre || "" }));
            }}
          >
            <SelectTrigger className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus:ring-white/50"><SelectValue placeholder="Seleccionar contratista" /></SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl shadow-xl">
              {contratistas.map(c => (
                <SelectItem key={c.id} value={String(c.id)} className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Proyecto Maestro */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-white/90">Proyecto (Maestro) *</Label>
        <Select
          value={draft.proyecto_id || (draft.proyecto_libre ? "__libre" : "")}
          onValueChange={(v) => {
            if (v === "__libre") {
              setDraft(d => ({ ...d, proyecto_id: "", proyecto_nombre: "", numero_proyecto: "", subproyecto_id: "", subproyecto_nombre: "", tipo_trabajo: "", tipo_libre: false, tipo_custom: "", fase: "", fase_custom: "" }));
            } else {
              const p = proyectos.find(x => String(x.id) === String(v));
              if (p) setDraft(d => ({ ...d, proyecto_id: p.id, proyecto_nombre: p.descripcion, numero_proyecto: p.numero_proyecto || "", subproyecto_id: "", subproyecto_nombre: "", proyecto_libre: "", tipo_trabajo: "", tipo_libre: false, tipo_custom: "", fase: "", fase_custom: "" }));
            }
          }}
        >
          <SelectTrigger className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus:ring-white/50"><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl shadow-xl">
            {masterProjects.filter(p => p.estado === "Activo").map(p => (
              <SelectItem key={p.id} value={String(p.id)} className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">{p.numero_proyecto} — {p.descripcion}</SelectItem>
            ))}
            <SelectItem value="__libre" className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">✏️ Otro proyecto...</SelectItem>
          </SelectContent>
        </Select>
        {!draft.proyecto_id && (
          <Input value={draft.proyecto_libre} onChange={e => setDraft(d => ({ ...d, proyecto_libre: e.target.value }))} placeholder="Nombre del proyecto..." className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus-visible:ring-white/50" />
        )}
      </div>

      {/* Subproyecto (Cotización específica) */}
      {draft.proyecto_id && subProjects.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-white/90">Subproyecto / Cotización (Opcional)</Label>
          <Select
            value={draft.subproyecto_id || "ninguno"}
          onValueChange={(v) => {
              if (v === "ninguno") {
                setDraft(d => ({ ...d, subproyecto_id: "", subproyecto_nombre: "", tipo_trabajo: "", tipo_libre: false, tipo_custom: "" }));
              } else {
                const sp = subProjects.find(x => String(x.id) === String(v));
                if (sp) setDraft(d => ({ ...d, subproyecto_id: sp.id, subproyecto_nombre: sp.descripcion, tipo_trabajo: "", tipo_libre: false, tipo_custom: "" }));
              }
            }}
          >
            <SelectTrigger className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus:ring-white/50"><SelectValue placeholder="General (Sin subproyecto)" /></SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl shadow-xl">
              <SelectItem value="ninguno" className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">General (Aplica a todo el proyecto)</SelectItem>
              {subProjects.map(sp => (
                <SelectItem key={sp.id} value={String(sp.id)} className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">{sp.numero_proyecto} — {sp.descripcion}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tipo de trabajo */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-white/90">Producto / Trabajo *</Label>
        {partidas.length > 0 && !draft.tipo_libre ? (
          <Select
            value={draft.tipo_trabajo}
            onValueChange={(v) => {
              if (v === "__otro") {
                setDraft(d => ({ ...d, tipo_trabajo: "", tipo_libre: true, tipo_custom: "", fase: "", fase_custom: "" }));
              } else {
                setDraft(d => ({ ...d, tipo_trabajo: v, tipo_libre: false, tipo_custom: "", fase: "", fase_custom: "" }));
              }
            }}
          >
            <SelectTrigger className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus:ring-white/50"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl shadow-xl">
              {partidas.map((p, i) => (
                <SelectItem key={i} value={p.tipo_trabajo} className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">{p.tipo_trabajo} ({p.cantidad} pzs)</SelectItem>
              ))}
              <SelectItem value="__otro" className="focus:bg-orange-600/20 focus:text-orange-500 rounded-lg cursor-pointer">✏️ Escribir manualmente...</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="flex gap-2">
            <Input
              value={draft.tipo_custom}
              onChange={e => setDraft(d => ({ ...d, tipo_custom: e.target.value, fase: "", fase_custom: "" }))}
              placeholder="Ej: Silla Beatriz, Mesa..."
              className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus-visible:ring-white/50 flex-1"
            />
            {draft.tipo_libre && partidas.length > 0 && (
              <Button type="button" variant="outline" size="icon"
                className="rounded-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                onClick={() => setDraft(d => ({ ...d, tipo_libre: false, tipo_custom: "", tipo_trabajo: "", fase: "", fase_custom: "" }))}>
                ☰
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Fase — aparece cuando hay tipo */}
      {tipoFinal && (
        <FaseSelector
          tipoFinal={tipoFinal}
          fase={draft.fase}
          fase_custom={draft.fase_custom}
          catalogo={catalogo}
          onChange={({ fase, fase_custom }) => setDraft(d => ({ ...d, fase, fase_custom }))}
        />
      )}

      {/* Cantidad */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-white/90">Cantidad entregada / procesada (piezas)</Label>
        <Input
          type="number" min={1}
          value={draft.cantidad}
          onFocus={e => e.target.select()}
          onChange={e => setDraft(d => ({ ...d, cantidad: parseInt(e.target.value) || 1 }))}
          className="glass-input rounded-full h-10 px-4 ring-offset-orange-600 focus-visible:ring-white/50"
        />
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <Button type="button" onClick={onAdd} disabled={!canAdd} className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-full h-12 shadow-lg border-0 font-bold transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100">
          <Plus className="w-5 h-5 mr-2" /> {addLabel}
        </Button>
        {!canAdd && missingFields.length > 0 && (
          <p className="text-[11px] text-orange-400 font-medium text-center mt-1">Falta llenar: {missingFields.join(", ")}</p>
        )}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function MiTrabajo() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [pendingItems, setPendingItems] = useState([]);
  const [itemDraft, setItemDraft] = useState(EMPTY_ITEM);
  const [editingPendingIdx, setEditingPendingIdx] = useState(null);
  const [globalForm, setGlobalForm] = useState({
    fotos: [],
    notas: "",
  });
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editDraft, setEditDraft] = useState(EMPTY_ITEM);

  const { data: proyectos = [] } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => supabase.from('proyecto').select('*').order('created_date', { ascending: false }).limit(100).then(res => res.data),
  });

  const { data: contratistas = [] } = useQuery({
    queryKey: ["contratistas"],
    queryFn: () => supabase.from('contratista').select('*').order('nombre', { ascending: true }).then(res => res.data),
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ["catalogo"],
    queryFn: () => supabase.from('catalogo_trabajo').select('*').order('nombre', { ascending: true }).limit(200).then(res => res.data),
  });

  const { data: misRegistros = [] } = useQuery({
    queryKey: ["mis-registros", user?.id],
    queryFn: () => supabase.from('registro_trabajo').select('*').match({ created_by_id: user?.id }).order('created_date', { ascending: false }).limit(30).then(res => res.data),
    enabled: !!user?.id,
  });

  const hoy = format(new Date(), "yyyy-MM-dd");
  const registrosHoy = misRegistros.filter(r => r.fecha === hoy);

  const createMutation = useMutation({
    mutationFn: async (items) => {
      const now = new Date();
      const fecha = format(now, "yyyy-MM-dd");
      const hora = format(now, "HH:mm");
      for (const item of items) {
        let finalProjectId = item.proyecto_id;
        if (!finalProjectId && item.proyecto_libre) {
          const { data: newProy } = await supabase.from('proyecto').insert({
            descripcion: item.proyecto_libre,
            numero_proyecto: "S/N",
            estado: "Activo"
          }).select().single();
          if (newProy) {
            finalProjectId = newProy.id;
            item.proyecto_nombre = newProy.descripcion;
          }
        }

        const isCustomMode = item.tipo_libre || !item.proyecto_id;
        const tipoFinal = isCustomMode ? item.tipo_custom : item.tipo_trabajo;
        const faseFinal = item.fase === "__nueva" ? item.fase_custom : item.fase;

        if (tipoFinal && tipoFinal !== "Otro") {
          const { data: exists } = await supabase.from('catalogo_trabajo')
            .select('id').ilike('nombre', tipoFinal).maybeSingle();
          if (!exists) {
            await supabase.from('catalogo_trabajo').insert({ nombre: tipoFinal, fases: ["General"] });
          }
        }

        const trabajadorFinal = user?.full_name || user?.perfil_encargado?.nombre || "Encargado";
        const encargadoFinal = user?.perfil_encargado?.area_principal || "";
        
        await supabase.from('registro_trabajo').insert({
          id: crypto.randomUUID(), // Generar UUID desde el cliente
          created_by_id: user?.id || null, // Agregado por si la BD lo requiere
          trabajador_nombre: trabajadorFinal,
          trabajador_id: user?.id || null,
          encargado_nombre: encargadoFinal,
          area_encargado: encargadoFinal,
          proyecto_id: finalProjectId || null,
          proyecto_nombre: finalProjectId ? item.proyecto_nombre : item.proyecto_libre,
          numero_proyecto: item.numero_proyecto || "",
          subproyecto_id: item.subproyecto_id || null,
          contratista_id: item.contratista_id || null,
          tipo_trabajo: tipoFinal || "Otro",
          fase: faseFinal,
          es_finalizado: faseFinal === "Finalizado",
          cantidad: item.cantidad,
          fotos: globalForm.fotos,
          notas: globalForm.notas,
          fecha,
          hora_registro: hora,
        }).select().then(res => {
          if (res.error) throw res.error;
          return res.data?.[0];
        });
      }
    },
    onSuccess: () => {
      // Play a tiny success blip
      try {
        const audio = new Audio("https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3");
        audio.volume = 0.5;
        audio.play();
      } catch (e) {}

      queryClient.invalidateQueries({ queryKey: ["registros"] });
      queryClient.invalidateQueries({ queryKey: ["mis-registros"] });
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      queryClient.invalidateQueries({ queryKey: ["catalogo"] });
      setSubmitted(true);
      toast.success(`¡${pendingItems.length} registro(s) guardados!`);
      setPendingItems([]);
      setItemDraft(EMPTY_ITEM);
      setEditingPendingIdx(null);
      setGlobalForm(g => ({ ...g, fotos: [], notas: "" }));
      setTimeout(() => setSubmitted(false), 3000);
    },
    onError: (error) => {
      console.error("Error al guardar registros:", error);
      toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.from('registro_trabajo').update(data).eq('id', id).select().then(res => res.data[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mis-registros"] });
      setEditingRecord(null);
      toast.success("Registro actualizado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.from('registro_trabajo').delete().eq('id', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mis-registros"] });
      toast.success("Registro eliminado");
    },
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await Promise.resolve({ file_url: 'https://placehold.co/600x400.png' });
      setGlobalForm(g => ({ ...g, fotos: [...g.fotos, file_url] }));
    }
    setUploading(false);
    e.target.value = "";
  };

  const addPendingItem = () => {
    const resolved = {
      ...itemDraft,
      fase: itemDraft.fase === "__nueva" ? itemDraft.fase_custom.trim() : itemDraft.fase,
    };
    if (editingPendingIdx !== null) {
      setPendingItems(items => items.map((it, i) => i === editingPendingIdx ? resolved : it));
      setEditingPendingIdx(null);
    } else {
      setPendingItems(items => [...items, resolved]);
    }
    setItemDraft(EMPTY_ITEM);
  };

  const startEditPending = (idx) => {
    setItemDraft({ ...pendingItems[idx] });
    setEditingPendingIdx(idx);
  };

  const removePendingItem = (idx) => {
    setPendingItems(items => items.filter((_, i) => i !== idx));
    if (editingPendingIdx === idx) { setEditingPendingIdx(null); setItemDraft(EMPTY_ITEM); }
  };

  const openEditRecord = (r) => {
    const pActual = proyectos.find(p => p.id === r.proyecto_id);
    const partidas = Array.isArray(pActual?.partidas_cotizacion) ? pActual.partidas_cotizacion.filter(p => p.tipo_trabajo) : [];
    const isInPartidas = partidas.some(p => p.tipo_trabajo === r.tipo_trabajo);
    setEditDraft({
      proyecto_id: r.proyecto_id || "",
      proyecto_nombre: r.proyecto_nombre || "",
      numero_proyecto: r.numero_proyecto || "",
      proyecto_libre: r.proyecto_id ? "" : (r.proyecto_nombre || ""),
      tipo_trabajo: isInPartidas ? r.tipo_trabajo : "",
      tipo_libre: !isInPartidas,
      tipo_custom: isInPartidas ? "" : (r.tipo_trabajo || ""),
      fase: r.fase || "",
      fase_custom: "",
      cantidad: r.cantidad || 1,
    });
    setEditingRecord(r);
  };

  const submitEditRecord = () => {
    const tipoFinal = editDraft.tipo_libre ? editDraft.tipo_custom : editDraft.tipo_trabajo;
    const faseFinal = editDraft.fase === "__nueva" ? editDraft.fase_custom.trim() : editDraft.fase;
    updateMutation.mutate({
      id: editingRecord.id,
      data: {
        tipo_trabajo: tipoFinal,
        fase: faseFinal,
        es_finalizado: faseFinal === "Finalizado",
        cantidad: editDraft.cantidad,
        proyecto_id: editDraft.proyecto_id || "",
        proyecto_nombre: editDraft.proyecto_id ? editDraft.proyecto_nombre : editDraft.proyecto_libre,
      },
    });
  };

  const canSubmit = pendingItems.length > 0;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden text-white">
      
      {/* Animated Hexagrid Background */}
      <div className="absolute inset-0 z-0 hex-bg pointer-events-none opacity-50"></div>
      
      {/* Animated Glowing Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-zinc-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Header */}
      <div className="sticky top-0 z-20 glass-card-dark border-b-0 px-4 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg border border-orange-400/50">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black leading-tight tracking-tight text-white/90">GOIRAND OPS</h1>
            <p className="text-[11px] text-orange-400 font-medium tracking-wide uppercase">{user?.perfil_encargado?.area_principal || "Operaciones"}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => logout()} className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full w-10 h-10">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6 relative z-10 pb-20">
        
        {/* Pro Greeting Card */}
        <div className="card-orange-geo rounded-3xl p-6 shadow-2xl">
          <p className="text-xs uppercase tracking-widest text-white/70 font-semibold mb-1">Registro de Producción</p>
          <h2 className="text-2xl font-black text-white drop-shadow-md tracking-tight">
            Bienvenido, {user?.full_name?.split(" ")[0] || user?.perfil_encargado?.nombre?.split(" ")[0] || "Encargado"}
          </h2>
          <p className="text-sm text-white/80 mt-2 font-medium">
            {registrosHoy.length === 0 ? "Comienza tu reporte del día." : `Has enviado ${registrosHoy.length} registro(s) hoy.`}
          </p>
        </div>

        {submitted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center gap-6 text-center">
              <div className="w-32 h-32 bg-emerald-500/20 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(16,185,129,0.3)] border border-emerald-500/30">
                <CheckCircle2 className="w-20 h-20 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
              </div>
              <div>
                <p className="text-3xl font-black tracking-tight text-white drop-shadow-lg">¡Registros Guardados!</p>
                <p className="text-lg text-emerald-100/70 mt-2 font-medium">Agregados al proyecto exitosamente</p>
              </div>
            </div>
          </div>
        )}

        {!submitted && (
          <>
            {/* Formulario de actividad */}
            <Card className="glass-card-dark border-0 rounded-3xl overflow-hidden shadow-xl">
              <CardHeader className="pb-2 pt-6 px-6 bg-white/5 border-b border-white/5">
                <CardTitle className="text-lg font-bold text-white/90">
                  {editingPendingIdx !== null ? "Editar actividad" : "Nueva actividad"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <WorkItemForm
                  draft={itemDraft}
                  setDraft={setItemDraft}
                  proyectos={proyectos}
                  contratistas={contratistas}
                  catalogo={catalogo}
                  userArea={user?.perfil_encargado?.area_principal}
                  onAdd={addPendingItem}
                  addLabel={
                    editingPendingIdx !== null
                      ? "Guardar cambios"
                      : pendingItems.length > 0 ? "Agregar otra actividad" : "Agregar actividad"
                  }
                />
              </CardContent>
            </Card>

            {/* Lista de actividades pendientes */}
            {pendingItems.length > 0 && (
              <div>
                <p className="text-sm font-bold text-white/90 mb-3 px-1">
                  Actividades a registrar
                  <Badge className="ml-2 bg-orange-600 text-white rounded-full px-2 py-0.5 border-0 shadow-lg">{pendingItems.length}</Badge>
                </p>
                <div className="space-y-3">
                  {pendingItems.map((item, idx) => {
                    const tipo = item.tipo_libre ? item.tipo_custom : item.tipo_trabajo;
                    const proj = item.proyecto_nombre || item.proyecto_libre;
                    const isFinalizado = item.fase === "Finalizado";
                    return (
                      <div key={idx} className={`glass-card-dark rounded-2xl p-4 flex items-center gap-3 transition-colors ${editingPendingIdx === idx ? "ring-2 ring-orange-500 bg-white/5" : "border-0"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white/90 truncate">{tipo}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge className={`text-[10px] rounded-full border-0 ${isFinalizado ? "bg-orange-500 text-white shadow-md" : "bg-white/10 text-white/70"}`}>
                              {isFinalizado ? "✅ Finalizado" : item.fase}
                            </Badge>
                            <span className="text-xs text-zinc-400 font-medium">{proj}</span>
                            <span className="text-xs text-orange-400 font-bold">{item.cantidad} pzs</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 bg-white/5 rounded-full p-1 border border-white/10">
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10" onClick={() => startEditPending(idx)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-red-400 hover:text-red-300 hover:bg-red-900/40" onClick={() => removePendingItem(idx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Detalles globales + envío */}
            {pendingItems.length > 0 && (
              <Card className="glass-card-dark border-0 rounded-3xl overflow-hidden shadow-xl mt-6">
                <CardHeader className="pb-2 pt-6 px-6 bg-white/5 border-b border-white/5">
                  <CardTitle className="text-lg font-bold text-white/90">Detalles del reporte</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-white/80 font-semibold">Fotos del trabajo</Label>
                    <div className="flex flex-wrap gap-3">
                      {globalForm.fotos.map((url, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/20 shadow-lg">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setGlobalForm(g => ({ ...g, fotos: g.fotos.filter((_, i) => i !== idx) }))}
                            className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white transition-all hover:border-orange-500">
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <><Camera className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold uppercase tracking-wider">Agregar</span></>}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 font-semibold">Notas adicionales</Label>
                    <Textarea value={globalForm.notas} onChange={e => setGlobalForm(g => ({ ...g, notas: e.target.value }))} placeholder="Cualquier comentario..." rows={3} className="glass-input rounded-2xl p-4 resize-none" />
                  </div>
                  <Button onClick={() => createMutation.mutate(pendingItems)} disabled={!canSubmit || createMutation.isPending}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-full h-14 text-lg font-black shadow-xl mt-4 border-0 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100">
                    {createMutation.isPending
                      ? <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> Procesando...</>
                      : <><Upload className="w-6 h-6 mr-3" /> Confirmar {pendingItems.length} registro(s)</>}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Registros ya enviados hoy */}
        {registrosHoy.length > 0 && (
          <div className="mt-8">
            <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4 px-1">Enviados hoy</p>
            <div className="space-y-3">
              {registrosHoy.map(r => (
                <div key={r.id} className="glass-card-dark rounded-2xl p-4 flex items-center gap-4">
                  {r.fotos?.[0] ? (
                    <img src={r.fotos[0]} alt="" className="w-12 h-12 rounded-[10px] object-cover flex-shrink-0 border border-white/10 shadow-md" />
                  ) : (
                     <div className="w-12 h-12 rounded-[10px] bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <CheckCircle2 className="w-5 h-5 text-orange-500/80" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/90 truncate">{r.tipo_trabajo}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {r.fase && (
                        <Badge className={`text-[9px] rounded-full uppercase tracking-wider border-0 px-2 py-0.5 ${r.es_finalizado ? "bg-orange-500 text-white shadow-md" : "bg-white/10 text-white/60"}`}>
                          {r.es_finalizado ? "Finalizado" : r.fase}
                        </Badge>
                      )}
                      <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[120px]">{r.proyecto_nombre}</span>
                      <span className="text-[11px] text-orange-400 font-bold">{r.cantidad} pzs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 bg-white/5 rounded-full p-1 border border-white/10">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10" onClick={() => openEditRecord(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-red-400 hover:text-red-300 hover:bg-red-900/40"
                      onClick={() => { if (window.confirm("¿Eliminar este registro?")) deleteMutation.mutate(r.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialog: editar registro enviado */}
      <Dialog open={!!editingRecord} onOpenChange={(v) => { if (!v) setEditingRecord(null); }}>
        <DialogContent className="glass-card-dark text-white border-white/10 sm:rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="bg-white/5 p-6 border-b border-white/5">
            <DialogTitle className="text-xl font-bold">Editar registro</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <WorkItemForm
              draft={editDraft}
              setDraft={setEditDraft}
              proyectos={proyectos}
              contratistas={contratistas}
              catalogo={catalogo}
              userArea={user?.perfil_encargado?.area_principal}
              onAdd={submitEditRecord}
              addLabel={updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
