import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign, Factory, HardHat, FileText, Camera, Package, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ProyectoEditDialog from "@/components/proyectos/ProyectoEditDialog";
import PartidasCotizacion from "@/components/proyectos/PartidasCotizacion";

export default function ProyectoDetalle() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = window.location.pathname.split("/").pop();
  const [editOpen, setEditOpen] = useState(false);

  const { data: proyecto, isLoading } = useQuery({
    queryKey: ["proyecto", id],
    queryFn: async () => {
      const list = await supabase.from('proyecto').select('*').match({ id }).then(res => res.data);
      return list[0];
    },
    enabled: !!id,
  });

  const { data: registros = [] } = useQuery({
    queryKey: ["registros-proyecto", id],
    queryFn: () => supabase.from('registro_trabajo').select('*').match({ proyecto_id: id }).order('created_date', { ascending: false }).limit(100).then(res => res.data),
    enabled: !!id,
  });

  const isAdmin = true; // All users viewing ProyectoDetalle via admin layout are admins

  if (isLoading || !proyecto) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const formatMoney = (v) => v ? `$${Number(v).toLocaleString("es-MX")}` : "—";
  const contratistas = Array.isArray(proyecto.contratistas_asignados) ? proyecto.contratistas_asignados : [];
  const pagos = Array.isArray(proyecto.pagos_programados) ? proyecto.pagos_programados : [];

  return (
    <div>
      <PageHeader title={proyecto.numero_proyecto} description={proyecto.descripcion}>
        <Link to="/proyectos">
          <Button variant="outline" size="sm" className="glass-input rounded-full border-white/10 hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </Link>
        <Button size="sm" onClick={() => setEditOpen(true)} className="bg-orange-600 hover:bg-orange-500 rounded-full text-white font-bold transition-transform hover:scale-[1.02]">
          <Pencil className="w-4 h-4 mr-2" /> Editar
        </Button>
      </PageHeader>

      {editOpen && (
        <ProyectoEditDialog proyecto={proyecto} open={editOpen} onClose={() => setEditOpen(false)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <StatusBadge status={proyecto.estado} />
                <StatusBadge status={proyecto.prioridad} />
                {proyecto.tipo_producto && <Badge variant="outline">{proyecto.tipo_producto}</Badge>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-semibold">{proyecto.cliente_nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fábrica</p>
                  <p className="text-sm font-semibold">{proyecto.fabrica_asignada}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Inicio</p>
                  <p className="text-sm font-semibold">{proyecto.fecha_inicio || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Entrega</p>
                  <p className="text-sm font-semibold">{proyecto.fecha_entrega_estimada || "Sin definir"}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Avance</span>
                  <span className="text-sm font-bold">{proyecto.porcentaje_avance || 0}%</span>
                </div>
                <Progress value={proyecto.porcentaje_avance || 0} className="h-3" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Fase actual: <span className="font-semibold text-foreground">{proyecto.fase_actual || "—"}</span></p>
            </CardContent>
          </Card>

          {/* Financiero */}
          <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Financiero</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Monto Total</p>
                  <p className="text-lg font-bold">{formatMoney(proyecto.monto_total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Anticipo Recibido</p>
                  <p className="text-lg font-bold text-emerald-600">{formatMoney(proyecto.anticipo_recibido)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-bold text-amber-600">
                    {formatMoney((proyecto.monto_total || 0) - (proyecto.anticipo_recibido || 0))}
                  </p>
                </div>
              </div>
              {pagos.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Pagos Programados</p>
                  {pagos.map((pago, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                      <span>{pago.descripcion}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatMoney(pago.monto)}</span>
                        <Badge variant={pago.pagado ? "default" : "outline"} className={cn("text-xs", pago.pagado && "bg-emerald-500")}>
                          {pago.pagado ? "Pagado" : "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Partidas de cotización */}
          <PartidasCotizacion proyecto={proyecto} isAdmin={isAdmin} />

          {/* Registros de trabajo */}
          <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Registros de Trabajo ({registros.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {registros.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Sin registros aún</p>
              ) : (
                <div className="space-y-2">
                  {registros.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                      {r.fotos?.length > 0 ? (
                        <img src={r.fotos[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.trabajador_nombre}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">{r.tipo_trabajo}</span>
                          {r.fase && (
                            <Badge variant="outline" className={`text-[10px] ${r.es_finalizado ? "border-emerald-500 text-emerald-600" : ""}`}>
                              {r.es_finalizado ? "✅ " : ""}{r.fase}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{r.cantidad || 1} pza(s) · {r.fecha} {r.hora_registro}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contratistas */}
          <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><HardHat className="w-4 h-4 text-primary" /> Contratistas ({contratistas.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {contratistas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin contratistas asignados</p>
              ) : (
                <div className="space-y-2">
                  {contratistas.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {c.nombre?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground">{c.categoria}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          {proyecto.notas_internas && (
            <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Notas Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proyecto.notas_internas}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
