import React from "react";
import { cn } from "@/lib/utils";
export const Input = React.forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:bg-slate-50",
        className
      )}
      {...props}
    />
  );
});
