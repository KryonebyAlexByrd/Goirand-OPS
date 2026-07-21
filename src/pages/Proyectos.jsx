import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Calendar, DollarSign, Pencil } from "lucide-react";
import ProyectoForm from "@/components/proyectos/ProyectoForm";
import ProyectoEditDialog from "@/components/proyectos/ProyectoEditDialog";
import { cn } from "@/lib/utils";

function getTrafficLight(p) {
  if (!p.fecha_entrega_estimada) return "amarillo";
  const hoy = new Date();
  const entrega = new Date(p.fecha_entrega_estimada);
  const diffDays = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));

  // Si tiene partidas, calculamos basándonos en ellas
  const partidas = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
  if (partidas.length > 0) {
    const totalRestante = partidas.reduce((s, pt) => s + Math.max(0, (pt.cantidad_total || 0) - (pt.cantidad_realizada || 0)), 0);
    if (diffDays < 0) return "rojo";
    if (totalRestante === 0) return "verde";
    const porDia = diffDays > 0 ? totalRestante / diffDays : Infinity;
    if (diffDays < 7 && totalRestante > 0) return "rojo";
    if (porDia > 15) return "rojo";
    if (porDia > 8) return "amarillo";
    return "verde";
  }

  // Fallback: usa % de avance
  const avance = p.porcentaje_avance || 0;
  if (diffDays < 0) return "rojo";
  if (diffDays < 15 && avance < 80) return "rojo";
  if (diffDays < 30 && avance < 60) return "amarillo";
  return "verde";
}

const lightColors = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500"
};

export default function Proyectos() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState(null);
  const queryClient = useQueryClient();

  const { data: proyectos = [], isLoading } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => supabase.from('proyecto').select('*').order('created_date', { ascending: false }).limit(100).then(res => res.data),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => supabase.from('cliente').select('*').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabase.from('proyecto').insert(data).select().then(res => res.data[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      setDialogOpen(false);
    },
  });


  const openNew = () => { setEditingProyecto(null); setDialogOpen(true); };
  const openEdit = (p, e) => { e.preventDefault(); e.stopPropagation(); setEditingProyecto(p); };

  const handleSubmit = (data) => {
    createMutation.mutate(data);
  };

  const filtered = proyectos.filter(p =>
    (p.descripcion || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.numero_proyecto || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.cliente_nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatMoney = (v) => v ? `$${Number(v).toLocaleString("es-MX")}` : "—";

  return (
    <div>
      <PageHeader title="Proyectos" description="Gestión y seguimiento de proyectos">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input placeholder="Buscar por número o nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-5 w-64 glass-input rounded-full" />
        </div>
        <Button className="bg-orange-600 hover:bg-orange-500 rounded-full text-white font-bold transition-transform hover:scale-[1.02] w-full sm:w-auto" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Proyecto
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const light = getTrafficLight(p);
            return (
              <Link key={p.id} to={`/proyectos/${p.id}`}>
                <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] hover:border-orange-500/30 transition-all duration-300 h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-card", lightColors[light],
                          light === "rojo" ? "ring-red-200" : light === "amarillo" ? "ring-amber-200" : "ring-emerald-200"
                        )} />
                        <span className="text-xs font-mono text-muted-foreground">{p.numero_proyecto}</span>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <StatusBadge status={p.estado} />
                        <StatusBadge status={p.prioridad} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 -mr-1"
                          onClick={(e) => openEdit(p, e)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{p.descripcion}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{p.cliente_nombre}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <Progress value={p.porcentaje_avance || 0} className="flex-1 h-2" />
                      <span className="text-xs font-bold text-foreground">{p.porcentaje_avance || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {p.fecha_entrega_estimada || "Sin fecha"}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatMoney(p.monto_total)}
                      </span>
                    </div>
                    {(p.fabricas_asignadas || []).length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {(p.fabricas_asignadas || []).map(f => (
                          <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Crear nuevo proyecto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
          </DialogHeader>
          <ProyectoForm
            clientes={clientes}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Editar proyecto */}
      {editingProyecto && (
        <ProyectoEditDialog
          proyecto={editingProyecto}
          open={!!editingProyecto}
          onClose={() => setEditingProyecto(null)}
        />
      )}
    </div>
  );
}
