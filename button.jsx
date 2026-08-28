import React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-teal-600 text-white hover:bg-teal-700",
  outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
  destructive: "bg-rose-600 text-white hover:bg-rose-700",
  ghost: "hover:bg-slate-100 text-slate-700",
};
const sizes = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef(function Button(
  { className, variant = "default", size = "default", ...props }, ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant] || variants.default,
        sizes[size] || sizes.default,
        className
      )}
      {...props}
    />
  );
});
