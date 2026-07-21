import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, FolderKanban, Users, HardHat, ClipboardList, 
  FileBarChart, Factory, UserCircle, ChevronLeft, ChevronRight, X, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", description: "Vista general" },
  { label: "Registro de Trabajo", icon: ClipboardList, path: "/registro", description: "Captura diaria" },
  { label: "Proyectos", icon: FolderKanban, path: "/proyectos", description: "Gestión de proyectos" },
  { label: "Contratistas", icon: HardHat, path: "/contratistas", description: "Equipo externo" },
  { label: "Clientes", icon: Users, path: "/clientes", description: "Base de clientes" },
  { label: "Áreas", icon: LayoutDashboard, path: "/areas", description: "Métricas por área" },
  { label: "Encargados", icon: UserCircle, path: "/trabajadores", description: "Directorio de personal" },
  { label: "Reportes", icon: FileBarChart, path: "/reportes", description: "Reportes y exportación" },
  { label: "Mi Trabajo", icon: ClipboardList, path: "/mi-trabajo", description: "Vista de trabajador" },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen glass-card-dark border-r border-white/10 z-40 transition-all duration-300 flex flex-col shadow-2xl",
      // Desktop: always visible, width depends on collapsed
      "hidden lg:flex",
      collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
      // Mobile: slide in/out as overlay
      mobileOpen && "!flex w-[260px]"
    )}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10 flex items-center gap-3 bg-white/5">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
          <img src="/pwa-192x192.jpg" alt="Goirand OPS" className="w-full h-full object-cover" />
        </div>
        {(!collapsed || mobileOpen) && (
          <div className="overflow-hidden flex-1">
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">
              Goirand <span className="text-orange-500">OPS</span>
            </h1>
          </div>
        )}
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {(!collapsed || mobileOpen) && (
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-3">
            Navegación
          </p>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen?.(false)}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden",
                isActive
                  ? "text-white shadow-sm"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 bg-white/10 rounded-xl border border-white/10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <div className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0 z-10",
                isActive ? "bg-orange-600 text-white shadow-md shadow-orange-600/30" : "bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white border border-white/5"
              )}>
                <item.icon className="w-4 h-4" />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="overflow-hidden relative z-10">
                  <span className={cn("block leading-tight", isActive ? "text-white font-bold" : "text-white/80")}>{item.label}</span>
                  <span className={cn(
                    "text-[11px] leading-tight font-normal",
                    isActive ? "text-orange-400" : "text-white/50"
                  )}>{item.description}</span>
                </div>
              )}
              {isActive && (!collapsed || mobileOpen) && (
                <div className="ml-auto w-1 h-6 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button — desktop only */}
      <div className="px-3 py-3 border-t border-border/40 hidden lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
