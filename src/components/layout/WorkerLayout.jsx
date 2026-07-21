import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { ClipboardList, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkerLayout() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden text-white flex flex-col">
      {/* Animated Hexagrid Background */}
      <div className="absolute inset-0 z-0 hex-bg pointer-events-none opacity-50"></div>
      
      {/* Animated Glowing Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-zinc-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Main Content Area (padding bottom to avoid overlap with nav bar) */}
      <main className="flex-1 relative z-10 p-4 lg:p-6 xl:p-8 max-w-[1400px] mx-auto w-full pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full z-50 glass-card-dark border-t border-white/10 px-6 py-3 flex justify-around items-center">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all w-24",
              isActive ? "text-orange-500 font-bold" : "text-white/60 hover:text-white/80"
            )
          }
        >
          <ClipboardList className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-wider">Mi Trabajo</span>
        </NavLink>

        <NavLink
          to="/mi-area"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all w-24",
              isActive ? "text-orange-500 font-bold" : "text-white/60 hover:text-white/80"
            )
          }
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-wider">Mi Área</span>
        </NavLink>
      </div>
    </div>
  );
}
