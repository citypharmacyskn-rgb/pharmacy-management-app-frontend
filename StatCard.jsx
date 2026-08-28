import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ label, value, icon: Icon, accent, sub }) {
  const accents = {
    teal: "from-teal-500 to-emerald-500 text-white",
    blue: "from-blue-500 to-indigo-500 text-white",
    amber: "from-amber-500 to-orange-500 text-white",
    rose: "from-rose-500 to-pink-500 text-white",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-heading font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center", accents[accent])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
