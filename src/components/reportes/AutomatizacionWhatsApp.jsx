import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mail, Plus, Pencil, Trash2, Clock, Check, X, AlertTriangle, Send, Loader2 } from "lucide-react";

const HORARIOS = [
  { tipo: "diario", label: "Diario", desc: "Todos los días a las 6:30 PM", color: "bg-white text-foreground border border-border" },
  { tipo: "semanal", label: "Semanal", desc: "Viernes a las 6:30 PM", color: "bg-primary text-white" },
  { tipo: "mensual", label: "Mensual", desc: "Día 30 de cada mes, 6:30 PM", color: "bg-foreground text-primary" },
];

function ContactoRow({ contacto, onEdit, onDelete, onToggle, onToggleTipo, onSendWhatsApp, sendingId }) {
  const esEmail = contacto.canal === "email";
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/20">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold">{contacto.nombre}</p>
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            {esEmail ? <Mail className="w-2.5 h-2.5" /> : <MessageCircle className="w-2.5 h-2.5" />}
            {esEmail ? "Email" : "WhatsApp"}
          </Badge>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${contacto.activo ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{contacto.activo ? "Activo" : "Inactivo"}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{esEmail ? contacto.email : contacto.numero}</p>
        <div className="flex flex-wrap gap-2">
          {HORARIOS.map(h => {
            const key = `recibe_${h.tipo}`;
            const activo = contacto[key];
            return (
              <button
                key={h.tipo}
                onClick={() => onToggleTipo(contacto.id, key, !activo)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${activo ? h.color : "bg-transparent text-muted-foreground border-border/40 opacity-50"}`}
              >
                {h.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!esEmail && contacto.activo && (
          <Button size="sm" variant="default" className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 mr-2" onClick={() => onSendWhatsApp(contacto)} disabled={sendingId === contacto.id}>
            {sendingId === contacto.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onToggle(contacto)}>
          {contacto.activo ? <X className="w-3.5 h-3.5 text-muted-foreground" /> : <Check className="w-3.5 h-3.5 text-emerald-600" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(contacto)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(contacto.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

const EMPTY = { nombre: "", canal: "email", numero: "", email: "", activo: true, recibe_diario: true, recibe_semanal: true, recibe_mensual: true };

export default function AutomatizacionWhatsApp() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(null); // null = cerrado, EMPTY = nuevo, obj = editar
  const [form, setForm] = useState(EMPTY);
  const [sendingId, setSendingId] = useState(null);

  const { data: contactos = [] } = useQuery({
    queryKey: ["automatizacion-whatsapp"],
    queryFn: () => supabase.from('automatizacionWhatsApp').select('*').order('nombre', { ascending: true }).limit(100).then(res => res.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["automatizacion-whatsapp"] });

  const createMut = useMutation({ mutationFn: d => supabase.from('automatizacionWhatsApp').insert(d).select().then(res => res.data[0]), onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => supabase.from('automatizacionWhatsApp').update(data).eq('id', id).select().then(res => res.data[0]), onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: id => supabase.from('automatizacionWhatsApp').delete().eq('id', id), onSuccess: invalidate });

  const handleOpen = (c = null) => { setForm(c ? { ...c } : EMPTY); setEditando(c || EMPTY); };
  const handleClose = () => setEditando(null);

  const handleSave = () => {
    if (!form.nombre) return;
    if (form.canal === "email" && !form.email) return;
    if (form.canal === "whatsapp" && !form.numero) return;
    if (editando?.id) {
      updateMut.mutate({ id: editando.id, data: form });
    } else {
      createMut.mutate(form);
    }
    handleClose();
  };

  const handleToggle = (c) => updateMut.mutate({ id: c.id, data: { activo: !c.activo } });
  const handleToggleTipo = (id, key, val) => updateMut.mutate({ id, data: { [key]: val } });
  const handleDelete = (id) => deleteMut.mutate(id);

  const handleSendWhatsApp = async (contacto) => {
    setSendingId(contacto.id);
    try {
      const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
      const res = await fetch(`${baseUrl}/api/generate-ai-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: 'diario' })
      });
      const data = await res.json();
      if (data.report) {
        const text = encodeURIComponent(data.report);
        const numeroLimpio = contacto.numero.replace(/\D/g, '');
        window.open(`https://wa.me/${numeroLimpio}?text=${text}`, '_blank');
      }
    } catch (e) {
      console.error(e);
      alert("Error al generar reporte de IA");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Automatización de Reportes
          </CardTitle>
          <Button size="sm" onClick={() => handleOpen()}>
            <Plus className="w-4 h-4 mr-1" /> Agregar contacto
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aviso de estado real de la integración */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>WhatsApp:</strong> Como elegimos la opción de botón manual, ahora podrás enviar reportes por WhatsApp dando clic al botón verde "Compartir" después de generar el reporte con IA.{" "}
            <strong>Email:</strong> 100% Automático — el sistema (Backend Node.js) mandará el resumen diario/semanal automáticamente a los correos configurados.
          </p>
        </div>

        {/* Horarios info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {HORARIOS.map(h => (
            <div key={h.tipo} className={`rounded-xl p-3 flex items-start gap-2.5 ${h.color}`}>
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">{h.label}</p>
                <p className="text-[11px] opacity-80">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        {editando !== null && (
          <div className="rounded-xl border border-primary/30 bg-accent/30 p-4 space-y-3">
            <p className="text-sm font-semibold">{editando?.id ? "Editar contacto" : "Nuevo contacto"}</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Canal de envío</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(f => ({ ...f, canal: "email" }))}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${form.canal === "email" ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border"}`}>
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button type="button" onClick={() => setForm(f => ({ ...f, canal: "whatsapp" }))}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${form.canal === "whatsapp" ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border"}`}>
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                <Input placeholder="Ej: Juan García" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              {form.canal === "email" ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Correo electrónico</label>
                  <Input type="email" placeholder="Ej: juan@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Número WhatsApp (código país + 10 dígitos, ej: 52 + número)</label>
                  <Input placeholder="Ej: 5215512345678" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {HORARIOS.map(h => {
                const key = `recibe_${h.tipo}`;
                return (
                  <label key={h.tipo} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="accent-primary" />
                    <span className="text-sm">{h.label}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave}>Guardar</Button>
              <Button size="sm" variant="outline" onClick={handleClose}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* List */}
        {contactos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay números configurados aún</p>
        ) : (
          <div className="space-y-2">
            {contactos.map(c => (
              <ContactoRow
                key={c.id}
                contacto={c}
                onEdit={handleOpen}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onToggleTipo={handleToggleTipo}
                onSendWhatsApp={handleSendWhatsApp}
                sendingId={sendingId}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground pt-1">
          Los reportes por email se generan y envían automáticamente en los horarios indicados. Activa o desactiva individualmente qué tipo de reporte recibe cada contacto.
        </p>
      </CardContent>
    </Card>
  );
}
