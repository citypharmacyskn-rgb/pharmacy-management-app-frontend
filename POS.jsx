import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { can } from "@/lib/permissions";
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Pause, History, Banknote, CreditCard, FileCheck, UserCheck, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { consumeQueuedPrescription } from "@/lib/prescriptionToPos";

const TAX_RATE = 0.08;
const TIERS = ["Cashier", "Pharmacist", "Manager"];
const PAYMENT_METHODS = [
  { value: "Cash", icon: Banknote },
  { value: "Credit Card", icon: CreditCard },
  { value: "Check", icon: FileCheck },
  { value: "Charge to Account", icon: UserCheck },
  { value: "Insurance", icon: ShieldCheck },
];

export default function POS() {
  const { user } = useAuth();
  const canDiscount = can(user, "POS_DISCOUNT");

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [discount, setDiscount] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [role, setRole] = useState(() => localStorage.getItem("pos_role") || "Cashier");
  const [attendantName, setAttendantName] = useState(() => localStorage.getItem("pos_attendant") || "");
  const [suspended, setSuspended] = useState([]);
  const [suspendedOpen, setSuspendedOpen] = useState(false);
  const [recallTarget, setRecallTarget] = useState(null);
  const { toast } = useToast();

  const changeRole = (r) => { setRole(r); localStorage.setItem("pos_role", r); };
  const changeAttendant = (v) => { setAttendantName(v); localStorage.setItem("pos_attendant", v); };

  const loadSuspended = () => {
    api.entities.Sale.filter({ status: "suspended" }).then((d) => setSuspended(d || [])).catch(() => {});
  };

  useEffect(() => {
    api.entities.Medication.list("-created_date", 200)
      .then((d) => {
        setMedications(d || []);
        const queued = consumeQueuedPrescription();
        if (queued) {
          setCustomerName(queued.customer_name || "Walk-in Customer");
          const matched = [];
          const unmatched = [];
          (queued.items || []).forEach((qItem) => {
            const med = (d || []).find((m) => m.name === qItem.medication_name);
            if (med) {
              matched.push({
                medication_id: med.id,
                medication_name: med.name,
                unit_price: med.price,
                quantity: Math.min(qItem.quantity, med.stock_quantity),
                max: med.stock_quantity,
              });
            } else {
              unmatched.push(qItem.medication_name);
            }
          });
          if (matched.length) {
            setCart(matched);
            toast({ title: `Loaded ${matched.length} item(s) from prescription` });
          }
          if (unmatched.length) {
            toast({
              title: `Could not match: ${unmatched.join(", ")}`,
              variant: "destructive",
            });
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSuspended(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return medications.filter((m) =>
      !q || m.name?.toLowerCase().includes(q) || m.barcode?.toLowerCase().includes(q) ||
      m.generic_name?.toLowerCase().includes(q)
    );
  }, [medications, search]);

  const addToCart = (med) => {
    if (med.stock_quantity <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    setCart((c) => {
      const existing = c.find((i) => i.medication_id === med.id);
      if (existing) {
        if (existing.quantity >= med.stock_quantity) {
          toast({ title: "Cannot exceed available stock", variant: "destructive" });
          return c;
        }
        return c.map((i) => i.medication_id === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...c, {
        medication_id: med.id,
        medication_name: med.name,
        unit_price: med.price,
        quantity: 1,
        max: med.stock_quantity,
      }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((c) => c.map((i) => {
      if (i.medication_id !== id) return i;
      const q = i.quantity + delta;
      if (q <= 0) return i;
      if (q > i.max) {
        toast({ title: "Cannot exceed available stock", variant: "destructive" });
        return i;
      }
      return { ...i, quantity: q };
    }));
  };

  const setQty = (id, val) => {
    setCart((c) => c.map((i) =>
      i.medication_id === id ? { ...i, quantity: Math.max(1, Math.min(val, i.max)) } : i
    ));
  };

  const removeItem = (id) => setCart((c) => c.filter((i) => i.medication_id !== id));

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const maxDiscount = subtotal + tax;
  // Roles without POS_DISCOUNT never get a non-zero discount applied,
  // regardless of what's in local state (defense in depth alongside the
  // disabled input below).
  const clampedDiscount = canDiscount ? Math.max(0, Math.min(discount || 0, maxDiscount)) : 0;
  const total = Math.max(0, subtotal + tax - clampedDiscount);

  const suspend = async () => {
    if (cart.length === 0) {
      toast({ title: "Nothing to suspend", variant: "destructive" });
      return;
    }
    try {
      await api.entities.Sale.create({
        receipt_number: `SUS-${Date.now().toString().slice(-7)}`,
        customer_name: customerName,
        items: cart.map((i) => ({
          medication_name: i.medication_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.unit_price * i.quantity,
        })),
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        discount: Number(clampedDiscount.toFixed(2)),
        total: Number(total.toFixed(2)),
        payment_method: paymentMethod,
        date: format(new Date(), "yyyy-MM-dd"),
        status: "suspended",
        attendant_name: attendantName,
        attendant_role: role,
      });
      setCart([]);
      setDiscount(0);
      setCustomerName("Walk-in Customer");
      loadSuspended();
      toast({ title: "Transaction suspended" });
    } catch (e) {
      toast({ title: "Error suspending sale", variant: "destructive" });
    }
  };

  const performRecall = async (s) => {
    const items = [];
    const unmatched = [];
    (s.items || []).forEach((it) => {
      const med = medications.find((m) => m.name === it.medication_name);
      if (med) {
        items.push({
          medication_id: med.id,
          medication_name: it.medication_name,
          unit_price: it.unit_price,
          quantity: Math.min(it.quantity, med.stock_quantity),
          max: med.stock_quantity,
        });
      } else {
        unmatched.push(it.medication_name);
      }
    });
    setCart(items);
    setCustomerName(s.customer_name || "Walk-in Customer");
    setDiscount(canDiscount ? (s.discount || 0) : 0);
    setPaymentMethod(s.payment_method || "Cash");
    if (s.attendant_role) changeRole(s.attendant_role);
    if (s.attendant_name) changeAttendant(s.attendant_name);
    await api.entities.Sale.delete(s.id);
    loadSuspended();
    setSuspendedOpen(false);
    setRecallTarget(null);
    toast({ title: "Suspended sale recalled" });
    if (unmatched.length) {
      toast({
        title: `Could not restore: ${unmatched.join(", ")}`,
        description: "These medications may have been renamed or removed from inventory.",
        variant: "destructive",
      });
    }
  };

  const recall = (s) => {
    if (cart.length > 0) {
      setRecallTarget(s);
    } else {
      performRecall(s);
    }
  };

  const checkout = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setCheckingOut(true);
    try {
      const receiptNumber = `RCP-${Date.now().toString().slice(-7)}`;
      const saleData = {
        receipt_number: receiptNumber,
        customer_name: customerName,
        items: cart.map((i) => ({
          medication_name: i.medication_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.unit_price * i.quantity,
        })),
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        discount: Number(clampedDiscount.toFixed(2)),
        total: Number(total.toFixed(2)),
        payment_method: paymentMethod,
        date: format(new Date(), "yyyy-MM-dd"),
        status: "completed",
        attendant_name: attendantName,
        attendant_role: role,
      };
      await api.entities.Sale.create(saleData);

      // Race-safe: the server decrements stock_quantity in a single SQL
      // statement (MAX(0, stock_quantity + delta)) instead of us reading
      // the current value and PATCHing a computed one — the old pattern
      // could lose updates if two checkouts hit the same medication at
      // the same time.
      await Promise.all(cart.map((i) =>
        api.entities.Medication.adjustStock(i.medication_id, -i.quantity)
      ));

      setReceipt(saleData);
      setCart([]);
      setDiscount(0);
      setCustomerName("Walk-in Customer");
      const fresh = await api.entities.Medication.list("-created_date", 200);
      setMedications(fresh || []);
      toast({ title: "Sale completed" });
    } catch (e) {
      toast({ title: "Error processing sale", variant: "destructive" });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products */}
      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search or scan product..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((m) => {
              const out = m.stock_quantity <= 0;
              return (
                <button
                  key={m.id}
                  onClick={() => addToCart(m)}
                  disabled={out}
                  className={cn(
                    "text-left bg-white rounded-xl border border-slate-200 p-4 transition-all hover:border-teal-300 hover:shadow-sm",
                    out && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-teal-600" />
                    </div>
                    {m.requires_prescription && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Rx</span>
                    )}
                  </div>
                  <p className="font-medium text-sm text-slate-900 mt-2 leading-tight line-clamp-2">{m.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{m.form} · {m.strength || "—"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-slate-900">${(m.price || 0).toFixed(2)}</span>
                    <span className={cn("text-xs", out ? "text-rose-500" : "text-slate-400")}>
                      {out ? "Out" : `${m.stock_quantity} left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="lg:sticky lg:top-24 h-fit">
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-7rem)]">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-teal-600" />
            <h3 className="font-heading font-semibold text-slate-900">Current Sale</h3>
            <button onClick={() => setSuspendedOpen(true)} className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600">
              <History className="w-3.5 h-3.5" /> Suspended
              {suspended.length > 0 && (
                <span className="bg-amber-100 text-amber-700 rounded-full px-1.5 text-[10px] font-semibold">{suspended.length}</span>
              )}
            </button>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-slate-400 hover:text-rose-600">Clear</button>
            )}
          </div>

          <div className="p-4 border-b border-slate-100">
            <Label className="text-xs text-slate-400">Customer</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 h-9" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingCart className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Cart is empty</p>
                <p className="text-xs text-slate-300 mt-1">Tap a product to add</p>
              </div>
            ) : (
              cart.map((i) => (
                <div key={i.medication_id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{i.medication_name}</p>
                    <p className="text-xs text-slate-400">${i.unit_price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(i.medication_id, -1)} className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={i.max}
                      value={i.quantity}
                      onChange={(e) => setQty(i.medication_id, parseInt(e.target.value) || 1)}
                      className="w-10 text-center text-sm border-0 focus:ring-0 p-0 bg-transparent"
                    />
                    <button onClick={() => updateQty(i.medication_id, 1)} className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-16 text-right">${(i.unit_price * i.quantity).toFixed(2)}</span>
                  <button onClick={() => removeItem(i.medication_id)} className="text-slate-300 hover:text-rose-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-100 space-y-3">
            {/* Attendant tier */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Attendant Tier</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => changeRole(t)}
                    className={cn(
                      "text-xs font-medium py-2 rounded-lg border transition-colors",
                      role === t ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Input value={attendantName} onChange={(e) => changeAttendant(e.target.value)} placeholder="Attendant name (optional)" className="h-9 mt-1" />
              {/* This tier is a local UI label for the receipt only — it isn't
                  tied to the signed-in user's actual role/permissions.
                  Discount authority below is governed by the real role
                  (see /lib/permissions.js), not this selector. */}
            </div>

            {/* Payment methods */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Payment Method</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {PAYMENT_METHODS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.value}
                      onClick={() => setPaymentMethod(p.value)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium py-2 px-2 rounded-lg border transition-colors",
                        paymentMethod === p.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{p.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discount */}
            <div>
              <Label className="text-xs text-slate-400 flex items-center gap-1.5">
                Discount
                {!canDiscount && <Lock className="w-3 h-3 text-slate-300" />}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={maxDiscount}
                value={canDiscount ? (discount || "") : ""}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mt-1 h-9"
                placeholder={canDiscount ? "0.00" : "Ask a manager to apply a discount"}
                disabled={!canDiscount}
              />
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
              {clampedDiscount > 0 && (
                <div className="flex justify-between text-rose-500"><span>Discount</span><span>-${clampedDiscount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={suspend} disabled={cart.length === 0} className="h-11">
                <Pause className="w-4 h-4 mr-1.5" /> Suspend
              </Button>
              <Button onClick={checkout} disabled={checkingOut || cart.length === 0} className="bg-teal-600 hover:bg-teal-700 h-11">
                {checkingOut ? "Processing..." : "Charge"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt */}
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <Receipt className="w-6 h-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-center">Sale Complete</DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-slate-400">Receipt No.</p>
                <p className="font-mono text-sm font-semibold text-slate-900">{receipt.receipt_number}</p>
              </div>
              <div className="border-t border-b border-slate-100 py-3 space-y-1.5 text-sm">
                {receipt.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>{it.medication_name} ×{it.quantity}</span>
                    <span>${it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>${receipt.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Tax</span><span>${receipt.tax.toFixed(2)}</span></div>
                {receipt.discount > 0 && <div className="flex justify-between text-rose-500"><span>Discount</span><span>-${receipt.discount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100"><span>Total</span><span>${receipt.total.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Payment</span><span>{receipt.payment_method}</span></div>
                {receipt.attendant_role && (
                  <div className="flex justify-between text-slate-500"><span>Attendant</span><span>{receipt.attendant_role}{receipt.attendant_name ? ` · ${receipt.attendant_name}` : ""}</span></div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setReceipt(null)} className="w-full bg-teal-600 hover:bg-teal-700">New Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspended transactions */}
      <Dialog open={suspendedOpen} onOpenChange={setSuspendedOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suspended Transactions</DialogTitle>
          </DialogHeader>
          {suspended.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No suspended transactions.</p>
          ) : (
            <div className="space-y-2">
              {suspended.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.customer_name}</p>
                    <p className="text-xs text-slate-400">{s.receipt_number} · ${s.total?.toFixed(2)} · {s.items?.length || 0} items</p>
                    {s.attendant_role && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{s.attendant_role}{s.attendant_name ? ` · ${s.attendant_name}` : ""}</p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => recall(s)} className="bg-teal-600 hover:bg-teal-700 shrink-0">Recall</Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recall confirmation */}
      <Dialog open={!!recallTarget} onOpenChange={(o) => !o && setRecallTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace current cart?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Recalling this suspended sale will replace the {cart.length} item{cart.length === 1 ? "" : "s"} currently in your cart.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecallTarget(null)}>Cancel</Button>
            <Button onClick={() => performRecall(recallTarget)} className="bg-teal-600 hover:bg-teal-700">Replace cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
