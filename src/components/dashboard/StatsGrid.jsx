import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="glass-card-dark border-white/10 shadow-2xl rounded-3xl relative overflow-hidden p-5 transition-shadow">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full opacity-20" 
               style={{ backgroundColor: stat.color }} />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1.5 text-foreground">{stat.value}</p>
              {stat.sub && <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>}
            </div>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center")}
                 style={{ backgroundColor: `${stat.color}15` }}>
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
