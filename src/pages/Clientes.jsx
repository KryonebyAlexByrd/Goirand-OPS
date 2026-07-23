import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Phone, Mail, MapPin, Building2, Star, Loader2, Save, Pencil, Camera } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = { nombre: "", empresa: "", email: "", telefono: "", direccion: "", tipo: "Empresa", imagen_url: "", notas: "" };

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => supabase.from('cliente').select('*').order('created_date', { ascending: false }).limit(100).then(res => res.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingId
      ? supabase.from('cliente').update(data).eq('id', editingId).select().then(res => {
          if (res.error) throw res.error;
          return res.data[0];
        })
      : supabase.from('cliente').insert(data).select().then(res => {
          if (res.error) throw res.error;
          return res.data[0];
        }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast.success(editingId ? "Cliente actualizado" : "Cliente creado");
    },
    onError: (err) => {
      toast.error("Error en cliente: " + (err.message || JSON.stringify(err)));
    }
  });

  const openNew = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (c) => { setEditingId(c.id); setForm({ nombre: c.nombre || "", empresa: c.empresa || "", email: c.email || "", telefono: c.telefono || "", direccion: c.direccion || "", tipo: c.tipo || "Empresa", imagen_url: c.imagen_url || "", notas: c.notas || "" }); setDialogOpen(true); };

  const handleImgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const { file_url } = await Promise.resolve({ file_url: 'https://placehold.co/600x400.png' });
    setForm(f => ({ ...f, imagen_url: file_url }));
    setUploadingImg(false);
  };

  const filtered = clientes.filter(c =>
    (c.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.empresa || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Clientes" description="Base de clientes">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-5 w-full glass-input rounded-full" />
        </div>
        <Button className="bg-orange-600 hover:bg-orange-500 rounded-full text-white font-bold transition-transform hover:scale-[1.02] w-full sm:w-auto" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Nuevo Cliente</Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="glass-card-dark border-white/10 shadow-2xl rounded-3xl hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] hover:border-orange-500/30 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                {c.imagen_url ? (
                  <img src={c.imagen_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                    {(c.nombre || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{c.nombre}</h3>
                    {c.favorito && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                  </div>
                  {c.empresa && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {c.empresa}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    {c.telefono && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {c.telefono}</p>}
                    {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</p>}
                    {c.direccion && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.direccion}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="flex-shrink-0 -mt-1">
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            {/* Imagen */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0">
                {form.imagen_url ? (
                  <img src={form.imagen_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{(form.nombre || "?")[0]?.toUpperCase()}</span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()} disabled={uploadingImg}>
                {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Camera className="w-4 h-4 mr-2" /> Foto</>}
              </Button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImgUpload} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Empresa</Label><Input value={form.empresa} onChange={(e) => setForm(f => ({ ...f, empresa: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={form.direccion} onChange={(e) => setForm(f => ({ ...f, direccion: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Empresa">Empresa</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={!form.nombre || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Guardar</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
