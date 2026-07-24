import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'

// Auto-actualizar inmediatamente cuando Vercel publique un nuevo cambio
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Nuevos cambios detectados en el servidor, actualizando automáticamente...');
    window.location.reload();
  }
});

// Manejar automáticamente si un celular intenta cargar un módulo viejo que cambió de hash
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('Loading chunk') || e.message.includes('dynamically imported module') || e.message.includes('Importing a module script failed'))) {
    console.log('Detectado cambio de versión en archivos JS. Recargando página...');
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
