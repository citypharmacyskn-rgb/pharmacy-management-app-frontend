// Generic REST API client.
//
// This replaces the Base44 SDK entirely — no @base44/sdk dependency, no
// Base44-hosted auth or entity storage. Point VITE_API_BASE_URL at your own
// backend (Express, Django, Rails, whatever) that implements the endpoints
// referenced below, and everything in the app keeps working unchanged.
//
// The entity client's shape (list/filter/create/update/delete) intentionally
// mirrors what the pages already call, so no page-level logic had to change
// — only the import and the base44 -> api rename.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "auth_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, headers } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch { /* no JSON body */ }
    const err = new Error(data.message || res.statusText || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, v);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

// Mirrors the original list(sortField, limit) call shape, e.g.
// list("-created_date", 200) -> GET /entities/Medication?sort=-created_date&limit=200
function makeEntityClient(entityName) {
  const base = `/entities/${entityName}`;
  return {
    list: (sort, limit) => request(`${base}${buildQuery({ sort, limit })}`),
    filter: (query) => request(`${base}${buildQuery(query)}`),
    create: (data) => request(base, { method: "POST", body: data }),
    update: (id, data) => request(`${base}/${encodeURIComponent(id)}`, { method: "PATCH", body: data }),
    delete: (id) => request(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

export const api = {
  auth: {
    getToken,
    setToken,

    me: () => request("/auth/me"),

    loginViaEmailPassword: async (email, password) => {
      const data = await request("/auth/login", { method: "POST", body: { email, password } });
      setToken(data.access_token);
      return data;
    },

    register: (payload) => request("/auth/register", { method: "POST", body: payload }),

    verifyOtp: async ({ email, otpCode }) => {
      const data = await request("/auth/verify-otp", { method: "POST", body: { email, otp_code: otpCode } });
      if (data.access_token) setToken(data.access_token);
      return data;
    },

    resendOtp: (email) => request("/auth/resend-otp", { method: "POST", body: { email } }),

    resetPasswordRequest: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),

    resetPassword: ({ resetToken, newPassword }) =>
      request("/auth/reset-password", { method: "POST", body: { reset_token: resetToken, new_password: newPassword } }),

    // Redirects to your backend's OAuth entry point. Your backend handles
    // the provider exchange and redirects back with a token (e.g. via
    // #access_token=... or a one-time code your frontend exchanges).
    loginWithProvider: (provider, redirectTo) => {
      const target = redirectTo || window.location.href;
      window.location.href = `${API_BASE_URL}/auth/${provider}?redirect=${encodeURIComponent(target)}`;
    },

    logout: (redirectTo) => {
      setToken(null);
      if (redirectTo) window.location.href = redirectTo;
    },
  },

  entities: {
    Medication: {
      ...makeEntityClient("Medication"),
      // Atomic, race-safe stock adjustment. Use this instead of reading
      // stock_quantity client-side and PATCHing a computed value — that
      // pattern has a read-then-write race under concurrent checkouts
      // (two sales of the same medication can both read the same starting
      // quantity and clobber each other). The server does the decrement
      // in a single SQL statement instead. Pass a negative delta to sell,
      // positive to restock; the server floors the result at 0.
      adjustStock: (id, delta) =>
        request(`/entities/Medication/${encodeURIComponent(id)}/adjust-stock`, {
          method: "POST",
          body: { delta },
        }),
    },
    Prescription: makeEntityClient("Prescription"),
    Sale: makeEntityClient("Sale"),
    ShopInfo: makeEntityClient("ShopInfo"),
    Advertisement: makeEntityClient("Advertisement"),
    User: makeEntityClient("User"),
  },
};
