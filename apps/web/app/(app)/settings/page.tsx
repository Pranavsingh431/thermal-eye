"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Palette, SlidersHorizontal, Users, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { applyBrand } from "@/lib/utils";
import type { Member, Organization } from "@/lib/types";

type Tab = "branding" | "alerts" | "team";

export default function SettingsPage() {
  const { org, reload, me } = useAuth();
  const [tab, setTab] = useState<Tab>("branding");
  const canManage = me?.active_role === "owner" || me?.active_role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">Customize ThermalEye for {org?.name}.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {([["branding", "Branding", Palette], ["alerts", "Thresholds & Alerts", SlidersHorizontal], ["team", "Team", Users]] as const).map(
          ([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === key ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
      </div>

      {!org ? <p className="text-gray-500">Loading…</p> : (
        <>
          {tab === "branding" && <BrandingTab org={org} onSaved={reload} disabled={!canManage} />}
          {tab === "alerts" && <AlertsTab org={org} onSaved={reload} disabled={!canManage} />}
          {tab === "team" && <TeamTab disabled={!canManage} currentRole={me?.active_role || "viewer"} />}
        </>
      )}
    </div>
  );
}

function BrandingTab({ org, onSaved, disabled }: { org: Organization; onSaved: () => void; disabled: boolean }) {
  const [f, setF] = useState({ name: org.name, logo_url: org.logo_url || "", primary_color: org.primary_color, accent_color: org.accent_color, industry: org.industry || "" });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.org.updateBranding(f);
      applyBrand(f.primary_color, f.accent_color);
      toast.success("Branding saved");
      onSaved();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="card max-w-2xl space-y-4 p-6">
      <div><label className="label">Company name</label>
        <input className="input" value={f.name} disabled={disabled} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label">Logo URL</label>
        <input className="input" value={f.logo_url} disabled={disabled} onChange={(e) => setF({ ...f, logo_url: e.target.value })} placeholder="https://…/logo.png" /></div>
      <div><label className="label">Industry</label>
        <input className="input" value={f.industry} disabled={disabled} onChange={(e) => setF({ ...f, industry: e.target.value })} placeholder="Power utility, Solar, Rail…" /></div>
      <div className="flex gap-4">
        <div><label className="label">Primary color</label>
          <input type="color" className="h-11 w-20 rounded-lg border border-gray-300" value={f.primary_color} disabled={disabled} onChange={(e) => { setF({ ...f, primary_color: e.target.value }); applyBrand(e.target.value, null); }} /></div>
        <div><label className="label">Accent color</label>
          <input type="color" className="h-11 w-20 rounded-lg border border-gray-300" value={f.accent_color} disabled={disabled} onChange={(e) => { setF({ ...f, accent_color: e.target.value }); applyBrand(null, e.target.value); }} /></div>
      </div>
      {!disabled && <button className="btn-brand" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save branding"}</button>}
    </div>
  );
}

function AlertsTab({ org, onSaved, disabled }: { org: Organization; onSaved: () => void; disabled: boolean }) {
  const s = org.settings;
  const [t, setT] = useState(s.thresholds);
  const [recipients, setRecipients] = useState((s.alert_recipients || []).join(", "));
  const [enabled, setEnabled] = useState(s.alerts_enabled);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.org.updateSettings({
        thresholds: t,
        alerts_enabled: enabled,
        alert_recipients: recipients.split(",").map((x) => x.trim()).filter(Boolean),
      });
      toast.success("Settings saved");
      onSaved();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : "Save failed"); }
    finally { setBusy(false); }
  }

  const num = (k: keyof typeof t) => (e: React.ChangeEvent<HTMLInputElement>) => setT({ ...t, [k]: Number(e.target.value) });

  return (
    <div className="card max-w-2xl space-y-5 p-6">
      <div>
        <h3 className="font-semibold">Thermal thresholds (°C)</h3>
        <p className="text-sm text-gray-500">Classify hotspots by temperature rise over ambient (ΔT) and absolute temperature.</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div><label className="label">Warning ΔT</label><input type="number" className="input" value={t.warning_delta} disabled={disabled} onChange={num("warning_delta")} /></div>
          <div><label className="label">Critical ΔT</label><input type="number" className="input" value={t.critical_delta} disabled={disabled} onChange={num("critical_delta")} /></div>
          <div><label className="label">Warning absolute</label><input type="number" className="input" value={t.warning_abs} disabled={disabled} onChange={num("warning_abs")} /></div>
          <div><label className="label">Critical absolute</label><input type="number" className="input" value={t.critical_abs} disabled={disabled} onChange={num("critical_abs")} /></div>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={enabled} disabled={disabled} onChange={(e) => setEnabled(e.target.checked)} />
          Email alerts enabled
        </label>
        <label className="label mt-3">Alert recipients (comma-separated)</label>
        <input className="input" value={recipients} disabled={disabled} onChange={(e) => setRecipients(e.target.value)} placeholder="ops@company.com, manager@company.com" />
        <p className="mt-1 text-xs text-gray-400">If empty, alerts go to the platform default recipient.</p>
      </div>
      {!disabled && <button className="btn-brand" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>}
    </div>
  );
}

function TeamTab({ disabled, currentRole }: { disabled: boolean; currentRole: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("inspector");
  const [busy, setBusy] = useState(false);

  const load = () => api.org.members().then(setMembers).catch(() => {});
  useEffect(() => { load(); }, []);

  async function invite() {
    if (!email) return;
    setBusy(true);
    try {
      await api.org.invite({ email, role });
      toast.success("Invitation sent");
      setEmail("");
      load();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : "Invite failed"); }
    finally { setBusy(false); }
  }

  async function changeRole(id: string, newRole: string) {
    try { await api.org.updateRole(id, newRole); load(); } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
  }
  async function removeMember(id: string) {
    if (!confirm("Remove this member?")) return;
    try { await api.org.removeMember(id); load(); } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
  }

  const roles = ["viewer", "inspector", "admin", ...(currentRole === "owner" ? ["owner"] : [])];

  return (
    <div className="space-y-6">
      {!disabled && (
        <div className="card flex flex-wrap items-end gap-3 p-5">
          <div className="flex-1"><label className="label">Invite by email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" /></div>
          <div><label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select></div>
          <button className="btn-brand" onClick={invite} disabled={busy}><Plus className="h-4 w-4" /> Invite</button>
        </div>
      )}
      <div className="card divide-y divide-gray-100 dark:divide-gray-800">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{m.full_name || m.email}</p>
              <p className="truncate text-sm text-gray-500">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {disabled ? (
                <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-800">{m.role}</span>
              ) : (
                <select className="input !py-1.5 !w-auto" value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}>
                  {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              {!disabled && <button className="btn-ghost text-red-600 !p-2" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4" /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
