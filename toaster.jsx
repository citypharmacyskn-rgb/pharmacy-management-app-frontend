import React from "react";
import { X } from "lucide-react";
import { useToast } from "./use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-lg border p-4 shadow-lg bg-white flex items-start gap-3",
            t.variant === "destructive" ? "border-rose-300" : "border-slate-200"
          )}
        >
          <div className="flex-1 min-w-0">
            {t.title && (
              <p className={cn("text-sm font-medium", t.variant === "destructive" ? "text-rose-700" : "text-slate-900")}>
                {t.title}
              </p>
            )}
            {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
