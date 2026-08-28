const KEY = "pos_pending_prescription";
export function queuePrescriptionForPos(rx) {
  const payload = {
    customer_name: rx.patient_name || "Walk-in Customer",
    items: (rx.items || []).map((it) => ({
      medication_name: it.medication_name,
      quantity: it.quantity || 1,
    })),
  };
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}
export function consumeQueuedPrescription() {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try { return JSON.parse(raw); } catch { return null; }
}
