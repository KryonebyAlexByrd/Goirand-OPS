import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ClipboardList, CheckCircle2, UserCircle, Plus, Pencil, Trash2, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const AREAS = ["Contratistas", "Recepción", "Cortado", "Tableros", "Armado", "Pulido", "Barnizado", "Empaque", "Entrega", "Otro"];
const EMPTY_FORM = { nombre: "", area_principal: "Armado", area_custom: "" };

const AREA_COLORS = {
  "Contratistas": { card: "hover:border-stone-500/30", text: "text-stone-500", bg: "bg-stone-500/10", border: "border-stone-500/20", hoverBg: "group-hover:bg-stone-500" },
  "Recepción": { card: "hover:border-sky-500/30", text: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20", hoverBg: "group-hover:bg-sky-500" },
  "Cortado": { card: "hover:border-orange-500/30", text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", hoverBg: "group-hover:bg-orange-500" },
  "Tableros": { card: "hover:border-amber-500/30", text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", hoverBg: "group-hover:bg-amber-500" },
  "Armado": { card: "hover:border-emerald-500/30", text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", hoverBg: "group-hover:bg-emerald-500" },
  "Pulido": { card: "hover:border-indigo-500/30", text: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", hoverBg: "group-hover:bg-indigo-500" },
  "Barnizado": { card: "hover:border-red-500/30", text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", hoverBg: "group-hover:bg-red-500" },
  "Empaque": { card: "hover:border-purple-500/30", text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", hoverBg: "group-hover:bg-purple-500" },
  "Entrega": { card: "hover:border-blue-500/30", text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", hoverBg: "group-hover:bg-blue-500" },
  "Otro": { card: "hover:border-zinc-500/30", text: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20", hoverBg: "group-hover:bg-zinc-500" }
};

export default function Trabajadores() {
  const [search, setSearch] = useState("");
  const [selectedEncargado, setSelectedEncargado] = useState(null);
  
  // CRUD states
  const [dialogFormOpen, setDialogFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: encargados = [] } = useQuery({
    queryKey: ["encargados"],
    queryFn: () => supabase.from('perfil_encargado').select('*').order('nombre', { ascending: true }).then(res => res.data),
  });

  const { data: registros = [], isLoading: loadingRegistros } = useQuery({
    queryKey: ["registros-encargado", selectedEncargado?.id],
    queryFn: () => supabase.from('registro_trabajo').select('*')
      .or(`trabajador_id.eq.${selectedEncargado?.id},trabajador_nombre.eq.${selectedEncargado?.nombre}`)
      .order('created_date', { ascending: false })
      .limit(50)
      .then(res => res.data),
    enabled: !!selectedEncargado?.id && !dialogFormOpen, // don't load history if just editing
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const areaFinal = data.area_principal === "Otro" ? data.area_custom : data.area_principal;
      
      if (editingId) {
        // Update
        const { data: res, error } = await supabase.from('perfil_encargado')
          .update({ nombre: data.nombre, area_principal: areaFinal })
          .eq('id', editingId)
          .select().single();
        if (error) throw error;
        return res;
      } else {
        // Create via /api/register
        const fakeEmail = `${Date.now()}-${Math.random().toString(36).substring(7)}@goirand.local`;
        const fakePassword = crypto.randomUUID();
        const response = await fetch('http://localhost:3001/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: fakeEmail, password: fakePassword, name: data.nombre, area: areaFinal })
        });
        const respData = await response.json();
        if (!response.ok) throw new Error(respData.error || 'Error al registrar el perfil');
        return respData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encargados"] });
      setDialogFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast.success(editingId ? "Encargado actualizado" : "Encargado agregado");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('perfil_encargado').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encargados"] });
      toast.success("Encargado eliminado del directorio");
    },
    onError: (err) => toast.error(err.message)
  });

  const filtered = encargados.filter(t =>
    (t.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.area_principal || "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, curr) => {
    const area = curr.area_principal || "Sin Área";
    if (!acc[area]) acc[area] = [];
    acc[area].push(curr);
    return acc;
  }, {});

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogFormOpen(true);
  };

  const handleOpenEdit = (e, t) => {
    e.stopPropagation(); // Prevents opening the history dialog
    setEditingId(t.id);
    const isCustomArea = !AREAS.slice(0, -1).includes(t.area_principal);
    setForm({
      nombre: t.nombre || "",
      area_principal: isCustomArea ? "Otro" : (t.area_principal || "Armado"),
      area_custom: isCustomArea ? (t.area_principal || "") : ""
    });
    setDialogFormOpen(true);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm("¿Seguro que deseas eliminar a este encargado? Ya no podrá iniciar sesión.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <div>
      <PageHeader title="Encargados" description="Directorio de encargados y su historial de producción">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input placeholder="Buscar nombre o área..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-5 w-64 glass-input rounded-full" />
          </div>
          <Button onClick={handleOpenNew} className="bg-orange-600 hover:bg-orange-500 rounded-full text-white font-bold transition-transform hover:scale-[1.02]">
            <Plus className="w-4 h-4 mr-2" /> Agregar
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-8 mt-6">
        {Object.entries(grouped).map(([area, personas]) => {
          const areaColor = AREA_COLORS[area] || AREA_COLORS["Otro"];
          return (
          <div key={area}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-3">
              <Badge variant="secondary" className={`px-3 py-1 shadow-sm border ${areaColor.bg} ${areaColor.text} ${areaColor.border}`}>{area}</Badge>
              <span className="text-muted-foreground text-sm font-normal">({personas.length} encargados)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {personas.map((t) => (
                <Card key={t.id} className={`glass-card-dark border-white/10 shadow-2xl rounded-3xl hover:shadow-2xl transition-all cursor-pointer group ${areaColor.card}`} onClick={() => setSelectedEncargado(t)}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black flex-shrink-0 transition-colors ${areaColor.bg} ${areaColor.text} ${areaColor.hoverBg} group-hover:text-white`}>
                      {(t.nombre || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm truncate text-foreground transition-colors group-hover:${areaColor.text.replace("text-", "text-")}`}>{t.nombre}</h3>
                      <p className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-1">
                        <UserCircle className="w-3 h-3" /> ID: {t.id.substring(0,8)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => handleOpenEdit(e, t)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(e, t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )})}
      </div>

      {/* Dialog for CRUD (Add / Edit) */}
      <Dialog open={dialogFormOpen} onOpenChange={(v) => { setDialogFormOpen(v); if (!v) { setEditingId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{editingId ? "Editar Encargado" : "Nuevo Encargado"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nombre Completo *</Label>
              <Input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Área *</Label>
              <Select value={form.area_principal} onValueChange={(v) => setForm(f => ({ ...f, area_principal: v, area_custom: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.area_principal === "Otro" && (
                <Input value={form.area_custom} onChange={(e) => setForm(f => ({ ...f, area_custom: e.target.value }))} placeholder="Especificar área..." className="mt-2" />
              )}
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4" disabled={!form.nombre || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saveMutation.isPending ? "Guardando..." : "Guardar Encargado"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for View History */}
      <Dialog open={!!selectedEncargado && !dialogFormOpen} onOpenChange={(v) => { if (!v) setSelectedEncargado(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto sm:rounded-3xl border-border/60 shadow-2xl">
          <DialogHeader className="border-b border-border/40 pb-5 mb-5">
            <DialogTitle className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black ${AREA_COLORS[selectedEncargado?.area_principal]?.bg || "bg-white/10"} ${AREA_COLORS[selectedEncargado?.area_principal]?.text || "text-white"}`}>
                {(selectedEncargado?.nombre || "?")[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight">{selectedEncargado?.nombre}</p>
                <Badge variant="secondary" className={`mt-1 border ${AREA_COLORS[selectedEncargado?.area_principal]?.bg || "bg-white/10"} ${AREA_COLORS[selectedEncargado?.area_principal]?.text || "text-white"} ${AREA_COLORS[selectedEncargado?.area_principal]?.border || "border-white/20"}`}>
                  {selectedEncargado?.area_principal}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div>
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-foreground/80">
              <ClipboardList className="w-4 h-4 text-primary" /> Historial de Producción (Últimos 50)
            </h3>
            
            {loadingRegistros ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground animate-pulse">Cargando registros...</p>
              </div>
            ) : registros.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border/60">
                <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-border/40">
                  <ClipboardList className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground/70">No hay registros de trabajo</p>
                <p className="text-xs text-muted-foreground mt-1">Este encargado aún no ha enviado reportes de producción.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {registros.map(r => (
                  <div key={r.id} className="bg-card border border-border/60 rounded-2xl p-4 flex gap-4 hover:border-primary/30 transition-colors shadow-sm">
                    {r.fotos?.[0] ? (
                      <img src={r.fotos[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border/50 shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border/50 shadow-inner">
                        <CheckCircle2 className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-sm font-bold truncate text-foreground">{r.tipo_trabajo}</p>
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                          {format(new Date(r.created_date), "dd/MMM HH:mm", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {r.fase && (
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 border-0 ${r.es_finalizado ? "bg-emerald-500/15 text-emerald-700" : "bg-primary/10 text-primary"}`}>
                            {r.es_finalizado ? "✅ Finalizado" : r.fase}
                          </Badge>
                        )}
                        <span className="text-[11px] font-black text-primary">{r.cantidad} pzs</span>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[150px] font-medium">{r.proyecto_nombre}</span>
                      </div>
                      {r.notas && (
                        <p className="text-xs text-muted-foreground/90 mt-2 italic bg-muted/40 p-2.5 rounded-lg border border-border/40 line-clamp-2">
                          "{r.notas}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
