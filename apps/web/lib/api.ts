// Typed API client for the ThermalEye FastAPI backend.
// - JWT bearer auth with transparent one-shot refresh on 401
// - FastAPI error shape ({ detail: string | ValidationError[] }) -> ApiError.message

import type {
  Asset,
  AssetHealth,
  DashboardStats,
  FleetHealthSummary,
  Inspection,
  InspectionDetail,
  Me,
  Member,
  Organization,
  RegisterForm,
  TokenResponse,
  TrendResponse,
  UploadResult,
} from "./types";

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const PREFIX = "/api/v1";

const ACCESS_KEY = "te_access";
const REFRESH_KEY = "te_refresh";

// ── Token store (localStorage, guarded for SSR) ──────────────────────────────
function ls(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}
export function getAccess(): string | null {
  return ls()?.getItem(ACCESS_KEY) ?? null;
}
function getRefresh(): string | null {
  return ls()?.getItem(REFRESH_KEY) ?? null;
}
function setTokens(t: TokenResponse): void {
  ls()?.setItem(ACCESS_KEY, t.access_token);
  ls()?.setItem(REFRESH_KEY, t.refresh_token);
}
function clearTokens(): void {
  ls()?.removeItem(ACCESS_KEY);
  ls()?.removeItem(REFRESH_KEY);
}
export function hasSession(): boolean {
  return !!getAccess();
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

// ── Errors ───────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function messageFromDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((e) => (e && typeof e === "object" && "msg" in e ? String((e as { msg: unknown }).msg) : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join("; ");
  }
  return fallback;
}

// ── Refresh (single-flight) ──────────────────────────────────────────────────
let refreshInFlight: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  const refresh_token = getRefresh();
  if (!refresh_token) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}${PREFIX}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) return false;
      setTokens((await res.json()) as TokenResponse);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ── Core request ─────────────────────────────────────────────────────────────
interface Opts {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean; // attach access token (default true)
  _retry?: boolean;
}

async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, _retry = false } = opts;

  let url = `${BASE}${PREFIX}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {};
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (auth) {
    const access = getAccess();
    if (access) headers["Authorization"] = `Bearer ${access}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 401 && auth && !_retry) {
    if (await tryRefresh()) {
      return request<T>(path, { ...opts, _retry: true });
    }
    clearTokens();
    onUnauthorized?.();
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json())?.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, messageFromDetail(detail, res.statusText || "Request failed"), detail);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Public API surface ───────────────────────────────────────────────────────
export const api = {
  auth: {
    async login(email: string, password: string, org_id?: string): Promise<TokenResponse> {
      const t = await request<TokenResponse>("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password, org_id },
      });
      setTokens(t);
      return t;
    },
    async register(form: RegisterForm): Promise<TokenResponse> {
      const t = await request<TokenResponse>("/auth/register", { method: "POST", auth: false, body: form });
      setTokens(t);
      return t;
    },
    async switchOrg(org_id: string): Promise<TokenResponse> {
      const t = await request<TokenResponse>("/auth/switch-org", { method: "POST", body: { org_id } });
      setTokens(t);
      return t;
    },
    async logout(): Promise<void> {
      const refresh_token = getRefresh();
      if (refresh_token) {
        await request<unknown>("/auth/logout", { method: "POST", auth: false, body: { refresh_token } }).catch(
          () => undefined,
        );
      }
      clearTokens();
    },
    me: () => request<Me>("/auth/me"),
    forgot: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", { method: "POST", auth: false, body: { email } }),
    reset: (token: string, password: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        auth: false,
        body: { token, password },
      }),
  },

  org: {
    current: () => request<Organization>("/orgs/current"),
    updateBranding: (payload: Partial<Pick<Organization, "name" | "logo_url" | "primary_color" | "accent_color" | "industry">>) =>
      request<Organization>("/orgs/current/branding", { method: "PATCH", body: payload }),
    updateSettings: (payload: Record<string, unknown>) =>
      request<Organization>("/orgs/current/settings", { method: "PATCH", body: payload }),
    async uploadLogo(file: File): Promise<Organization> {
      const fd = new FormData();
      fd.append("file", file);
      return request<Organization>("/orgs/current/logo", { method: "POST", body: fd });
    },
    members: () => request<Member[]>("/orgs/current/members"),
    invite: (payload: { email: string; role: string; full_name?: string }) =>
      request<Member>("/orgs/current/members", { method: "POST", body: payload }),
    updateRole: (membershipId: string, role: string) =>
      request<Member>(`/orgs/current/members/${membershipId}`, { method: "PATCH", body: { role } }),
    removeMember: (membershipId: string) =>
      request<{ message: string }>(`/orgs/current/members/${membershipId}`, { method: "DELETE" }),
  },

  inspections: {
    stats: () => request<DashboardStats>("/inspections/stats/dashboard"),
    trend: (days = 30) => request<TrendResponse>("/inspections/stats/trend", { query: { days } }),
    list: (query?: Record<string, string>) => request<Inspection[]>("/inspections", { query }),
    get: (id: string) => request<InspectionDetail>(`/inspections/${id}`),
    remove: (id: string) => request<{ message: string }>(`/inspections/${id}`, { method: "DELETE" }),
    async upload(files: File[], capturedDate?: string): Promise<UploadResult> {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      if (capturedDate) fd.append("captured_date", capturedDate);
      return request<UploadResult>("/inspections/upload", { method: "POST", body: fd });
    },
  },

  reports: {
    generate: (inspectionId: string) =>
      request<{ report_url: string | null; format: string }>(`/reports/inspections/${inspectionId}`, {
        method: "POST",
      }),
    get: (inspectionId: string) =>
      request<{ report_url: string | null; format: string }>(`/reports/inspections/${inspectionId}`),
  },

  assets: {
    list: (query?: Record<string, string>) => request<Asset[]>("/assets", { query }),
    async import(file: File, replace = false): Promise<{ imported: number; skipped: number; errors: string[] }> {
      const fd = new FormData();
      fd.append("file", file);
      return request("/assets/import", { method: "POST", body: fd, query: { replace } });
    },
  },

  health: {
    fleet: () => request<FleetHealthSummary>("/assets/health"),
    asset: (assetId: string) => request<AssetHealth>(`/assets/${assetId}/health`),
  },
};
