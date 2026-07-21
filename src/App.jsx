import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { Toaster as SonnerToaster } from 'sonner';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import WorkerLayout from '@/components/layout/WorkerLayout';
import Dashboard from '@/pages/Dashboard';
import RegistroTrabajo from '@/pages/RegistroTrabajo';
import Proyectos from '@/pages/Proyectos';
import ProyectoDetalle from '@/pages/ProyectoDetalle';
import Contratistas from '@/pages/Contratistas';
import Clientes from '@/pages/Clientes';
import Trabajadores from '@/pages/Trabajadores';
import AreasDashboard from "./pages/AreasDashboard";
import Reportes from '@/pages/Reportes';
import MiTrabajo from '@/pages/MiTrabajo';
import Login from '@/pages/Login';

import MiArea from '@/pages/MiArea';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Admins ven todo (role === 'admin')
  const isAdmin = user?.role === "admin" || user?.user_metadata?.role === "admin";

  if (!isAdmin) {
    return (
      <Routes>
        <Route element={<WorkerLayout />}>
          <Route path="/" element={<MiTrabajo />} />
          <Route path="/mi-area" element={<MiArea />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  // Admins
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/registro" element={<RegistroTrabajo />} />
        <Route path="/proyectos" element={<Proyectos />} />
        <Route path="/proyectos/:id" element={<ProyectoDetalle />} />
        <Route path="/contratistas" element={<Contratistas />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/trabajadores" element={<Trabajadores />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/areas" element={<AreasDashboard />} />
        <Route path="/mi-trabajo" element={<MiTrabajo />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster theme="dark" richColors position="top-center" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
