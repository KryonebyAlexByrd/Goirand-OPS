import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Users, CheckCircle2, AlertTriangle, FileSpreadsheet, HardHat, RefreshCw, FolderKanban, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function ControlContratistas() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedContratista, setSelectedContratista] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: proyectos, isLoading } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => supabase.from('proyecto').select('*').order('created_date', { ascending: false }).then(res => res.data || []),
  });

  const safeProyectos = proyectos || [];
  
  const updateMutation = useMutation({
    mutationFn: async ({ pId, newPartidas }) => {
      const { error } = await supabase.from('proyecto').update({ partidas_cotizacion: newPartidas }).eq('id', pId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
    },
    onError: (err) => {
      toast.error("Error al actualizar avance: " + err.message);
    }
  });

  const handleAdjustProgress = (project, codigo, tipo_trabajo, change) => {
    const pId = project.id;
    const currentPartidas = Array.isArray(project.partidas_cotizacion) ? project.partidas_cotizacion : [];
    
    const newPartidas = currentPartidas.map(p => {
      if (p.codigo === codigo && p.tipo_trabajo === tipo_trabajo) {
        let current = p.cantidad_realizada || 0;
        let next = current + change;
        if (next < 0) next = 0;
        if (next > (p.cantidad_total || 0)) next = p.cantidad_total || 0;
        return { ...p, cantidad_realizada: next };
      }
      return p;
    });

    updateMutation.mutate({ pId, newPartidas });
  };

  // Build Project View Data
  const selectedProject = safeProyectos.find(p => p.id === selectedProjectId);
  const partidasProjectView = Array.isArray(selectedProject?.partidas_cotizacion) ? selectedProject.partidas_cotizacion : [];
  const groupedByContratista = {};
  partidasProjectView.forEach(p => {
    if (!p.tipo_trabajo) return;
    const cont = p.contratista || "Sin asignar";
    if (!groupedByContratista[cont]) groupedByContratista[cont] = [];
    groupedByContratista[cont].push(p);
  });

  // Build Contractor View Data
  // Get unique contractors across ALL projects
  const allContractors = new Set();
  safeProyectos.forEach(p => {
    const parts = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
    parts.forEach(part => {
      if (part.tipo_trabajo) allContractors.add(part.contratista || "Sin asignar");
    });
  });
  const contractorsList = Array.from(allContractors).sort();

  // Get items for selected contractor across ALL projects
  const contractorItemsByProject = {};
  if (selectedContratista) {
    safeProyectos.forEach(p => {
      const parts = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
      const assignedParts = parts.filter(part => (part.contratista || "Sin asignar") === selectedContratista);
      if (assignedParts.length > 0) {
        contractorItemsByProject[p.id] = {
          project: p,
          items: assignedParts
        };
      }
    });
  }

  const renderItemCard = (p, project) => {
    const restantes = Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0));
    const isComplete = restantes === 0 && p.cantidad_total > 0;
    const progress = p.cantidad_total > 0 ? ((p.cantidad_realizada || 0) / p.cantidad_total) * 100 : 0;

    return (
      <div key={`${p.codigo}-${p.tipo_trabajo}`} className="p-4 hover:bg-[#233554]/30 transition-colors">
        <div className="flex gap-4 items-center mb-2">
          {p.imagen_url ? (
            <img src={p.imagen_url} alt="img" className="w-12 h-12 rounded-lg object-cover bg-black/50 border border-[#233554] shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#233554]/50 border border-[#233554] flex items-center justify-center text-blue-400 shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2 mb-1">
              <span className="text-[10px] font-mono text-blue-300 bg-blue-900/30 px-1.5 rounded">{p.codigo}</span>
              {isComplete ? (
                <span className="text-[10px] flex items-center text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1"/> Terminado</span>
              ) : (
                <span className="text-[10px] flex items-center text-orange-400"><AlertTriangle className="w-3 h-3 mr-1"/> Faltan {restantes}</span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-200 truncate">{p.tipo_trabajo}</p>
          </div>
        </div>

        <div className="bg-[#112240] p-2 rounded-lg border border-[#233554]/50 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Avance: <strong className="text-white">{p.cantidad_realizada || 0}</strong> / {p.cantidad_total || 0}
          </div>
          <div className="flex gap-1">
            <Button 
              size="icon" 
              variant="outline" 
              className="h-7 w-7 bg-[#233554] border-none text-white hover:bg-orange-500 hover:text-white"
              onClick={() => handleAdjustProgress(project, p.codigo, p.tipo_trabajo, -1)}
              disabled={!p.cantidad_realizada || p.cantidad_realizada === 0}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Button 
              size="icon" 
              variant="outline" 
              className="h-7 w-7 bg-[#233554] border-none text-white hover:bg-orange-500 hover:text-white"
              onClick={() => handleAdjustProgress(project, p.codigo, p.tipo_trabajo, 1)}
              disabled={p.cantidad_realizada >= p.cantidad_total}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="h-1 mt-2 bg-[#233554] w-full rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-[#0a192f] text-slate-100 font-sans">
      <PageHeader title="Control de Contratistas" description="Vista maestra y edición de asignaciones" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        <Tabs defaultValue="proyecto" className="w-full">
          <TabsList className="bg-[#112240] border border-[#233554] h-12 p-1 mb-8">
            <TabsTrigger value="proyecto" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300">
              <FolderKanban className="w-4 h-4 mr-2" /> Vista por Proyecto
            </TabsTrigger>
            <TabsTrigger value="contratista" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300">
              <Users className="w-4 h-4 mr-2" /> Vista por Contratista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proyecto" className="mt-0">
            <div className="w-full md:w-1/3 space-y-2 mb-8">
              <label className="text-sm font-medium text-blue-200">Seleccionar Proyecto</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoading}>
                <SelectTrigger className="bg-[#112240] border-blue-800/50 text-white h-11 rounded-xl focus:ring-orange-500">
                  <SelectValue placeholder={isLoading ? "Cargando proyectos..." : "Selecciona un proyecto..."} />
                </SelectTrigger>
                <SelectContent className="bg-[#112240] border-blue-800/50 text-white z-50">
                  {safeProyectos.filter(p => !p.parent_project_id).map(p => (
                    <SelectItem key={p.id} value={p.id} className="focus:bg-orange-500/20 focus:text-orange-400">
                      {p.numero_proyecto} - {p.descripcion}
                    </SelectItem>
                  ))}
                  {!isLoading && safeProyectos.length === 0 && (
                    <div className="p-2 text-sm text-slate-400 text-center">No hay proyectos disponibles</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedProjectId ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.keys(groupedByContratista).sort().map(contratista => (
                  <Card key={contratista} className={`bg-[#112240] border-[#233554] shadow-xl overflow-hidden ${contratista === "Sin asignar" ? 'opacity-80' : ''}`}>
                    <CardHeader className="pb-3 border-b border-[#233554]/50 bg-[#0a192f]/50">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                        <Users className={`w-5 h-5 ${contratista === "Sin asignar" ? 'text-slate-500' : 'text-orange-500'}`} />
                        {contratista}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-[#233554]/50 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {groupedByContratista[contratista].map((p) => renderItemCard(p, selectedProject))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-blue-300/50">
                <FolderKanban className="w-20 h-20 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold text-blue-200">Selecciona un proyecto</h2>
                <p className="text-sm">Elige un proyecto para ver sus asignaciones</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="contratista" className="mt-0">
            <div className="w-full md:w-1/3 space-y-2 mb-8">
              <label className="text-sm font-medium text-blue-200">Seleccionar Contratista</label>
              <Select value={selectedContratista} onValueChange={setSelectedContratista} disabled={isLoading}>
                <SelectTrigger className="bg-[#112240] border-blue-800/50 text-white h-11 rounded-xl focus:ring-orange-500">
                  <SelectValue placeholder={isLoading ? "Cargando contratistas..." : "Selecciona un contratista..."} />
                </SelectTrigger>
                <SelectContent className="bg-[#112240] border-blue-800/50 text-white z-50">
                  {contractorsList.map(c => (
                    <SelectItem key={c} value={c} className="focus:bg-orange-500/20 focus:text-orange-400">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedContratista ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.values(contractorItemsByProject).map(({ project, items }) => (
                  <Card key={project.id} className="bg-[#112240] border-[#233554] shadow-xl overflow-hidden">
                    <CardHeader className="pb-3 border-b border-[#233554]/50 bg-[#0a192f]/50">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                        <FolderKanban className="w-5 h-5 text-orange-500" />
                        {project.descripcion}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-[#233554]/50 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {items.map((p) => renderItemCard(p, project))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-blue-300/50">
                <Users className="w-20 h-20 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold text-blue-200">Selecciona un contratista</h2>
                <p className="text-sm">Elige un contratista para ver todo lo que tiene asignado en la fábrica</p>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
