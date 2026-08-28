import React from "react";
import { cn } from "@/lib/utils";

// Native <select> under the hood: fully functional and accessible by
// default, at the cost of Radix-style custom styling. The compound-
// component API (Select/SelectTrigger/SelectValue/SelectContent/SelectItem)
// matches what the pages already call, so no page code needed to change.
export function Select({ value, onValueChange, disabled, children, className }) {
  return (
    <select
      className={cn(
        "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 w-full",
        className
      )}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onValueChange && onValueChange(e.target.value)}
    >
      {children}
    </select>
  );
}
export function SelectTrigger({ children }) { return <>{children}</>; }
export function SelectValue() { return null; }
export function SelectContent({ children }) { return <>{children}</>; }
export function SelectItem({ value, children, disabled }) {
  return <option value={value} disabled={disabled}>{children}</option>;
}
