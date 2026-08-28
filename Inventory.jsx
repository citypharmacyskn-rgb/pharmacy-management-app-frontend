import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { can } from "@/lib/permissions";
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const emptyMed = {
  name: "", generic_name: "", category: "Other", form: "Tablet", strength: "",
  price: 0, cost: 0, stock_quantity: 0, reorder_level: 10, supplier: "",
  expiry_date: "", batch_number: "", barcode: "", requires_prescription: false, description: "",
};

export default function Inventory() {
  const { user } = useAuth();
  const canEdit = can(user, "INVENTORY_EDIT");
  const canDelete = can(user, "INVENTORY_DELETE");

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMed);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    api.entities.Medication.list("-created_date", 200)
      .then((data) => setMedications(data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = medications.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name?.toLowerCase().includes(q) || m.generic_name?.toLowerCase().includes(q) ||
      m.barcode?.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q);
  });

  const openNew = () => { if (!canEdit) return; setEditing(null); setForm(emptyMed); setOpen(true); };
  const openEdit = (med) => { if (!canEdit) return; setEditing(med); setForm({ ...emptyMed, ...med }); setOpen(true); };

  const save = async () => {
    if (!canEdit) return;
    const priceInvalid = form.price === "" || form.price === null || form.price === undefined || Number.isNaN(Number(form.price)) || Number(form.price) < 0;
    if (!form.name.trim() || priceInvalid) {
      toast({ title: "Please fill in name and a valid price", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.entities.Medication.update(editing.id, form);
        toast({ title: "Medication updated" });
      } else {
        await api.entities.Medication.create(form);
        toast({ title: "Medication added" });
      }
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Error saving medication", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!canDelete || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.entities.Medication.delete(deleteTarget.id);
      toast({ title: "Medication deleted" });
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast({ title: "Error deleting medication", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, generic, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canEdit && (
          <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-1.5" /> Add Medication
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No medications found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const low = m.stock_quantity <= m.reorder_level;
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-slate-900 truncate">{m.name}</h3>
                      {m.requires_prescription && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Rx</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{m.generic_name || "—"} · {m.form} · {m.strength || "—"}</p>
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex gap-1">
                      {canEdit && (
                        <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteTarget(m)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Price</p>
                    <p className="text-lg font-bold text-slate-900">${(m.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Stock</p>
                    <p className={`text-lg font-bold ${low ? "text-rose-600" : "text-slate-900"}`}>
                      {m.stock_quantity}
                    </p>
                  </div>
                </div>

                {low && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Low stock — reorder soon
                  </div>
                )}
                {m.expiry_date && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    Exp: {format(new Date(m.expiry_date), "MMM yyyy")} · {m.supplier || "No supplier"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Medication" : "Add Medication"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Brand Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Generic Name</Label>
                <Input value={form.generic_name} onChange={(e) => set("generic_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Antibiotic", "Analgesic", "Antacid", "Antihistamine", "Cardiovascular", "Diabetes", "Vitamin", "Other"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Form</Label>
                <Select value={form.form} onValueChange={(v) => set("form", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Strength</Label>
                <Input value={form.strength} onChange={(e) => set("strength", e.target.value)} placeholder="e.g. 500mg" />
              </div>
              <div className="space-y-1.5">
                <Label>Barcode/SKU</Label>
                <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price *</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", e.target.value === "" ? "" : parseFloat(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Price</Label>
                <Input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set("cost", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Quantity</Label>
                <Input type="number" min="0" value={form.stock_quantity} onChange={(e) => set("stock_quantity", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={form.reorder_level} onChange={(e) => set("reorder_level", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Batch Number</Label>
                <Input value={form.batch_number} onChange={(e) => set("batch_number", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiry_date ? form.expiry_date.substring(0, 10) : ""} onChange={(e) => set("expiry_date", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
              </div>
              <div className="flex items-center justify-between sm:col-span-2 rounded-lg border border-slate-200 px-4 py-3">
                <div>
                  <Label>Requires Prescription</Label>
                  <p className="text-xs text-slate-400">Mark if this medication needs a prescription</p>
                </div>
                <Switch checked={form.requires_prescription} onCheckedChange={(v) => set("requires_prescription", v)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                {saving ? "Saving..." : editing ? "Update" : "Add Medication"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete medication?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will permanently remove <span className="font-semibold">{deleteTarget?.name}</span> from inventory. This can't be undone.
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
