import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HardHat, FolderKanban, Plus, Minus, Download, Globe } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { MultiSelect } from "@/components/ui/multi-select";
import AIAnalyst from "@/components/ui/AIAnalyst";

export default function ControlContratistas() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedContratista, setSelectedContratista] = useState("");
  const queryClient = useQueryClient();

  // Queries
  const { data: proyectos, isLoading: isLoadingProyectos } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => supabase.from('proyecto').select('*').order('created_date', { ascending: false }).then(res => res.data || []),
  });

  const { data: contratistasOficiales, isLoading: isLoadingContratistas } = useQuery({
    queryKey: ["contratistas"],
    queryFn: () => supabase.from('contratista').select('*').order('nombre', { ascending: true }).then(res => res.data || []),
  });

  const safeProyectos = proyectos || [];
  const safeContratistas = contratistasOficiales || [];
  const isLoading = isLoadingProyectos || isLoadingContratistas;

  // Formatting Contratistas for Dropdowns
  const contratistasOptions = safeContratistas.map(c => ({
    label: c.nombre,
    value: c.nombre
  }));

  const updateMutation = useMutation({
    mutationFn: async ({ pId, newPartidas }) => {
      const { error } = await supabase.from('proyecto').update({ partidas_cotizacion: newPartidas }).eq('id', pId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
    },
    onError: (err) => {
      toast.error("Error al actualizar la base de datos: " + err.message);
    }
  });

  // Action Handlers
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

  const handleReassignContractor = (project, codigo, tipo_trabajo, newContractorsArray) => {
    const pId = project.id;
    const currentPartidas = Array.isArray(project.partidas_cotizacion) ? project.partidas_cotizacion : [];
    const newContractorString = newContractorsArray.length > 0 ? newContractorsArray.join(" / ") : "Sin asignar";
    
    const newPartidas = currentPartidas.map(p => {
      if (p.codigo === codigo && p.tipo_trabajo === tipo_trabajo) {
        return { ...p, contratista: newContractorString };
      }
      return p;
    });
    updateMutation.mutate({ pId, newPartidas });
  };

  const handleExecuteAIChanges = (changes) => {
    changes.forEach(change => {
      const pId = change.proyecto_id;
      const project = safeProyectos.find(p => p.id === pId);
      if (project) {
        const currentPartidas = Array.isArray(project.partidas_cotizacion) ? project.partidas_cotizacion : [];
        const newPartidas = currentPartidas.map(p => {
          if (p.codigo === change.codigo && p.tipo_trabajo === change.tipo_trabajo) {
            return { ...p, contratista: change.nuevo_contratista };
          }
          return p;
        });
        updateMutation.mutate({ pId, newPartidas });
      }
    });
    toast.success("Cambios del Analista aplicados correctamente");
  };

  const handleExportExcel = (itemsToExport, filename) => {
    if (!itemsToExport || itemsToExport.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const exportData = itemsToExport.map(p => ({
      "Proyecto": p.project ? p.project.descripcion : (selectedProject?.descripcion || ""),
      "Clave": p.codigo || "",
      "Descripción": p.tipo_trabajo || "",
      "Contratista Asignado": p.contratista || "Sin asignar",
      "Pedido": p.cantidad_total || 0,
      "Completado": p.cantidad_realizada || 0,
      "Faltan": Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0))
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Control");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success("Reporte descargado");
  };

  // Data Pre-Processing for Views
  const globalItems = [];
  safeProyectos.forEach(p => {
    const parts = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
    parts.forEach(part => globalItems.push({ ...part, project: p }));
  });
  // Sort global items by project then by contractor
  globalItems.sort((a, b) => {
    if (a.project.descripcion < b.project.descripcion) return -1;
    if (a.project.descripcion > b.project.descripcion) return 1;
    const cA = a.contratista || "Sin asignar";
    const cB = b.contratista || "Sin asignar";
    return cA.localeCompare(cB);
  });

  const selectedProject = safeProyectos.find(p => p.id === selectedProjectId);
  const partidasProjectView = Array.isArray(selectedProject?.partidas_cotizacion) ? selectedProject.partidas_cotizacion : [];

  const contractorItems = [];
  if (selectedContratista) {
    safeProyectos.forEach(p => {
      const parts = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
      parts.forEach(part => {
        if ((part.contratista || "Sin asignar").includes(selectedContratista)) {
          contractorItems.push({ ...part, project: p });
        }
      });
    });
  }

  // Common Table Row Renderer
  const renderTableRow = (p, project, showProjectName = false) => {
    const restantes = Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0));
    const isComplete = restantes === 0 && p.cantidad_total > 0;
    const progress = p.cantidad_total > 0 ? ((p.cantidad_realizada || 0) / p.cantidad_total) * 100 : 0;
    const imgUrl = p.imagen_url || null;
    
    // Parse current contractor string into array for MultiSelect
    const rawContratista = p.contratista || "";
    const currentSelected = rawContratista === "Sin asignar" ? [] : rawContratista.split(" / ").map(s => s.trim()).filter(Boolean);

    return (
      <tr key={`${project.id}-${p.codigo}-${p.tipo_trabajo}`} className={`border-b border-[#233554]/50 transition-colors hover:bg-[#233554]/30 ${isComplete ? 'bg-emerald-950/10' : ''}`}>
        <td className="p-3 align-middle">
          {imgUrl ? (
            <img src={imgUrl} alt="img" className="w-10 h-10 rounded-lg object-cover bg-black/50 border border-[#233554]" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#233554]/50 border border-[#233554] flex items-center justify-center text-blue-400">
              <HardHat className="w-4 h-4" />
            </div>
          )}
        </td>
        {showProjectName && (
          <td className="p-3 align-middle">
            <span className="text-orange-400 font-semibold text-xs whitespace-nowrap">{project.descripcion || "N/A"}</span>
          </td>
        )}
        <td className="p-3 align-middle">
          <span className="font-mono text-blue-300 bg-blue-900/30 px-2 py-1 rounded text-xs">{p.codigo || "S/C"}</span>
        </td>
        <td className="p-3 align-middle max-w-[200px]">
          <p className="text-sm font-medium text-slate-200 line-clamp-2" title={p.tipo_trabajo}>{p.tipo_trabajo}</p>
        </td>
        <td className="p-3 align-middle min-w-[200px]">
          <MultiSelect 
            options={contratistasOptions} 
            selected={currentSelected} 
            onChange={(newSelection) => handleReassignContractor(project, p.codigo, p.tipo_trabajo, newSelection)}
            placeholder="Asignar..."
            className="w-full bg-[#112240] border-[#233554] text-xs focus:ring-orange-500"
          />
        </td>
        <td className="p-3 align-middle text-center font-medium">{p.cantidad_total || 0}</td>
        <td className="p-3 align-middle text-center font-bold text-white">{p.cantidad_realizada || 0}</td>
        <td className="p-3 align-middle min-w-[120px]">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px]">
              <span className={isComplete ? "text-emerald-400" : "text-orange-400"}>
                {isComplete ? "Terminado" : `Faltan ${restantes}`}
              </span>
              <span className="text-slate-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-[#233554] w-full rounded-full overflow-hidden">
              <div className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </td>
        <td className="p-3 align-middle text-right">
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="outline" className="h-7 w-7 bg-[#233554] border-none text-white hover:bg-orange-500 hover:text-white" onClick={() => handleAdjustProgress(project, p.codigo, p.tipo_trabajo, -1)} disabled={!p.cantidad_realizada || p.cantidad_realizada === 0}>
              <Minus className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="outline" className="h-7 w-7 bg-[#233554] border-none text-white hover:bg-orange-500 hover:text-white" onClick={() => handleAdjustProgress(project, p.codigo, p.tipo_trabajo, 1)} disabled={p.cantidad_realizada >= p.cantidad_total}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-[#0a192f] text-slate-100 font-sans">
      <PageHeader title="Control de Contratistas" description="Centro de mando: Operaciones y Asignaciones" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="bg-[#112240] border border-[#233554] h-12 p-1 mb-8 overflow-x-auto w-full justify-start flex-nowrap hide-scrollbar">
            <TabsTrigger value="global" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300 shrink-0">
              <Globe className="w-4 h-4 mr-2" /> Vista Global
            </TabsTrigger>
            <TabsTrigger value="proyecto" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300 shrink-0">
              <FolderKanban className="w-4 h-4 mr-2" /> Por Proyecto
            </TabsTrigger>
            <TabsTrigger value="contratista" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300 shrink-0">
              <Users className="w-4 h-4 mr-2" /> Por Contratista
            </TabsTrigger>
          </TabsList>

          {/* VISTA GLOBAL (MASTER TABLE) */}
          <TabsContent value="global" className="mt-0 space-y-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-slate-400">Mostrando todas las partidas de la fábrica agrupadas por proyecto.</p>
              <Button onClick={() => handleExportExcel(globalItems, `Reporte_Global_Goirand`)} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg h-9">
                <Download className="w-4 h-4 mr-2" /> Exportar Global
              </Button>
            </div>
            <div className="bg-[#112240] border border-[#233554] rounded-xl shadow-xl overflow-x-auto relative max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-blue-300 uppercase bg-[#0a192f]/95 sticky top-0 z-20 border-b border-[#233554] shadow-sm backdrop-blur-md">
                  <tr>
                    <th className="px-3 py-3 font-semibold w-[50px]">Img</th>
                    <th className="px-3 py-3 font-semibold">Proyecto</th>
                    <th className="px-3 py-3 font-semibold">Clave</th>
                    <th className="px-3 py-3 font-semibold">Descripción</th>
                    <th className="px-3 py-3 font-semibold">Contratistas (Multi)</th>
                    <th className="px-3 py-3 font-semibold text-center w-[80px]">Pedido</th>
                    <th className="px-3 py-3 font-semibold text-center w-[80px]">Listo</th>
                    <th className="px-3 py-3 font-semibold text-center w-[150px]">Avance</th>
                    <th className="px-3 py-3 font-semibold text-right w-[100px]">Editar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#233554]/30">
                  {globalItems.map(p => renderTableRow(p, p.project, true))}
                  {globalItems.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-10 text-slate-500">No hay datos en la fábrica.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* VISTA POR PROYECTO */}
          <TabsContent value="proyecto" className="mt-0">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-end mb-6">
              <div className="w-full md:w-1/3 space-y-2">
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
                  </SelectContent>
                </Select>
              </div>
              {selectedProjectId && (
                <Button onClick={() => handleExportExcel(partidasProjectView, `Reporte_Proyecto_${selectedProject?.descripcion}`)} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg h-11">
                  <Download className="w-4 h-4 mr-2" /> Exportar Excel
                </Button>
              )}
            </div>
            {selectedProjectId ? (
              <div className="bg-[#112240] border border-[#233554] rounded-xl shadow-xl overflow-x-auto relative">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-blue-300 uppercase bg-[#0a192f]/80 sticky top-0 z-10 border-b border-[#233554]">
                    <tr>
                      <th className="px-3 py-4 font-semibold w-[50px]">Img</th>
                      <th className="px-3 py-4 font-semibold">Clave</th>
                      <th className="px-3 py-4 font-semibold">Descripción</th>
                      <th className="px-3 py-4 font-semibold">Contratistas (Multi)</th>
                      <th className="px-3 py-4 font-semibold text-center w-[80px]">Pedido</th>
                      <th className="px-3 py-4 font-semibold text-center w-[80px]">Listo</th>
                      <th className="px-3 py-4 font-semibold text-center w-[150px]">Avance</th>
                      <th className="px-3 py-4 font-semibold text-right w-[100px]">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#233554]/30">
                    {partidasProjectView.map(p => renderTableRow(p, selectedProject, false))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-blue-300/50">
                <FolderKanban className="w-20 h-20 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold text-blue-200">Selecciona un proyecto</h2>
              </div>
            )}
          </TabsContent>

          {/* VISTA POR CONTRATISTA */}
          <TabsContent value="contratista" className="mt-0">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-end mb-6">
              <div className="w-full md:w-1/3 space-y-2">
                <label className="text-sm font-medium text-blue-200">Seleccionar Contratista</label>
                <Select value={selectedContratista} onValueChange={setSelectedContratista} disabled={isLoading}>
                  <SelectTrigger className="bg-[#112240] border-blue-800/50 text-white h-11 rounded-xl focus:ring-orange-500">
                    <SelectValue placeholder={isLoading ? "Cargando contratistas..." : "Selecciona un contratista..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#112240] border-blue-800/50 text-white z-50">
                    {safeContratistas.map(c => (
                      <SelectItem key={c.id} value={c.nombre} className="focus:bg-orange-500/20 focus:text-orange-400">
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedContratista && (
                <Button onClick={() => handleExportExcel(contractorItems, `Reporte_Contratista_${selectedContratista}`)} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg h-11">
                  <Download className="w-4 h-4 mr-2" /> Exportar Excel
                </Button>
              )}
            </div>
            {selectedContratista ? (
              <div className="bg-[#112240] border border-[#233554] rounded-xl shadow-xl overflow-x-auto relative">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-blue-300 uppercase bg-[#0a192f]/80 sticky top-0 z-10 border-b border-[#233554]">
                    <tr>
                      <th className="px-3 py-4 font-semibold w-[50px]">Img</th>
                      <th className="px-3 py-4 font-semibold">Proyecto</th>
                      <th className="px-3 py-4 font-semibold">Clave</th>
                      <th className="px-3 py-4 font-semibold">Descripción</th>
                      <th className="px-3 py-4 font-semibold">Contratistas (Multi)</th>
                      <th className="px-3 py-4 font-semibold text-center w-[80px]">Pedido</th>
                      <th className="px-3 py-4 font-semibold text-center w-[80px]">Listo</th>
                      <th className="px-3 py-4 font-semibold text-center w-[150px]">Avance</th>
                      <th className="px-3 py-4 font-semibold text-right w-[100px]">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#233554]/30">
                    {contractorItems.map(p => renderTableRow(p, p.project, true))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-blue-300/50">
                <Users className="w-20 h-20 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold text-blue-200">Selecciona un contratista</h2>
              </div>
            )}
          </TabsContent>

        </Tabs>

        {/* AI ANALYST SECTION */}
        <AIAnalyst 
          proyectos={safeProyectos} 
          onExecuteChanges={handleExecuteAIChanges}
          onExportExcel={(filename) => handleExportExcel(globalItems, filename)}
        />

      </div>
    </div>
  );
}
