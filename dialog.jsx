import React from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange && onOpenChange(false)} />
      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </div>,
    document.body
  );
}
export function DialogContent({ children, className }) {
  return <div className={cn("bg-white rounded-2xl shadow-xl w-full max-w-lg p-6", className)}>{children}</div>;
}
export function DialogHeader({ children }) { return <div className="mb-4">{children}</div>; }
export function DialogTitle({ children, className }) {
  return <h2 className={cn("text-lg font-semibold text-slate-900", className)}>{children}</h2>;
}
export function DialogFooter({ children }) { return <div className="flex justify-end gap-2 mt-6">{children}</div>; }
