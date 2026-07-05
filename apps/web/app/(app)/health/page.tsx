"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  HeartPulse,
  MapPin,
  Minus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { AssetHealth, FleetHealthSummary } from "@/lib/types";
import { cn, formatDay, formatMoney } from "@/lib/utils";

const RISK = {
  CRITICAL: { badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", bar: "#dc2626", label: "Critical" },
  WARNING: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", bar: "#d97706", label: "Warning" },
  NORMAL: { badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300", bar: "#16a34a", label: "Healthy" },
  UNKNOWN: { badge: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400", bar: "#9ca3af", label: "Unknown" },
} as const;

function riskOf(r: string) {
  return RISK[(r as keyof typeof RISK)] ?? RISK.UNKNOWN;
}

function TrendIndicator({ h }: { h: AssetHealth }) {
  if (h.trend === "worsening")
    return (
      <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
        <TrendingUp className="h-4 w-4" /> +{h.slope_c_per_month}°/mo
      </span>
    );
  if (h.trend === "improving")
    return (
      <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
        <TrendingDown className="h-4 w-4" /> {h.slope_c_per_month}°/mo
      </span>
    );
  if (h.trend === "stable")
    return (
      <span className="inline-flex items-center gap-1 text-gray-500">
        <Minus className="h-4 w-4" /> Stable
      </span>
    );
  return <span className="text-xs text-gray-400">Need more data</span>;
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="w-8 text-sm font-semibold tabular-nums">{Math.round(score)}</span>
    </div>
  );
}

function ForecastCell({ h }: { h: AssetHealth }) {
  if (h.months_to_critical == null)
    return <span className="text-gray-400">—</span>;
  if (h.months_to_critical <= 0.2)
    return <span className="font-semibold text-red-600 dark:text-red-400">Now</span>;
  const wks = Math.max(1, Math.round(h.months_to_critical * 4.345));
  return (
    <span className="font-medium">
      {h.predicted_cross_date ? formatDay(h.predicted_cross_date) : `~${h.months_to_critical} mo`}
      <span className="ml-1 text-xs text-gray-400">(~{wks}w)</span>
    </span>
  );
}

function HealthChart({ h, threshold }: { h: AssetHealth; threshold: number }) {
  const data: { label: string; actual: number | null; projected?: number | null }[] = h.history.map((p) => ({
    label: new Date(p.captured_at).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
    actual: p.delta_t ?? p.measured_temp ?? null,
  }));
  if (h.predicted_cross_date && h.trend === "worsening" && data.length) {
    data[data.length - 1].projected = data[data.length - 1].actual;
    data.push({
      label: new Date(h.predicted_cross_date).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      actual: null,
      projected: threshold,
    });
  }
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} width={44} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e5e7eb" }}
            formatter={(v: number) => [`${v}°C`, "ΔT"]}
          />
          <ReferenceLine
            y={threshold}
            stroke="#dc2626"
            strokeDasharray="5 4"
            label={{ value: "critical", fontSize: 10, fill: "#dc2626", position: "insideTopRight" }}
          />
          <Line type="monotone" dataKey="actual" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="projected" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function AssetRow({ h, threshold, currency }: { h: AssetHealth; threshold: number; currency: string }) {
  const [open, setOpen] = useState(false);
  const risk = riskOf(h.risk_level);
  return (
    <>
      <tr className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50" onClick={() => setOpen((o) => !o)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")} />
            <div className="min-w-0">
              <p className="truncate font-medium">{h.asset_name}</p>
              <p className="truncate text-xs text-gray-400">
                {h.external_id ? `${h.external_id} · ` : ""}{h.asset_type}{h.voltage_kv ? ` · ${h.voltage_kv} kV` : ""}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><ScoreBar score={h.health_score} color={risk.bar} /></td>
        <td className="px-4 py-3"><TrendIndicator h={h} /></td>
        <td className="px-4 py-3 font-medium tabular-nums">{h.latest_delta_t != null ? `${h.latest_delta_t}°C` : "—"}</td>
        <td className="px-4 py-3"><ForecastCell h={h} /></td>
        <td className="px-4 py-3">
          <span className={cn("badge", risk.badge)}>{risk.label}</span>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50/60 dark:bg-gray-900/40">
          <td colSpan={6} className="px-4 py-5">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Temperature-rise history &amp; forecast</h4>
                  <span className="text-xs text-gray-400">{h.inspection_count} inspections</span>
                </div>
                {h.history.length >= 2 ? (
                  <HealthChart h={h} threshold={threshold} />
                ) : (
                  <p className="py-10 text-center text-sm text-gray-400">Not enough history to chart yet.</p>
                )}
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recommendation</p>
                  <p className="mt-1.5 text-sm leading-relaxed">{h.recommendation}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="First inspected" value={formatDay(h.first_seen)} />
                  <Stat label="Last inspected" value={formatDay(h.last_seen)} />
                  <Stat label="Trend fit (R²)" value={h.r_squared != null ? h.r_squared.toFixed(2) : "—"} />
                  <Stat label="Cost if it fails" value={h.failure_cost ? formatMoney(h.failure_cost, currency) : "—"} />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: string;
  sub?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon className={cn("h-5 w-5", tone || "text-gray-400")} />
      </div>
      <div className={cn("mt-2 text-3xl font-bold", tone === "text-warning" && "text-amber-600 dark:text-amber-400")}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

/** Groups at-risk assets into action windows — the "predictive maintenance calendar." */
function MaintenanceSchedule({ assets }: { assets: AssetHealth[] }) {
  const buckets = [
    {
      key: "now",
      title: "Immediate",
      hint: "At or past critical — dispatch now",
      color: "#dc2626",
      items: assets.filter((a) => a.months_to_critical != null && a.months_to_critical <= 1),
    },
    {
      key: "quarter",
      title: "This quarter",
      hint: "Projected critical within ~3 months",
      color: "#d97706",
      items: assets.filter((a) => a.months_to_critical != null && a.months_to_critical > 1 && a.months_to_critical <= 3),
    },
    {
      key: "half",
      title: "Within 6 months",
      hint: "Trending — plan a visit",
      color: "#ca8a04",
      items: assets.filter((a) => a.months_to_critical != null && a.months_to_critical > 3 && a.months_to_critical <= 6),
    },
  ];
  if (buckets.every((b) => b.items.length === 0)) return null;

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-brand" />
        <h3 className="font-semibold">Recommended maintenance schedule</h3>
        <span className="text-xs text-gray-400">Forecast-driven work plan</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {buckets.map((b) => (
          <div key={b.key} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
              <span className="text-sm font-semibold">{b.title}</span>
              <span className="ml-auto text-xs text-gray-400">{b.items.length}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">{b.hint}</p>
            <div className="mt-3 space-y-2">
              {b.items.length === 0 ? (
                <p className="text-xs text-gray-400">Nothing scheduled.</p>
              ) : (
                b.items.slice(0, 6).map((a) => (
                  <div key={a.asset_id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{a.asset_name}</span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {a.predicted_cross_date ? formatDay(a.predicted_cross_date) : `~${a.months_to_critical} mo`}
                    </span>
                  </div>
                ))
              )}
              {b.items.length > 6 && <p className="text-xs text-gray-400">+{b.items.length - 6} more</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<FleetHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.health
      .fleet()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HeartPulse className="h-6 w-6 text-brand" /> Insulator Health
        </h1>
        <p className="text-sm text-gray-500">
          Predictive maintenance from your inspection history — which asset crosses critical next, and when.
        </p>
      </div>

      {loading ? (
        <div className="text-gray-500">Analyzing inspection history…</div>
      ) : error ? (
        <div className="card p-6 text-sm text-gray-500">Could not load fleet health. Try again shortly.</div>
      ) : !data || data.total_inspections === 0 ? (
        <div className="card grid place-items-center gap-3 py-16 text-center">
          <Activity className="h-10 w-10 text-gray-300" />
          <div>
            <p className="font-medium">No inspections to analyze yet</p>
            <p className="mt-1 max-w-md text-sm text-gray-400">
              Upload thermal images over time. Once an asset accumulates a few inspections,
              Thermal Eye projects when it trends toward failure.
            </p>
          </div>
          <Link href="/upload" className="btn-brand mt-1">Upload inspections</Link>
        </div>
      ) : data.assets_analyzed === 0 ? (
        <div className="card grid place-items-center gap-3 py-16 text-center">
          <MapPin className="h-10 w-10 text-amber-400" />
          <div>
            <p className="font-medium">
              {data.total_inspections} inspection{data.total_inspections === 1 ? "" : "s"} on record — but none matched to a grid asset yet
            </p>
            <p className="mt-1 max-w-lg text-sm text-gray-400">
              Forecasting is per-asset: inspections snap to your towers/substations by GPS. Import
              your grid (towers, lines, substations) so images match to assets — then trends and
              failure forecasts appear here automatically.
            </p>
          </div>
          <div className="mt-1 flex gap-2">
            <Link href="/assets" className="btn-brand">Import your grid</Link>
            <Link href="/map" className="btn-outline">View on map</Link>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Tip: images need GPS (EXIF) within ~25 km of an asset to match automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={AlertTriangle}
              label="Value at risk"
              value={data.value_at_risk > 0 ? formatMoney(data.value_at_risk, data.currency) : "—"}
              tone="text-warning"
              sub={`across ${data.at_risk_count} at-risk asset${data.at_risk_count === 1 ? "" : "s"}`}
            />
            <SummaryCard icon={Activity} label="Assets analyzed" value={data.assets_analyzed} tone="text-brand" />
            <SummaryCard icon={TrendingUp} label="Worsening trend" value={data.worsening_count} tone="text-warning" />
            <SummaryCard icon={ShieldCheck} label="Critical ΔT" value={`${data.critical_threshold_delta}°C`} tone="text-normal" />
          </div>

          <MaintenanceSchedule assets={data.assets} />

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <CalendarClock className="h-4 w-4 text-gray-400" />
              <h3 className="font-semibold">Fleet risk ranking</h3>
              <span className="ml-auto text-xs text-gray-400">Highest risk first · click a row for the trend</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Health</th>
                    <th className="px-4 py-3">Trend</th>
                    <th className="px-4 py-3">Latest ΔT</th>
                    <th className="px-4 py-3">Projected critical</th>
                    <th className="px-4 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((h) => (
                    <AssetRow key={h.asset_id} h={h} threshold={data.critical_threshold_delta} currency={data.currency} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Forecasts are a least-squares trend over each asset's real ΔT history. Confidence rises
            with more inspections; assets with too little history are marked accordingly and never
            given a fabricated prediction.
          </p>
        </>
      )}
    </div>
  );
}
