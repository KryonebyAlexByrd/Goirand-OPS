import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Lock, History, Save, LogOut, Loader2, UserCircle } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const AREAS = [
  "Contratista", "Corte", "Barniz", "Empaque", "Herraje", "Otro"
];

export default function MiCuenta() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState(user?.nombre || "");
  const [area, setArea] = useState(user?.area_principal || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { data: historial, isLoading: loadingHistory } = useQuery({
    queryKey: ["mi-historial", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registro_trabajo')
        .select(`
          *,
          proyecto (numero_proyecto, descripcion)
        `)
        .eq('encargado_id', user?.id)
        .order('created_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const updates = {
        nombre,
        area_principal: area
      };

      if (password) {
        if (password !== confirmPassword) {
          throw new Error("Las contraseñas no coinciden");
        }
        if (password.length < 4) {
          throw new Error("La contraseña debe tener al menos 4 caracteres");
        }
        updates.password_cifrada = password;
      }

      const { error } = await supabase
        .from('perfil_encargado')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado correctamente");
      setPassword("");
      setConfirmPassword("");
      // Update local storage user (optional, auth context will resync on refresh)
      const current = JSON.parse(localStorage.getItem('auth_user'));
      if (current) {
        localStorage.setItem('auth_user', JSON.stringify({
          ...current,
          nombre,
          area_principal: area
        }));
      }
    },
    onError: (err) => {
      toast.error(err.message || "Error al actualizar perfil");
    }
  });

  const handleUpdate = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  return (
    <div>
      <PageHeader title="Mi Cuenta" description="Configura tu perfil y tu contraseña secreta">
        <Button variant="destructive" size="sm" onClick={logout} className="rounded-full shadow-lg">
          <LogOut className="w-4 h-4 mr-2" /> Salir
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Profile Settings */}
        <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <UserCircle className="w-6 h-6 text-orange-500" />
              Configuración de Perfil
            </CardTitle>
            <CardDescription className="text-white/60">Actualiza tu nombre o cambia tu contraseña de acceso.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/90 ml-1">Nombre</Label>
                <Input 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)} 
                  className="bg-black/20 border-white/10 text-white rounded-xl focus-visible:ring-orange-500" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/90 ml-1">Área Principal</Label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white rounded-xl focus:ring-orange-500">
                    <SelectValue placeholder="Seleccionar área..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl">
                    {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 pb-2">
                <div className="h-px w-full bg-white/10 mb-4"></div>
                <Label className="text-orange-400 flex items-center gap-2 mb-2 font-bold">
                  <Lock className="w-4 h-4" /> Configurar Contraseña
                </Label>
                <p className="text-xs text-white/50 mb-4">Déjalo en blanco si no quieres cambiar tu contraseña actual.</p>
                <div className="space-y-3">
                  <Input 
                    type="password"
                    placeholder="Nueva contraseña (opcional)" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="bg-black/20 border-white/10 text-white rounded-xl focus-visible:ring-orange-500" 
                  />
                  {password && (
                    <Input 
                      type="password"
                      placeholder="Confirmar nueva contraseña" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      className="bg-black/20 border-white/10 text-white rounded-xl focus-visible:ring-orange-500" 
                    />
                  )}
                </div>
              </div>

              <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold h-12 transition-transform hover:scale-[1.02]">
                {updateProfileMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="glass-card-dark border-white/10 shadow-2xl rounded-3xl flex flex-col max-h-[600px]">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <History className="w-6 h-6 text-sky-400" />
              Mi Historial Reciente
            </CardTitle>
            <CardDescription className="text-white/60">Tus últimos registros de trabajo.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {loadingHistory ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>
            ) : historial?.length === 0 ? (
              <div className="text-center p-8 text-white/40 text-sm">Aún no tienes registros.</div>
            ) : (
              historial?.map((reg) => (
                <div key={reg.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{reg.tipo_trabajo}</p>
                    <p className="text-[10px] text-white/50">{reg.proyecto?.numero_proyecto}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={reg.fase} />
                    <p className="text-[10px] text-white/40 mt-1">
                      {format(new Date(reg.created_date), "d MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
