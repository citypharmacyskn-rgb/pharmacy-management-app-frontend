import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import StatCard from "@/components/StatCard";
import { Package, FileText, ShoppingCart, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function Dashboard() {
  const [medications, setMedications] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.entities.Medication.list(),
      api.entities.Prescription.list(),
      api.entities.Sale.list(),
    ])
      .then(([meds, prescs, sls]) => {
        setMedications(meds || []);
        setPrescriptions(prescs || []);
        setSales(sls || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  const totalStockValue = medications.reduce(
    (sum, m) => sum + (m.cost || 0) * (m.stock_quantity || 0),
    0
  );
  const lowStock = medications.filter((m) => m.stock_quantity <= m.reorder_level);
  const today = new Date();
  const expiringSoon = medications.filter((m) => {
    if (!m.expiry_date) return false;
    const diff = (new Date(m.expiry_date) - today) / (1000 * 60 * 60 * 24);
    return diff <= 90 && diff >= 0;
  });
  const pendingRx = prescriptions.filter((p) => p.status === "pending");
  const todaysRevenue = sales
    .filter((s) => s.date && new Date(s.date).toDateString() === today.toDateString())
    .reduce((sum, s) => sum + (s.total || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Medications" value={medications.length} icon={Package} accent="teal" sub={`${lowStock.length} low on stock`} />
        <StatCard label="Pending Prescriptions" value={pendingRx.length} icon={FileText} accent="blue" sub={`${prescriptions.length} total`} />
        <StatCard label="Today's Revenue" value={`$${todaysRevenue.toFixed(2)}`} icon={TrendingUp} accent="amber" sub={`${sales.length} total sales`} />
        <StatCard label="Stock Value" value={`$${totalStockValue.toFixed(2)}`} icon={ShoppingCart} accent="rose" sub="Inventory cost value" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-heading font-semibold text-slate-900">Low Stock Alerts</h3>
            </div>
            <Link to="/inventory" className="text-xs font-medium text-teal-600 hover:underline">
              View all
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">All items are well stocked.</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.form} · {m.strength || "—"}</p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">{m.stock_quantity} left</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring soon */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              <h3 className="font-heading font-semibold text-slate-900">Expiring Soon</h3>
            </div>
            <Link to="/inventory" className="text-xs font-medium text-teal-600 hover:underline">
              View all
            </Link>
          </div>
          {expiringSoon.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No items expiring soon.</p>
          ) : (
            <div className="space-y-2">
              {expiringSoon.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400">Batch {m.batch_number || "—"}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600">
                    {format(new Date(m.expiry_date), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent prescriptions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-slate-900">Recent Prescriptions</h3>
          <Link to="/prescriptions" className="text-xs font-medium text-teal-600 hover:underline">
            View all
          </Link>
        </div>
        {prescriptions.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No prescriptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 font-medium">Rx No.</th>
                  <th className="py-2 font-medium">Patient</th>
                  <th className="py-2 font-medium">Prescriber</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.slice(0, 6).map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{p.prescription_number || "—"}</td>
                    <td className="py-3 text-slate-600">{p.patient_name}</td>
                    <td className="py-3 text-slate-600">{p.prescriber_name}</td>
                    <td className="py-3 text-slate-500">{p.date ? format(new Date(p.date), "MMM d, yyyy") : "—"}</td>
                    <td className="py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    filled: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-rose-50 text-rose-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || ""}`}>
      {status}
    </span>
  );
}
