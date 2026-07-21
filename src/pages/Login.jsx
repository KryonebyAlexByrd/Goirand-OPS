import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AREAS = [
  "Admin",
  "Contratistas",
  "Recepción",
  "Cortado",
  "Tableros",
  "Armado",
  "Pulido",
  "Barnizado",
  "Empaque",
  "Entrega"
];

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, loginLocal } = useAuth();
  const [perfiles, setPerfiles] = useState([]);
  
  // Login State
  const [selectedProfileId, setSelectedProfileId] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regArea, setRegArea] = useState('');

  useEffect(() => {
    const fetchPerfiles = async () => {
      const { data, error } = await supabase.from('perfil_encargado').select('*').order('nombre');
      if (!error && data) {
        setPerfiles(data);
      }
    };
    fetchPerfiles();
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedProfileId) {
      setError("Por favor selecciona tu usuario.");
      return;
    }
    
    const perfil = perfiles.find(p => p.id === selectedProfileId);
    if (perfil) {
      loginLocal(perfil);
      toast.success(`¡Bienvenido de vuelta, ${perfil.nombre}!`);
    } else {
      setError("Usuario no encontrado.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regArea || !regName.trim()) {
      setError("Por favor, llena todos los campos.");
      return;
    }
    
    let isRoleAdmin = false;
    if (regArea === "Admin") {
      const adminPass = window.prompt("Introduce la contraseña para crear un perfil de Admin:");
      if (adminPass !== "goirandreal") {
        setError("Contraseña de administrador incorrecta.");
        return;
      }
      isRoleAdmin = true;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Create a fake email and password to satisfy Supabase Auth requirements silently
      const fakeEmail = `${Date.now()}-${Math.random().toString(36).substring(7)}@goirand.local`;
      const fakePassword = crypto.randomUUID();

      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: fakeEmail, 
          password: fakePassword, 
          name: regName, 
          area: regArea,
          role: isRoleAdmin ? 'admin' : 'user'
        })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar el perfil');
      }

      // Fetch updated profiles
      const { data: updatedPerfiles } = await supabase.from('perfil_encargado').select('*').order('nombre');
      if (updatedPerfiles) setPerfiles(updatedPerfiles);

      // Fetch the newly created profile and log them in
      const { data: newPerfil } = await supabase.from('perfil_encargado').select('*').eq('id', data.user.id).single();
      
      if (newPerfil) {
        loginLocal(newPerfil);
        toast.success(`¡Registro exitoso! Entrando como ${newPerfil.nombre}`);
      } else {
        throw new Error("No se pudo cargar el perfil recién creado.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 relative overflow-hidden bg-black">
      
      {/* Animated Hexagrid Background (Silver & Black) */}
      <div className="absolute inset-0 z-0 hex-bg"></div>
      
      {/* Animated Glowing Orbs (Orange & Silver) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/30 blur-[100px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-zinc-400/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <style>{`
        /* Moving Hexagrid */
        .hex-bg {
          background-color: #050505;
          background-image: 
            linear-gradient(to bottom, transparent, #000 90%),
            url("data:image/svg+xml,%3Csvg width='60' height='103.92305' viewBox='0 0 60 103.92305' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 25.98076L30 8.66025L0 25.98076L0 60.62177L30 77.94228L60 60.62177Z' stroke='%23888888' stroke-width='1.5' fill='none' stroke-opacity='0.4'/%3E%3Cpath d='M0 77.94228L30 95.26279L60 77.94228' stroke='%23888888' stroke-width='1.5' fill='none' stroke-opacity='0.4'/%3E%3C/svg%3E");
          background-size: 100% 100%, 80px 138.56px;
          animation: moveHex 15s linear infinite;
        }
        @keyframes moveHex {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 0 0, 80px 138.56px; }
        }
        @keyframes pulseSlow {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.6; }
          50% { transform: scale(1.1) translate(20px, -20px); opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulseSlow 8s ease-in-out infinite;
        }

        /* Orange Card with Geometric Details */
        .card-orange-geo {
          background-color: #ea580c;
          background-image: 
            radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(0, 0, 0, 0.3) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15 0L30 15L15 30L0 15Z' stroke='%23ffffff' stroke-width='1' fill='none' stroke-opacity='0.1'/%3E%3C/svg%3E");
          background-size: 100% 100%, 100% 100%, 40px 40px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(234, 88, 12, 0.4);
        }

        /* Glass Elements inside Card */
        .glass-input {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
        }
        .glass-input:focus {
          background: rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.6);
          box-shadow: 0 0 10px rgba(255,255,255,0.2);
        }
        .glass-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <Card className="w-full max-w-md card-orange-geo text-white z-10 rounded-[2rem] overflow-hidden relative">
        <div className="absolute inset-0 bg-white/5 mix-blend-overlay pointer-events-none rounded-[2rem]"></div>
        <CardHeader className="space-y-4 text-center pb-6 pt-10 relative z-10">
          <div className="flex justify-center mb-1">
            {/* Minimalist Professional Logo (White/Silver on Orange) */}
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20 relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md">
                <path d="M12 2L2 7l10 5 10-5-10-5Z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
          </div>
          <CardTitle className="text-4xl font-black tracking-tight text-white drop-shadow-lg" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            GOIRAND OPS
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 rounded-full bg-black/20 p-1 border border-white/10 backdrop-blur-sm">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-orange-600 text-white transition-all font-bold">Ingresar</TabsTrigger>
              <TabsTrigger value="register" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-orange-600 text-white transition-all font-bold">Nuevo Perfil</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/90 ml-2 font-semibold">¿Quién eres?</Label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId} required>
                    <SelectTrigger className="glass-input rounded-full h-12 px-5 ring-offset-orange-600 focus:ring-white/50">
                      <SelectValue placeholder="Selecciona tu nombre..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-none text-zinc-900 rounded-xl shadow-xl max-h-[300px]">
                      {perfiles.map(p => (
                        <SelectItem key={p.id} value={p.id} className="focus:bg-orange-100 focus:text-orange-700 rounded-lg cursor-pointer font-medium py-3">
                          {p.nombre} <span className="text-zinc-500 text-sm ml-2">({p.area_principal})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-xs text-red-200 font-medium text-center bg-red-900/40 p-2 rounded-lg">{error}</p>}
                <Button type="submit" className="w-full bg-white text-orange-600 hover:bg-zinc-100 rounded-full h-12 text-lg font-black shadow-xl border-0 mt-4 transition-transform hover:scale-[1.02]" disabled={loading}>
                  Entrar al sistema
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/90 ml-2 font-semibold">Nombre y Apellido</Label>
                  <Input placeholder="Ej. Nombre Apellido" value={regName} onChange={(e) => setRegName(e.target.value)} required 
                    className="glass-input rounded-full h-12 px-5 ring-offset-orange-600 focus-visible:ring-white/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/90 ml-2 font-semibold">Área Principal</Label>
                  <Select value={regArea} onValueChange={setRegArea} required>
                    <SelectTrigger className="glass-input rounded-full h-12 px-5 ring-offset-orange-600 focus:ring-white/50">
                      <SelectValue placeholder="Seleccionar área..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-none text-zinc-900 rounded-xl shadow-xl">
                      {AREAS.map(a => <SelectItem key={a} value={a} className="focus:bg-orange-100 focus:text-orange-700 rounded-lg cursor-pointer font-medium">{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                {error && <p className="text-xs text-red-200 font-medium text-center bg-red-900/40 p-2 rounded-lg">{error}</p>}
                <Button type="submit" className="w-full bg-white text-orange-600 hover:bg-zinc-100 rounded-full h-12 text-lg font-black shadow-xl border-0 mt-4 transition-transform hover:scale-[1.02]" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin text-orange-600" /> : "Guardar Perfil y Entrar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
