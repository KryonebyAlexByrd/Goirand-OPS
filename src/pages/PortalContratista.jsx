import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, Factory, Loader2, LogOut } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PortalContratista() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const contratistaName = user?.contratista?.nombre || '';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: proyectos, error } = await supabase
        .from('proyecto')
        .select('id, descripcion, numero_proyecto, estado, partidas_cotizacion');

      if (!error && proyectos) {
        let allItems = [];
        const normalizedContratista = contratistaName.toLowerCase();

        proyectos.forEach(p => {
          const partidas = p.partidas_cotizacion || [];
          partidas.forEach(partida => {
            const contratistaStr = partida.contratista || '';
            const contratistasAsignados = contratistaStr.split('/').map(s => s.trim().toLowerCase());
            
            if (contratistasAsignados.includes(normalizedContratista)) {
              allItems.push({
                ...partida,
                proyectoNombre: p.descripcion,
                proyectoId: p.id,
                fechaDate: partida.fecha_estimada ? new Date(partida.fecha_estimada) : new Date(8640000000000000) // far future for sorting
              });
            }
          });
        });

        // Sort by date (earliest first)
        allItems.sort((a, b) => a.fechaDate - b.fechaDate);
        setItems(allItems);
      }
      setLoading(false);
    };

    if (contratistaName) {
      fetchData();
    }
  }, [contratistaName]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
              <Factory className="w-8 h-8 text-orange-500" />
              Portal de Contratista
            </h1>
            <p className="text-zinc-500 mt-1 font-medium">Bienvenido, <span className="text-orange-600">{contratistaName}</span></p>
          </div>
          <button 
            onClick={() => logout()}
            className="flex items-center gap-2 text-zinc-500 hover:text-red-600 transition-colors font-medium bg-zinc-100 hover:bg-red-50 px-4 py-2 rounded-full"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-orange-100 font-medium mb-1">Total Asignado</p>
                  <h3 className="text-4xl font-black">{items.length}</h3>
                  <p className="text-sm text-orange-200 mt-1">Partidas en tu lista</p>
                </div>
                <Package className="w-12 h-12 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-zinc-500 font-medium mb-1">Piezas Totales</p>
                  <h3 className="text-4xl font-black text-zinc-900">
                    {items.reduce((acc, item) => acc + (parseInt(item.cantidad_total) || 0), 0)}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">Suma de todas las partidas</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-zinc-500 font-medium mb-1">Faltantes</p>
                  <h3 className="text-4xl font-black text-red-600">
                    {items.reduce((acc, item) => acc + Math.max(0, (parseInt(item.cantidad_total) || 0) - (parseInt(item.cantidad_realizada) || 0)), 0)}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">Piezas pendientes por entregar</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla Maestra */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-zinc-900 text-white p-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Cronograma de Entregas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No tienes partidas asignadas en este momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-100/50">
                    <TableRow>
                      <TableHead className="font-bold text-zinc-900 w-[120px]">Entrega</TableHead>
                      <TableHead className="font-bold text-zinc-900 min-w-[200px]">Proyecto</TableHead>
                      <TableHead className="font-bold text-zinc-900">Clave</TableHead>
                      <TableHead className="font-bold text-zinc-900 min-w-[250px]">Descripción</TableHead>
                      <TableHead className="font-bold text-zinc-900 text-center">Total</TableHead>
                      <TableHead className="font-bold text-zinc-900 text-center">Listo</TableHead>
                      <TableHead className="font-bold text-zinc-900 text-center">Falta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const total = parseInt(item.cantidad_total) || 0;
                      const realizado = parseInt(item.cantidad_realizada) || 0;
                      const faltante = Math.max(0, total - realizado);
                      const isComplete = faltante === 0 && total > 0;
                      
                      let rowClass = "hover:bg-orange-50/50 transition-colors";
                      if (isComplete) rowClass += " bg-green-50/30 opacity-70";
                      
                      return (
                        <TableRow key={`${item.proyectoId}-${idx}`} className={rowClass}>
                          <TableCell className="font-medium">
                            {item.fecha_estimada ? (
                              <Badge variant={isComplete ? "outline" : "default"} className={isComplete ? "text-green-700 border-green-200" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}>
                                {format(parseISO(item.fecha_estimada), 'dd MMM yyyy', { locale: es })}
                              </Badge>
                            ) : (
                              <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Sin Fecha</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-zinc-800">{item.proyectoNombre}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm bg-zinc-100 px-2 py-1 rounded text-zinc-700">{item.codigo || '-'}</span>
                          </TableCell>
                          <TableCell className="text-zinc-700">
                            {item.tipo_trabajo}
                          </TableCell>
                          <TableCell className="text-center font-bold text-zinc-900">
                            {total}
                          </TableCell>
                          <TableCell className="text-center font-bold text-green-600">
                            {realizado}
                          </TableCell>
                          <TableCell className="text-center">
                            {isComplete ? (
                              <Badge className="bg-green-500">✓ Listo</Badge>
                            ) : (
                              <span className="font-black text-red-500">{faltante}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
