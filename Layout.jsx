import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Pill, Package, FileText, ShoppingCart, LayoutDashboard, Menu, X, Store, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { can } from "@/lib/permissions";

const baseNavItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Inventory", path: "/inventory", icon: Package },
  { label: "Prescriptions", path: "/prescriptions", icon: FileText },
  { label: "Point of Sale", path: "/pos", icon: ShoppingCart },
  { label: "Shop Page", path: "/shop", icon: Store },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Team management is only relevant to people who can actually change
  // roles — hiding the link for everyone else keeps the nav uncluttered
  // rather than showing a page they'd immediately hit a permission wall on.
  const navItems = can(user, "TEAM_VIEW")
    ? [...baseNavItems, { label: "Team", path: "/team", icon: Users }]
    : baseNavItems;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
            <Pill className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-heading font-bold text-slate-900 leading-none">MediCare</p>
            <p className="text-[11px] text-slate-400 leading-none mt-1">Pharmacy System</p>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-[18px] h-[18px]", active ? "text-teal-600" : "text-slate-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-4 text-white">
            <p className="text-sm font-semibold">Need a restock?</p>
            <p className="text-[11px] text-teal-50/90 mt-0.5">Check inventory for low-stock alerts.</p>
          </div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20 flex items-center px-4 lg:px-8 gap-3">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-500">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="font-heading font-semibold text-slate-900 text-lg">
              {navItems.find((n) => isActive(n.path))?.label || "Dashboard"}
            </h2>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
            PH
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
