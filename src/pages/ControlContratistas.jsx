import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Users, CheckCircle2, AlertTriangle, FileSpreadsheet, HardHat } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function ControlContratistas() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: proyectos, isLoading } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => supabase.from('proyecto').select('*').order('created_at', { ascending: false }).then(res => res.data || []),
  });

  const safeProyectos = proyectos || [];
  const selectedProject = safeProyectos.find(p => p.id === selectedProjectId);
  const partidas = Array.isArray(selectedProject?.partidas_cotizacion) ? selectedProject.partidas_cotizacion : [];

  const updateMutation = useMutation({
    mutationFn: (newPartidas) => supabase.from('proyecto').update({ partidas_cotizacion: newPartidas }).eq('id', selectedProjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] });
      toast.success("Programa de Contratistas actualizado exitosamente");
      setIsUploading(false);
    },
    onError: (err) => {
      toast.error("Error al actualizar: " + err.message);
      setIsUploading(false);
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedProjectId) return;
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Find headers
        let headerRow = -1;
        let claveIdx = -1;
        let asignacionIdx = -1;

        for (let i = 0; i < Math.min(20, data.length); i++) {
          const row = data[i] || [];
          row.forEach((cell, idx) => {
            if (typeof cell === 'string') {
              const lower = cell.toLowerCase().trim();
              if (lower === 'clave') claveIdx = idx;
              if (lower.includes('asignacion') || lower.includes('asiganacion')) asignacionIdx = idx;
            }
          });
          if (claveIdx !== -1 && asignacionIdx !== -1) {
            headerRow = i;
            break;
          }
        }

        if (headerRow === -1) {
          throw new Error("No se encontraron las columnas 'Clave' y 'Asignacion' en la O.A.");
        }

        const assignments = {};
        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          const clave = row[claveIdx];
          let asignacion = row[asignacionIdx];
          if (clave && asignacion) {
            asignacion = asignacion.toString().replace(/\r\n/g, ' / ').replace(/\n/g, ' / ').trim();
            assignments[clave.toString().trim()] = asignacion;
          }
        }

        let updatedCount = 0;
        const newPartidas = partidas.map(p => {
          const clave = p.codigo?.trim();
          if (clave && assignments[clave]) {
            updatedCount++;
            return { ...p, contratista: assignments[clave] };
          }
          return p;
        });

        if (updatedCount === 0) {
          throw new Error("No hubo coincidencias entre las claves de la O.A. y los artículos del proyecto actual.");
        }

        updateMutation.mutate(newPartidas);
      } catch (err) {
        toast.error(err.message);
        setIsUploading(false);
      }
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  const grouped = {};
  partidas.forEach(p => {
    if (!p.tipo_trabajo) return;
    const cont = p.contratista || "Sin asignar";
    if (!grouped[cont]) grouped[cont] = [];
    grouped[cont].push(p);
  });

  return (
    <div className="min-h-screen pb-20 bg-[#0a192f] text-slate-100 font-sans">
      <PageHeader title="Control de Contratistas" description="Automatizado vía O.A. y Cotizaciones" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-8 items-end">
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
            <div>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                id="oa-upload"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <label
                htmlFor="oa-upload"
                className={`cursor-pointer inline-flex items-center justify-center h-11 px-6 rounded-xl font-semibold transition-all shadow-lg ${isUploading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white hover:shadow-orange-600/25'}`}
              >
                {isUploading ? "Procesando O.A..." : <><FileSpreadsheet className="w-4 h-4 mr-2" /> Importar O.A. (Excel)</>}
              </label>
            </div>
          )}
        </div>

        {!selectedProjectId && (
          <div className="flex flex-col items-center justify-center py-20 text-blue-300/50">
            <HardHat className="w-20 h-20 mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-blue-200">Selecciona un proyecto</h2>
            <p className="text-sm">Elige un proyecto para ver su programa de contratistas o importar una O.A.</p>
          </div>
        )}

        {selectedProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.keys(grouped).sort().map(contratista => {
              const items = grouped[contratista];
              const totalPiezas = items.reduce((sum, p) => sum + (p.cantidad_total || 0), 0);
              const totalEntregadas = items.reduce((sum, p) => sum + (p.cantidad_realizada || 0), 0);
              const progress = totalPiezas > 0 ? (totalEntregadas / totalPiezas) * 100 : 0;
              
              const isUnassigned = contratista === "Sin asignar";

              return (
                <Card key={contratista} className={`bg-[#112240] border-[#233554] shadow-xl overflow-hidden ${isUnassigned ? 'opacity-80' : ''}`}>
                  <CardHeader className="pb-3 border-b border-[#233554]/50 bg-[#0a192f]/50">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                        <Users className={`w-5 h-5 ${isUnassigned ? 'text-slate-500' : 'text-orange-500'}`} />
                        {contratista}
                      </CardTitle>
                      <span className="text-xs font-mono bg-blue-900/50 text-blue-200 px-2 py-1 rounded-md border border-blue-800/50">
                        {totalEntregadas} / {totalPiezas} ENTREGADAS
                      </span>
                    </div>
                    <div className="h-1.5 mt-4 bg-[#233554] w-full rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-[#233554]/50 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {items.map((p, idx) => {
                        const restantes = Math.max(0, (p.cantidad_total || 0) - (p.cantidad_realizada || 0));
                        const isComplete = restantes === 0 && p.cantidad_total > 0;
                        return (
                          <div key={idx} className="p-4 flex gap-4 items-center hover:bg-[#233554]/30 transition-colors">
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
                              <div className="flex justify-between mt-1 text-xs text-slate-400">
                                <span>{p.cantidad_realizada || 0} hechas</span>
                                <span>Total: {p.cantidad_total || 0}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
