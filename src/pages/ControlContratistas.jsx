import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle2, AlertTriangle, HardHat, FolderKanban, Plus, Minus, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function ControlContratistas() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedContratista, setSelectedContratista] = useState("");
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
      toast.error("Error al actualizar la base de datos: " + err.message);
    }
  });

  // Adjust numerical progress
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

  // Change assigned contractor
  const handleReassignContractor = (project, codigo, tipo_trabajo, newContractor) => {
    const pId = project.id;
    const currentPartidas = Array.isArray(project.partidas_cotizacion) ? project.partidas_cotizacion : [];
    
    const newPartidas = currentPartidas.map(p => {
      if (p.codigo === codigo && p.tipo_trabajo === tipo_trabajo) {
        return { ...p, contratista: newContractor };
      }
      return p;
    });

    updateMutation.mutate({ pId, newPartidas });
    toast.success("Contratista reasignado exitosamente");
  };

  // Build Project View Data
  const selectedProject = safeProyectos.find(p => p.id === selectedProjectId);
  const partidasProjectView = Array.isArray(selectedProject?.partidas_cotizacion) ? selectedProject.partidas_cotizacion : [];

  // Get unique contractors across ALL projects for the dropdowns
  const allContractors = new Set();
  safeProyectos.forEach(p => {
    const parts = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
    parts.forEach(part => {
      if (part.tipo_trabajo && part.contratista) {
        // split by / just in case, but usually we just want the raw assigned string
        allContractors.add(part.contratista.trim());
      }
    });
  });
  allContractors.delete("Sin asignar");
  allContractors.delete("");
  const contractorsList = Array.from(allContractors).sort();

  // Get items for selected contractor across ALL projects
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

  // Export to Excel function
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

  const renderTableRow = (p, project) => {
    const restantes = Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0));
    const isComplete = restantes === 0 && p.cantidad_total > 0;
    const progress = p.cantidad_total > 0 ? ((p.cantidad_realizada || 0) / p.cantidad_total) * 100 : 0;
    
    // Fallback image if none
    const imgUrl = p.imagen_url || null;
    const cName = p.contratista || "Sin asignar";

    return (
      <tr key={`${project.id}-${p.codigo}-${p.tipo_trabajo}`} className={`border-b border-[#233554]/50 transition-colors hover:bg-[#233554]/30 ${isComplete ? 'bg-emerald-950/10' : ''}`}>
        <td className="p-3 align-middle">
          {imgUrl ? (
            <img src={imgUrl} alt="img" className="w-12 h-12 rounded-lg object-cover bg-black/50 border border-[#233554]" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#233554]/50 border border-[#233554] flex items-center justify-center text-blue-400">
              <HardHat className="w-5 h-5" />
            </div>
          )}
        </td>
        <td className="p-3 align-middle">
          <span className="font-mono text-blue-300 bg-blue-900/30 px-2 py-1 rounded text-xs">{p.codigo || "S/C"}</span>
        </td>
        <td className="p-3 align-middle max-w-[250px]">
          <p className="text-sm font-medium text-slate-200 line-clamp-2" title={p.tipo_trabajo}>{p.tipo_trabajo}</p>
        </td>
        <td className="p-3 align-middle min-w-[180px]">
          <Select 
            value={contractorsList.includes(cName) ? cName : "otro"} 
            onValueChange={(val) => {
              if (val !== "otro" && val !== cName) {
                handleReassignContractor(project, p.codigo, p.tipo_trabajo, val);
              }
            }}
          >
            <SelectTrigger className="h-8 bg-[#112240] border-[#233554] text-xs focus:ring-orange-500">
              <SelectValue>{cName}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#112240] border-blue-800/50 text-white z-50">
              <SelectItem value="otro" className="italic text-slate-400" disabled>{cName} (Actual)</SelectItem>
              {contractorsList.map(c => (
                <SelectItem key={c} value={c} className="focus:bg-orange-500/20 focus:text-orange-400 text-xs">
                  {c}
                </SelectItem>
              ))}
              <SelectItem value="Sin asignar" className="text-red-400 focus:bg-red-950/30 text-xs">Desasignar</SelectItem>
            </SelectContent>
          </Select>
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
            <Button 
              size="icon" 
              variant="outline" 
              className="h-8 w-8 bg-[#233554] border-none text-white hover:bg-orange-500 hover:text-white"
              onClick={() => handleAdjustProgress(project, p.codigo, p.tipo_trabajo, -1)}
              disabled={!p.cantidad_realizada || p.cantidad_realizada === 0}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Button 
              size="icon" 
              variant="outline" 
              className="h-8 w-8 bg-[#233554] border-none text-white hover:bg-orange-500 hover:text-white"
              onClick={() => handleAdjustProgress(project, p.codigo, p.tipo_trabajo, 1)}
              disabled={p.cantidad_realizada >= p.cantidad_total}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-[#0a192f] text-slate-100 font-sans">
      <PageHeader title="Control de Contratistas" description="Vista maestra y edición de asignaciones (Estilo Tabla)" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        <Tabs defaultValue="proyecto" className="w-full">
          <TabsList className="bg-[#112240] border border-[#233554] h-12 p-1 mb-8">
            <TabsTrigger value="proyecto" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300">
              <FolderKanban className="w-4 h-4 mr-2" /> Por Proyecto
            </TabsTrigger>
            <TabsTrigger value="contratista" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300">
              <Users className="w-4 h-4 mr-2" /> Por Contratista
            </TabsTrigger>
          </TabsList>

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
                    {!isLoading && safeProyectos.length === 0 && (
                      <div className="p-2 text-sm text-slate-400 text-center">No hay proyectos disponibles</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedProjectId && (
                <Button 
                  onClick={() => handleExportExcel(partidasProjectView, `Reporte_Proyecto_${selectedProject?.descripcion}`)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg h-11"
                >
                  <Download className="w-4 h-4 mr-2" /> Exportar Excel
                </Button>
              )}
            </div>

            {selectedProjectId ? (
              <div className="bg-[#112240] border border-[#233554] rounded-xl shadow-xl overflow-x-auto relative">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-blue-300 uppercase bg-[#0a192f]/80 sticky top-0 z-10 border-b border-[#233554]">
                    <tr>
                      <th className="px-3 py-4 font-semibold w-[60px]">Img</th>
                      <th className="px-3 py-4 font-semibold">Clave</th>
                      <th className="px-3 py-4 font-semibold">Descripción</th>
                      <th className="px-3 py-4 font-semibold">Contratista</th>
                      <th className="px-3 py-4 font-semibold text-center w-[80px]">Pedido</th>
                      <th className="px-3 py-4 font-semibold text-center w-[80px]">Listo</th>
                      <th className="px-3 py-4 font-semibold text-center w-[150px]">Avance</th>
                      <th className="px-3 py-4 font-semibold text-right w-[100px]">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#233554]/30">
                    {partidasProjectView.map(p => renderTableRow(p, selectedProject))}
                    {partidasProjectView.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-500">
                          Este proyecto no tiene artículos asignados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-blue-300/50">
                <FolderKanban className="w-20 h-20 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold text-blue-200">Selecciona un proyecto</h2>
                <p className="text-sm">Para ver y editar su programa en vista de tabla</p>
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
                    {contractorsList.map(c => (
                      <SelectItem key={c} value={c} className="focus:bg-orange-500/20 focus:text-orange-400">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedContratista && (
                <Button 
                  onClick={() => handleExportExcel(contractorItems, `Reporte_Contratista_${selectedContratista}`)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg h-11"
                >
                  <Download className="w-4 h-4 mr-2" /> Exportar Excel
                </Button>
              )}
            </div>

            {selectedContratista ? (
              <div className="bg-[#112240] border border-[#233554] rounded-xl shadow-xl overflow-x-auto relative">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-blue-300 uppercase bg-[#0a192f]/80 sticky top-0 z-10 border-b border-[#233554]">
                    <tr>
                      <th className="px-3 py-4 font-semibold w-[60px]">Img</th>
                      <th className="px-3 py-4 font-semibold">Proyecto</th>
                      <th className="px-3 py-4 font-semibold">Clave</th>
                      <th className="px-3 py-4 font-semibold">Descripción</th>
                      <th className="px-3 py-4 font-semibold">Contratista</th>
                      <th className="px-3 py-4 font-semibold text-center w-[80px]">Pedido</th>
                      <th className="px-3 py-4 font-semibold text-center w-[80px]">Listo</th>
                      <th className="px-3 py-4 font-semibold text-center w-[150px]">Avance</th>
                      <th className="px-3 py-4 font-semibold text-right w-[100px]">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#233554]/30">
                    {contractorItems.map(p => {
                      // We inject a "Proyecto" cell at the beginning just for this view
                      return (
                        <React.Fragment key={`${p.project?.id}-${p.codigo}-${p.tipo_trabajo}`}>
                           <tr className={`border-b border-[#233554]/50 transition-colors hover:bg-[#233554]/30 ${Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0)) === 0 && p.cantidad_total > 0 ? 'bg-emerald-950/10' : ''}`}>
                              <td className="p-3 align-middle">
                                {p.imagen_url ? (
                                  <img src={p.imagen_url} alt="img" className="w-12 h-12 rounded-lg object-cover bg-black/50 border border-[#233554]" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-[#233554]/50 border border-[#233554] flex items-center justify-center text-blue-400">
                                    <HardHat className="w-5 h-5" />
                                  </div>
                                )}
                              </td>
                              <td className="p-3 align-middle">
                                <span className="text-orange-400 font-semibold text-xs whitespace-nowrap">{p.project?.descripcion || "N/A"}</span>
                              </td>
                              <td className="p-3 align-middle">
                                <span className="font-mono text-blue-300 bg-blue-900/30 px-2 py-1 rounded text-xs">{p.codigo || "S/C"}</span>
                              </td>
                              <td className="p-3 align-middle max-w-[200px]">
                                <p className="text-sm font-medium text-slate-200 line-clamp-2" title={p.tipo_trabajo}>{p.tipo_trabajo}</p>
                              </td>
                              <td className="p-3 align-middle min-w-[180px]">
                                <Select 
                                  value={contractorsList.includes(p.contratista) ? p.contratista : "otro"} 
                                  onValueChange={(val) => {
                                    if (val !== "otro" && val !== p.contratista) {
                                      handleReassignContractor(p.project, p.codigo, p.tipo_trabajo, val);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 bg-[#112240] border-[#233554] text-xs focus:ring-orange-500">
                                    <SelectValue>{p.contratista}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#112240] border-blue-800/50 text-white z-50">
                                    <SelectItem value="otro" className="italic text-slate-400" disabled>{p.contratista} (Actual)</SelectItem>
                                    {contractorsList.map(c => (
                                      <SelectItem key={c} value={c} className="focus:bg-orange-500/20 focus:text-orange-400 text-xs">
                                        {c}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="Sin asignar" className="text-red-400 focus:bg-red-950/30 text-xs">Desasignar</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3 align-middle text-center font-medium">{p.cantidad_total || 0}</td>
                              <td className="p-3 align-middle text-center font-bold text-white">{p.cantidad_realizada || 0}</td>
                              <td className="p-3 align-middle min-w-[120px]">
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className={Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0)) === 0 && p.cantidad_total > 0 ? "text-emerald-400" : "text-orange-400"}>
                                      {Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0)) === 0 && p.cantidad_total > 0 ? "Terminado" : `Faltan ${Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0))}`}
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-[#233554] w-full rounded-full overflow-hidden">
                                    <div className={`h-full transition-all ${Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0)) === 0 && p.cantidad_total > 0 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${p.cantidad_total > 0 ? ((p.cantidad_realizada || 0) / p.cantidad_total) * 100 : 0}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 align-middle text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-8 w-8 bg-[#233554] border-none text-white hover:bg-orange-500 hover:text-white"
                                    onClick={() => handleAdjustProgress(p.project, p.codigo, p.tipo_trabajo, -1)}
                                    disabled={!p.cantidad_realizada || p.cantidad_realizada === 0}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="outline" 
                                    className="h-8 w-8 bg-[#233554] border-none text-white hover:bg-orange-500 hover:text-white"
                                    onClick={() => handleAdjustProgress(p.project, p.codigo, p.tipo_trabajo, 1)}
                                    disabled={p.cantidad_realizada >= p.cantidad_total}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                           </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-blue-300/50">
                <Users className="w-20 h-20 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold text-blue-200">Selecciona un contratista</h2>
                <p className="text-sm">Para ver y editar su programa en vista de tabla global</p>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
