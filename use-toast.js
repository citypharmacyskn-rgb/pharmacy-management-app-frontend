import { useEffect, useState } from "react";

let toastId = 0;
let toasts = [];
const listeners = new Set();
function emit() { listeners.forEach((l) => l(toasts)); }

export function toast({ title, description, variant = "default", duration = 4000 } = {}) {
  const id = ++toastId;
  toasts = [...toasts, { id, title, description, variant }];
  emit();
  if (duration > 0) setTimeout(() => dismiss(id), duration);
  return id;
}
export function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
export function useToast() {
  const [state, setState] = useState(toasts);
  useEffect(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);
  return { toast, toasts: state, dismiss };
}
