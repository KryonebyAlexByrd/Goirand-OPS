import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Si el error es de traducción automática de Chrome (removeChild/insertBefore), ignorar y no romper la UI
    if (error?.message && (error.message.includes('removeChild') || error.message.includes('insertBefore') || error.message.includes('Node'))) {
      console.warn("DOM mutation caught (Auto-Translate or Extension), recovering silently...");
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-xl font-bold mb-2">Algo salió mal al cargar esta vista</h1>
          <p className="text-sm text-white/60 max-w-md mb-6">
            Es posible que haya una actualización pendiente o un problema de caché en el dispositivo.
          </p>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl max-w-lg w-full text-left font-mono text-xs text-orange-300 overflow-x-auto mb-6">
            {this.state.error?.message || "Error desconocido en componente React"}
          </div>
          <Button onClick={this.handleReload} className="bg-orange-600 hover:bg-orange-500 rounded-full font-bold px-6">
            <RefreshCw className="w-4 h-4 mr-2" /> Recargar Página y Limpiar Caché
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
