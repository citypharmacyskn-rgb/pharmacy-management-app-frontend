import React from "react";
import { cn } from "@/lib/utils";
export function Switch({ checked, onCheckedChange, className, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
        checked ? "bg-teal-600" : "bg-slate-200",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}
