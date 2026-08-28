// Centralized role & permission definitions for the pharmacy app.
//
// Import `can(user, "PERMISSION_NAME")` anywhere access needs to be gated,
// instead of checking `user.role === "..."` inline. Keeping the matrix in
// one file means the whole app's access rules can be audited — and changed
// — in one place, rather than hunting through every page.
//
// IMPORTANT: this is UI-level gating only. It hides/disables actions in
// the interface, but a user who calls the backend API directly can bypass
// it entirely unless your server ALSO enforces these restrictions on each
// request. Mirror this matrix in your backend's authorization checks for
// the Medication, Prescription, Sale, ShopInfo, Advertisement, and User
// endpoints — don't rely on this file alone.

export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  ASSISTANT_MANAGER: "assistant_manager",
  PHARMACIST: "pharmacist",
  EMPLOYEE: "employee",
};

export const ROLE_LABELS = {
  [ROLES.OWNER]: "Owner",
  [ROLES.MANAGER]: "Manager",
  [ROLES.ASSISTANT_MANAGER]: "Assistant Manager",
  [ROLES.PHARMACIST]: "Pharmacist",
  [ROLES.EMPLOYEE]: "Employee",
};

export const ALL_ROLES = Object.values(ROLES);

// Each permission maps to the set of roles allowed to perform it.
const PERMISSIONS = {
  // Inventory
  INVENTORY_VIEW: [ROLES.OWNER, ROLES.MANAGER, ROLES.ASSISTANT_MANAGER, ROLES.PHARMACIST, ROLES.EMPLOYEE],
  INVENTORY_EDIT: [ROLES.OWNER, ROLES.MANAGER, ROLES.ASSISTANT_MANAGER, ROLES.PHARMACIST],
  INVENTORY_DELETE: [ROLES.OWNER, ROLES.MANAGER],

  // Prescriptions
  PRESCRIPTIONS_VIEW: [ROLES.OWNER, ROLES.MANAGER, ROLES.ASSISTANT_MANAGER, ROLES.PHARMACIST, ROLES.EMPLOYEE],
  PRESCRIPTIONS_CREATE_EDIT: [ROLES.OWNER, ROLES.MANAGER, ROLES.ASSISTANT_MANAGER, ROLES.PHARMACIST],
  // Filling/dispensing is the actual clinical act — restricted to
  // pharmacists (plus ownership/management oversight).
  PRESCRIPTIONS_FILL: [ROLES.OWNER, ROLES.MANAGER, ROLES.PHARMACIST],
  PRESCRIPTIONS_DELETE: [ROLES.OWNER, ROLES.MANAGER],

  // Point of sale
  POS_SELL: [ROLES.OWNER, ROLES.MANAGER, ROLES.ASSISTANT_MANAGER, ROLES.PHARMACIST, ROLES.EMPLOYEE],
  POS_DISCOUNT: [ROLES.OWNER, ROLES.MANAGER, ROLES.ASSISTANT_MANAGER],

  // Shop page
  SHOP_EDIT_INFO: [ROLES.OWNER, ROLES.MANAGER],
  SHOP_MANAGE_ADS: [ROLES.OWNER, ROLES.MANAGER, ROLES.ASSISTANT_MANAGER],

  // Team / role management
  TEAM_VIEW: [ROLES.OWNER, ROLES.MANAGER],
  TEAM_EDIT_ROLES: [ROLES.OWNER, ROLES.MANAGER], // Owner-only carve-outs enforced in canAssignRole()
};

export function can(user, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) {
    console.warn(`Unknown permission: ${permission}`);
    return false;
  }
  return !!user && allowed.includes(user.role);
}

// Only an Owner can grant or revoke the Owner role, and no one but an
// Owner can change another Owner's role. Without this carve-out, a
// Manager (who otherwise has TEAM_EDIT_ROLES) could promote themselves
// to Owner or demote the actual Owner.
export function canAssignRole(actingUser, targetUser, newRole) {
  if (!can(actingUser, "TEAM_EDIT_ROLES")) return false;
  if (targetUser?.role === ROLES.OWNER && actingUser?.role !== ROLES.OWNER) return false;
  if (newRole === ROLES.OWNER && actingUser?.role !== ROLES.OWNER) return false;
  return true;
}
