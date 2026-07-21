import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedId = localStorage.getItem('encargado_id');
        
        if (storedId) {
          const { data: perfil, error } = await supabase
            .from('perfil_encargado')
            .select('*')
            .eq('id', storedId)
            .maybeSingle();
            
          if (error) throw error;
          
          if (perfil) {
            // Reconstruct a user-like object for the app
            setUser({ 
              id: perfil.id, 
              perfil_encargado: perfil,
              role: perfil.area_principal === "Admin" ? "admin" : "user"
            });
            setIsAuthenticated(true);
          } else {
            // ID no longer exists
            localStorage.removeItem('encargado_id');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error fetching local session:', error);
        setAuthError({ type: 'unknown', message: error.message });
      } finally {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    };

    initAuth();
  }, []);

  const loginLocal = async (perfil) => {
    localStorage.setItem('encargado_id', perfil.id);
    setUser({ 
      id: perfil.id, 
      perfil_encargado: perfil,
      role: perfil.area_principal === "Admin" ? "admin" : "user"
    });
    setIsAuthenticated(true);
  };

  const logout = async (shouldRedirect = true) => {
    localStorage.removeItem('encargado_id');
    setUser(null);
    setIsAuthenticated(false);
    
    // Also sign out of supabase auth just in case there's a lingering session
    await supabase.auth.signOut().catch(() => {});
    
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      authChecked,
      logout,
      navigateToLogin,
      loginLocal
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
