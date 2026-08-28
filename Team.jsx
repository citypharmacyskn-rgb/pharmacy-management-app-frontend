import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { can, canAssignRole, ROLES, ROLE_LABELS, ALL_ROLES } from "@/lib/permissions";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Users as UsersIcon, Lock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_BADGE_STYLES = {
  [ROLES.OWNER]: "bg-violet-50 text-violet-700 border-violet-200",
  [ROLES.MANAGER]: "bg-teal-50 text-teal-700 border-teal-200",
  [ROLES.ASSISTANT_MANAGER]: "bg-blue-50 text-blue-700 border-blue-200",
  [ROLES.PHARMACIST]: "bg-amber-50 text-amber-700 border-amber-200",
  [ROLES.EMPLOYEE]: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function Team() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const canViewTeam = can(currentUser, "TEAM_VIEW");

  const load = () => {
    setLoading(true);
    api.entities.User.list()
      .then((d) => setUsers(d || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (canViewTeam) load();
    else setLoading(false);
  }, [canViewTeam]);

  const changeRole = async (targetUser, newRole) => {
    if (!canAssignRole(currentUser, targetUser, newRole)) {
      toast({ title: "You don't have permission to make this change", variant: "destructive" });
      return;
    }
    setSavingId(targetUser.id);
    try {
      await api.entities.User.update(targetUser.id, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === targetUser.id ? { ...u, role: newRole } : u));
      toast({ title: `${targetUser.full_name || targetUser.email} is now ${ROLE_LABELS[newRole]}` });
    } catch (e) {
      toast({ title: "Error updating role", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  if (!canViewTeam) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Access restricted</h2>
        <p className="text-sm text-slate-500 mt-1">
          Only Owners and Managers can view and manage team roles.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
          <UsersIcon className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500">Manage staff roles and permissions</p>
        </div>
      </div>

      {currentUser?.role === ROLES.MANAGER && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>As a Manager, you can assign any role except Owner, and you can't change an existing Owner's role.</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No team members found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {users.map((u) => {
            const editable = canAssignRole(currentUser, u, u.role) || canAssignRole(currentUser, u, ROLES.EMPLOYEE);
            const isSelf = u.id === currentUser?.id;
            return (
              <div key={u.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {u.full_name || u.email || "Unnamed user"}
                    {isSelf && <span className="text-slate-400 font-normal"> (you)</span>}
                  </p>
                  {u.email && u.full_name && <p className="text-xs text-slate-400 truncate">{u.email}</p>}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn("hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full border font-medium", ROLE_BADGE_STYLES[u.role] || ROLE_BADGE_STYLES[ROLES.EMPLOYEE])}>
                    {ROLE_LABELS[u.role] || "No role set"}
                  </span>

                  {editable ? (
                    <Select
                      value={u.role || ""}
                      onValueChange={(v) => changeRole(u, v)}
                      disabled={savingId === u.id}
                    >
                      <SelectTrigger className="w-44 h-9">
                        <SelectValue placeholder="Set role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => (
                          <SelectItem
                            key={r}
                            value={r}
                            disabled={!canAssignRole(currentUser, u, r)}
                          >
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-slate-400 w-44 text-right pr-1">Not editable by you</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
