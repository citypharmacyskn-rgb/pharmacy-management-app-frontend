import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { can } from "@/lib/permissions";
import { Plus, Search, FileText, Pencil, Trash2, Check, X, User, Stethoscope, Printer, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { printPrescriptionLabel } from "@/lib/printLabel";
import { queuePrescriptionForPos } from "@/lib/prescriptionToPos";
import { useNavigate } from "react-router-dom";

const emptyRx = {
  prescription_number: "", patient_name: "", patient_age: "", patient_gender: "Male",
  patient_phone: "", prescriber_name: "", prescriber_license: "",
  date: format(new Date(), "yyyy-MM-dd"), status: "pending", notes: "", items: [],
};

export default function Prescriptions() {
  const { user } = useAuth();
  const canCreateEdit = can(user, "PRESCRIPTIONS_CREATE_EDIT");
  const canFill = can(user, "PRESCRIPTIONS_FILL");
  const canDelete = can(user, "PRESCRIPTIONS_DELETE");

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRx);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendToPos = (rx) => {
    if (!rx.items?.length) {
      toast({ title: "No items to send to POS", variant: "destructive" });
      return;
    }
    queuePrescriptionForPos(rx);
    toast({ title: "Prescription sent to Point of Sale" });
    navigate("/pos");
  };

  const printLabel = (rx) => {
    const opened = printPrescriptionLabel(rx);
    if (!opened) {
      toast({ title: "Pop-up blocked", description: "Please allow pop-ups to print the dispensing label.", variant: "destructive" });
    }
  };

  const load = () => {
    setLoading(true);
    api.entities.Prescription.list("-created_date", 200)
      .then((d) => setPrescriptions(d || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = prescriptions.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.patient_name?.toLowerCase().includes(q) ||
      p.prescription_number?.toLowerCase().includes(q) || p.prescriber_name?.toLowerCase().includes(q);
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const openNew = () => {
    if (!canCreateEdit) return;
    setEditing(null);
    setForm({ ...emptyRx, prescription_number: `RX-${Date.now().toString().slice(-6)}` });
    setOpen(true);
  };
  const openEdit = (rx) => { if (!canCreateEdit) return; setEditing(rx); setForm({ ...emptyRx, ...rx }); setOpen(true); };

  const save = async () => {
    if (!canCreateEdit) return;
    if (!form.patient_name || !form.prescriber_name) {
      toast({ title: "Patient and prescriber are required", variant: "destructive" });
      return;
    }

    let ageValue = null;
    if (form.patient_age !== "" && form.patient_age !== null && form.patient_age !== undefined) {
      const parsedAge = parseInt(form.patient_age, 10);
      if (Number.isNaN(parsedAge) || parsedAge < 0) {
        toast({ title: "Please enter a valid patient age", variant: "destructive" });
        return;
      }
      ageValue = parsedAge;
    }

    setSaving(true);
    try {
      const payload = { ...form, patient_age: ageValue };
      if (editing) {
        await api.entities.Prescription.update(editing.id, payload);
        toast({ title: "Prescription updated" });
      } else {
        await api.entities.Prescription.create(payload);
        toast({ title: "Prescription created" });
      }
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Error saving prescription", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (rx, status) => {
    // Cancelling doesn't dispense anything, so it only needs create/edit
    // rights; filling is the clinical act and needs PRESCRIPTIONS_FILL.
    const allowed = status === "filled" ? canFill : canCreateEdit;
    if (!allowed) return;
    await api.entities.Prescription.update(rx.id, { status });
    toast({ title: `Marked as ${status}` });
    load();
  };

  const confirmDelete = async () => {
    if (!canDelete || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.entities.Prescription.delete(deleteTarget.id);
      toast({ title: "Prescription deleted" });
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast({ title: "Error deleting prescription", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addItem = () => setForm((f) => ({
    ...f,
    items: [...f.items, { medication_name: "", dosage: "", quantity: 1, instructions: "" }],
  }));
  const updateItem = (i, k, v) => setForm((f) => ({
    ...f,
    items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)),
  }));
  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const statusStyles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    filled: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search patient, Rx no, prescriber..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreateEdit && (
          <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-1.5" /> New Prescription
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No prescriptions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((rx) => (
            <div key={rx.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{rx.prescription_number}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize", statusStyles[rx.status])}>
                      {rx.status}
                    </span>
                  </div>
                  <h3 className="font-heading font-semibold text-slate-900 mt-1">{rx.patient_name}</h3>
                  <p className="text-xs text-slate-400">{rx.patient_age ? `${rx.patient_age} yrs · ` : ""}{rx.patient_gender}</p>
                </div>
                {(canCreateEdit || canDelete) && (
                  <div className="flex gap-1">
                    {canCreateEdit && (
                      <button onClick={() => openEdit(rx)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(rx)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400" /> {rx.prescriber_name}
                </div>
                {rx.patient_phone && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {rx.patient_phone}
                  </div>
                )}
              </div>

              {rx.items?.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-400 mb-1.5">Prescribed Items ({rx.items.length})</p>
                  <div className="space-y-1">
                    {rx.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-700">{it.medication_name} <span className="text-slate-400">×{it.quantity}</span></span>
                        <span className="text-slate-400">{it.dosage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">{rx.date ? format(new Date(rx.date), "MMM d, yyyy") : "—"}</span>
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => printLabel(rx)}>
                    <Printer className="w-3 h-3 mr-1" /> Label
                  </Button>
                  {rx.status === "pending" && (
                    <>
                      {canCreateEdit && (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStatus(rx, "cancelled")}>
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      )}
                      {canFill && (
                        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus(rx, "filled")}>
                          <Check className="w-3 h-3 mr-1" /> Fill
                        </Button>
                      )}
                    </>
                  )}
                  {rx.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-teal-700 border-teal-200 hover:bg-teal-50" onClick={() => sendToPos(rx)}>
                      <ShoppingCart className="w-3 h-3 mr-1" /> Send to POS
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canCreateEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Prescription" : "New Prescription"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Prescription Number</Label>
                  <Input value={form.prescription_number} onChange={(e) => set("prescription_number", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.date ? form.date.substring(0, 10) : ""} onChange={(e) => set("date", e.target.value)} />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Patient Name *</Label>
                    <Input value={form.patient_name} onChange={(e) => set("patient_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.patient_phone} onChange={(e) => set("patient_phone", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Age</Label>
                    <Input type="number" min="0" value={form.patient_age || ""} onChange={(e) => set("patient_age", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Select value={form.patient_gender} onValueChange={(v) => set("patient_gender", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Male", "Female", "Other"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prescriber</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Prescriber Name *</Label>
                    <Input value={form.prescriber_name} onChange={(e) => set("prescriber_name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>License Number</Label>
                    <Input value={form.prescriber_license} onChange={(e) => set("prescriber_license", e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prescribed Items</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
                {form.items.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No items added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {form.items.map((it, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-start rounded-lg border border-slate-200 p-2.5">
                        <Input className="col-span-12 sm:col-span-4 h-8 text-sm" placeholder="Medication" value={it.medication_name} onChange={(e) => updateItem(i, "medication_name", e.target.value)} />
                        <Input className="col-span-6 sm:col-span-3 h-8 text-sm" placeholder="Dosage" value={it.dosage} onChange={(e) => updateItem(i, "dosage", e.target.value)} />
                        <Input type="number" min="0" className="col-span-4 sm:col-span-1 h-8 text-sm" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 0)} />
                        <Input className="col-span-10 sm:col-span-3 h-8 text-sm" placeholder="Instructions" value={it.instructions} onChange={(e) => updateItem(i, "instructions", e.target.value)} />
                        <button onClick={() => removeItem(i)} className="col-span-2 sm:col-span-1 flex justify-center pt-1.5 text-slate-400 hover:text-rose-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Pharmacist Notes</Label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
              </div>

              {editing && (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">pending</SelectItem>
                      <SelectItem value="filled" disabled={!canFill}>filled</SelectItem>
                      <SelectItem value="cancelled">cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                {saving ? "Saving..." : editing ? "Update" : "Create Prescription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete prescription?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will permanently delete the prescription for <span className="font-semibold">{deleteTarget?.patient_name}</span>. This can't be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
