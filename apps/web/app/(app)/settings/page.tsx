"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Palette, SlidersHorizontal, Users, Plus, Trash2, BellRing, Upload, Thermometer } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { applyBrand } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import type { Member, Organization, Thresholds } from "@/lib/types";

type Tab = "branding" | "thermal" | "alerts" | "team";

const ASSET_TYPES = ["tower", "line", "substation", "transformer", "insulator", "solar_panel", "equipment"];

export default function SettingsPage() {
  const { org, reload, me } = useAuth();
  const [tab, setTab] = useState<Tab>("branding");
  const canManage = me?.active_role === "owner" || me?.active_role === "admin";

  const tabs: [Tab, string, React.ElementType][] = [
    ["branding", "Branding", Palette],
    ["thermal", "Thermal model", Thermometer],
    ["alerts", "Alerts", BellRing],
    ["team", "Team", Users],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">Customize Thermal Eye for {org?.name}.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {!org ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          {tab === "branding" && <BrandingTab org={org} onSaved={reload} disabled={!canManage} />}
          {tab === "thermal" && <ThermalTab org={org} onSaved={reload} disabled={!canManage} />}
          {tab === "alerts" && <AlertsTab org={org} onSaved={reload} disabled={!canManage} />}
          {tab === "team" && <TeamTab disabled={!canManage} currentRole={me?.active_role || "viewer"} />}
        </>
      )}
    </div>
  );
}

function BrandingTab({ org, onSaved, disabled }: { org: Organization; onSaved: () => void; disabled: boolean }) {
  const [f, setF] = useState({
    name: org.name,
    logo_url: org.logo_url || "",
    primary_color: org.primary_color,
    accent_color: org.accent_color,
    industry: org.industry || "",
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    setBusy(true);
    try {
      await api.org.updateBranding(f);
      applyBrand(f.primary_color, f.accent_color);
      toast.success("Branding saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onLogoFile(file: File) {
    setUploading(true);
    try {
      const updated = await api.org.uploadLogo(file);
      setF((prev) => ({ ...prev, logo_url: updated.logo_url || "" }));
      toast.success("Logo uploaded");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="card max-w-2xl space-y-5 p-6">
      {/* Logo */}
      <div>
        <label className="label">Logo</label>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <BrandLogo logoUrl={f.logo_url || null} className="h-11 w-11" />
          </div>
          <div>
            <button
              className="btn-outline"
              disabled={disabled || uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload logo"}
            </button>
            <p className="mt-1.5 text-xs text-gray-400">
              PNG, JPG, WebP or SVG · up to 2 MB. Leave empty to use the Thermal Eye mark.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])}
            />
          </div>
          {f.logo_url && !disabled && (
            <button
              className="btn-ghost ml-auto text-red-600"
              onClick={() => setF({ ...f, logo_url: "" })}
              title="Remove logo (revert to Thermal Eye mark)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="label">Company name</label>
        <input className="input" value={f.name} disabled={disabled} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </div>
      <div>
        <label className="label">Industry</label>
        <input
          className="input"
          value={f.industry}
          disabled={disabled}
          onChange={(e) => setF({ ...f, industry: e.target.value })}
          placeholder="Power utility, Solar, Rail…"
        />
      </div>
      <div className="flex gap-4">
        <div>
          <label className="label">Primary color</label>
          <input
            type="color"
            className="h-11 w-20 rounded-lg border border-gray-300 dark:border-gray-700"
            value={f.primary_color}
            disabled={disabled}
            onChange={(e) => {
              setF({ ...f, primary_color: e.target.value });
              applyBrand(e.target.value, null);
            }}
          />
        </div>
        <div>
          <label className="label">Accent color</label>
          <input
            type="color"
            className="h-11 w-20 rounded-lg border border-gray-300 dark:border-gray-700"
            value={f.accent_color}
            disabled={disabled}
            onChange={(e) => {
              setF({ ...f, accent_color: e.target.value });
              applyBrand(null, e.target.value);
            }}
          />
        </div>
      </div>
      {!disabled && (
        <button className="btn-brand" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save branding"}
        </button>
      )}
    </div>
  );
}

function ThresholdGrid({
  value,
  onChange,
  disabled,
  unit,
}: {
  value: Thresholds;
  onChange: (t: Thresholds) => void;
  disabled: boolean;
  unit: string;
}) {
  const num = (k: keyof Thresholds) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: Number(e.target.value) });
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">Warning ΔT ({unit})</label>
        <input type="number" className="input" value={value.warning_delta} disabled={disabled} onChange={num("warning_delta")} />
      </div>
      <div>
        <label className="label">Critical ΔT ({unit})</label>
        <input type="number" className="input" value={value.critical_delta} disabled={disabled} onChange={num("critical_delta")} />
      </div>
      <div>
        <label className="label">Warning absolute ({unit})</label>
        <input type="number" className="input" value={value.warning_abs} disabled={disabled} onChange={num("warning_abs")} />
      </div>
      <div>
        <label className="label">Critical absolute ({unit})</label>
        <input type="number" className="input" value={value.critical_abs} disabled={disabled} onChange={num("critical_abs")} />
      </div>
    </div>
  );
}

function ThermalTab({ org, onSaved, disabled }: { org: Organization; onSaved: () => void; disabled: boolean }) {
  const s = org.settings;
  const [units, setUnits] = useState(s.units || "celsius");
  const [emissivity, setEmissivity] = useState(s.emissivity ?? 0.95);
  const [t, setT] = useState<Thresholds>(s.thresholds);
  const [profiles, setProfiles] = useState<Record<string, Thresholds>>(s.threshold_profiles || {});
  const [newType, setNewType] = useState(ASSET_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const unit = units === "fahrenheit" ? "°F" : "°C";

  async function save() {
    setBusy(true);
    try {
      await api.org.updateSettings({ units, emissivity, thresholds: t, threshold_profiles: profiles });
      toast.success("Thermal model saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function addProfile() {
    if (profiles[newType]) return;
    setProfiles({ ...profiles, [newType]: { ...t } });
  }
  function removeProfile(type: string) {
    const next = { ...profiles };
    delete next[type];
    setProfiles(next);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card space-y-5 p-6">
        <div>
          <h3 className="font-semibold">Measurement</h3>
          <p className="text-sm text-gray-500">How readings are interpreted across your fleet.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Temperature unit</label>
            <select className="input" value={units} disabled={disabled} onChange={(e) => setUnits(e.target.value)}>
              <option value="celsius">Celsius (°C)</option>
              <option value="fahrenheit">Fahrenheit (°F)</option>
            </select>
          </div>
          <div>
            <label className="label">Default emissivity</label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="1"
              className="input"
              value={emissivity}
              disabled={disabled}
              onChange={(e) => setEmissivity(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-gray-400">Typical: 0.95 for oxidised metal / porcelain insulators.</p>
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-6">
        <div>
          <h3 className="font-semibold">Default thresholds</h3>
          <p className="text-sm text-gray-500">Classify hotspots by rise over ambient (ΔT) and absolute temperature.</p>
        </div>
        <ThresholdGrid value={t} onChange={setT} disabled={disabled} unit={unit} />
      </div>

      <div className="card space-y-4 p-6">
        <div>
          <h3 className="font-semibold">Per-asset-type overrides</h3>
          <p className="text-sm text-gray-500">
            Apply stricter (or looser) limits to specific equipment — e.g. transformers vs. towers.
          </p>
        </div>
        {Object.keys(profiles).length === 0 && (
          <p className="text-sm text-gray-400">No overrides — every asset uses the default thresholds above.</p>
        )}
        {Object.entries(profiles).map(([type, prof]) => (
          <div key={type} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <span className="badge bg-brand/10 capitalize text-brand">{type.replace("_", " ")}</span>
              {!disabled && (
                <button className="btn-ghost !p-1.5 text-red-600" onClick={() => removeProfile(type)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <ThresholdGrid
              value={prof}
              onChange={(v) => setProfiles({ ...profiles, [type]: v })}
              disabled={disabled}
              unit={unit}
            />
          </div>
        ))}
        {!disabled && (
          <div className="flex items-end gap-2">
            <div>
              <label className="label">Add override for</label>
              <select className="input !w-auto" value={newType} onChange={(e) => setNewType(e.target.value)}>
                {ASSET_TYPES.filter((a) => !profiles[a]).map((a) => (
                  <option key={a} value={a} className="capitalize">
                    {a.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-outline" onClick={addProfile}>
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        )}
      </div>

      {!disabled && (
        <button className="btn-brand" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save thermal model"}
        </button>
      )}
    </div>
  );
}

function AlertsTab({ org, onSaved, disabled }: { org: Organization; onSaved: () => void; disabled: boolean }) {
  const s = org.settings;
  const [recipients, setRecipients] = useState((s.alert_recipients || []).join(", "));
  const [enabled, setEnabled] = useState(s.alerts_enabled);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.org.updateSettings({
        alerts_enabled: enabled,
        alert_recipients: recipients.split(",").map((x) => x.trim()).filter(Boolean),
      });
      toast.success("Alert settings saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-2xl space-y-5 p-6">
      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" checked={enabled} disabled={disabled} onChange={(e) => setEnabled(e.target.checked)} />
        Email alerts on warning / critical hotspots
      </label>
      <div>
        <label className="label">Alert recipients (comma-separated)</label>
        <input
          className="input"
          value={recipients}
          disabled={disabled}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="ops@company.com, manager@company.com"
        />
        <p className="mt-1 text-xs text-gray-400">If empty, alerts go to the platform default recipient.</p>
      </div>
      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        Email delivery requires SMTP credentials configured on the server (<code>SMTP_USER</code> / <code>SMTP_PASSWORD</code>).
        Until then, alerts are recorded but not sent.
      </div>
      {!disabled && (
        <button className="btn-brand" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save alert settings"}
        </button>
      )}
    </div>
  );
}

function TeamTab({ disabled, currentRole }: { disabled: boolean; currentRole: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("inspector");
  const [busy, setBusy] = useState(false);

  const load = () => api.org.members().then(setMembers).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  async function invite() {
    if (!email) return;
    setBusy(true);
    try {
      await api.org.invite({ email, role });
      toast.success("Invitation sent");
      setEmail("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, newRole: string) {
    try {
      await api.org.updateRole(id, newRole);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed");
    }
  }
  async function removeMember(id: string) {
    if (!confirm("Remove this member?")) return;
    try {
      await api.org.removeMember(id);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed");
    }
  }

  const roles = ["viewer", "inspector", "admin", ...(currentRole === "owner" ? ["owner"] : [])];

  return (
    <div className="space-y-6">
      {!disabled && (
        <div className="card flex flex-wrap items-end gap-3 p-5">
          <div className="flex-1">
            <label className="label">Invite by email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-brand" onClick={invite} disabled={busy}>
            <Plus className="h-4 w-4" /> Invite
          </button>
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
                <select className="input !w-auto !py-1.5" value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
              {!disabled && (
                <button className="btn-ghost !p-2 text-red-600" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
