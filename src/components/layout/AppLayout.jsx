import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const location = useLocation();

  return (
    <div className="min-h-screen bg-black relative overflow-hidden text-white">
      {/* Animated Hexagrid Background */}
      <div className="absolute inset-0 z-0 hex-bg pointer-events-none opacity-50"></div>
      
      {/* Animated Glowing Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-zinc-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={open}
        setMobileOpen={setOpen}
      />

      <main className={cn(
        "transition-all duration-300 min-h-screen",
        // On desktop, push content based on sidebar width
        "lg:ml-[260px]",
        collapsed && "lg:ml-[72px]"
      )}>
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 glass-card-dark border-b border-white/10 px-4 py-3 flex items-center gap-3 shadow-2xl">
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white"
          >
            <span className="flex flex-col gap-1.5 items-center justify-center">
              <span className="block w-4 h-0.5 bg-foreground rounded" />
              <span className="block w-4 h-0.5 bg-foreground rounded" />
              <span className="block w-4 h-0.5 bg-foreground rounded" />
            </span>
          </button>
          <span className="text-sm font-bold">Goirand</span>
          <span className="text-xs text-primary font-semibold uppercase tracking-wider">Control Producción</span>
        </div>

        <div className="p-4 lg:p-6 xl:p-8 max-w-[1400px] relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
