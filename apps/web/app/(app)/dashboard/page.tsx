"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Flame,
  ThermometerSun,
  CircleCheck,
  Network,
  Clock,
  Activity,
  Gauge,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { AssetHealth, DashboardStats, FleetHealthSummary, Inspection, TrendResponse } from "@/lib/types";
import { faultBadgeClass, faultColor, formatDay, formatMoney } from "@/lib/utils";

function StatCard({
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
        <Icon className={`h-5 w-5 ${tone || "text-gray-400"}`} />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "#dc2626",
  WARNING: "#d97706",
  NORMAL: "#16a34a",
  UNKNOWN: "#9ca3af",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Inspection[]>([]);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [fleet, setFleet] = useState<FleetHealthSummary | null>(null);
  const [risk, setRisk] = useState<AssetHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.inspections.stats(),
      api.inspections.list({ limit: "6" }),
      api.inspections.trend(30).catch(() => null),
      api.health.fleet().catch(() => null),
    ])
      .then(([s, r, t, f]) => {
        setStats(s);
        setRecent(r);
        setTrend(t);
        setFleet(f);
        setRisk(f ? f.assets.filter((a) => a.risk_level !== "NORMAL").slice(0, 5) : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const donut = stats
    ? [
        { name: "Critical", value: stats.critical_count, color: faultColor.CRITICAL },
        { name: "Warning", value: stats.warning_count, color: faultColor.WARNING },
        { name: "Normal", value: stats.normal_count, color: faultColor.NORMAL },
        { name: "Failed", value: stats.failed_count, color: "#9ca3af" },
      ].filter((d) => d.value > 0)
    : [];

  const chartData =
    trend?.points.map((p) => ({
      date: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      Critical: p.critical,
      Warning: p.warning,
      Normal: p.normal,
      avg: p.avg_temp,
    })) || [];
  const hasTrend = chartData.some((d) => d.Critical + d.Warning + d.Normal > 0);

  if (loading) return <div className="text-gray-500">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet overview</h1>
          <p className="text-sm text-gray-500">Thermal health, trends and risk at a glance.</p>
        </div>
        <Link href="/upload" className="btn-brand">
          Upload images
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ThermometerSun}
          label="Total inspections"
          value={stats?.total_inspections ?? 0}
          sub={`${stats?.last_24h ?? 0} in last 24h`}
        />
        <StatCard icon={Flame} label="Critical" value={stats?.critical_count ?? 0} tone="text-critical" />
        <StatCard icon={AlertTriangle} label="Warnings" value={stats?.warning_count ?? 0} tone="text-warning" />
        <StatCard icon={Network} label="Assets tracked" value={stats?.total_assets ?? 0} tone="text-brand" />
      </div>

      {/* Value at risk — the number that reframes the sale */}
      {fleet && fleet.value_at_risk > 0 && (
        <Link
          href="/health"
          className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] to-red-500/[0.06] p-5 transition-colors hover:border-amber-500/50"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-gray-500">Value at risk</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {formatMoney(fleet.value_at_risk, fleet.currency)}
              </p>
            </div>
          </div>
          <p className="max-w-md text-sm text-gray-500">
            Estimated cost of unplanned failure across{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{fleet.at_risk_count}</span>{" "}
            at-risk asset{fleet.at_risk_count === 1 ? "" : "s"}. Early detection is what protects it —{" "}
            <span className="font-medium text-brand group-hover:underline">see the forecast →</span>
          </p>
        </Link>
      )}

      {/* Secondary metric strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Gauge}
          label="Avg measured temp"
          value={stats?.avg_measured_temp != null ? `${stats.avg_measured_temp}°C` : "—"}
        />
        <StatCard icon={Activity} label="Avg ΔT" value={stats?.avg_delta_t != null ? `${stats.avg_delta_t}°C` : "—"} />
        <StatCard
          icon={Flame}
          label="Hottest reading (30d)"
          value={trend?.max_temp != null ? `${trend.max_temp}°C` : "—"}
          tone="text-critical"
          sub={trend?.hottest_asset || undefined}
        />
      </div>

      {/* Trend + distribution */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Inspection activity</h3>
              <p className="text-xs text-gray-400">Last 30 days · by severity</p>
            </div>
            <TrendUpLegend />
          </div>
          {hasTrend ? (
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    {(["Critical", "Warning", "Normal"] as const).map((k) => (
                      <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={faultColor[k.toUpperCase()]} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={faultColor[k.toUpperCase()]} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b822" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={32} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e5e7eb" }} />
                  <Area type="monotone" dataKey="Normal" stackId="1" stroke={faultColor.NORMAL} fill="url(#g-Normal)" />
                  <Area type="monotone" dataKey="Warning" stackId="1" stroke={faultColor.WARNING} fill="url(#g-Warning)" />
                  <Area type="monotone" dataKey="Critical" stackId="1" stroke={faultColor.CRITICAL} fill="url(#g-Critical)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-gray-400">No inspection activity in the last 30 days.</p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold">Fault distribution</h3>
          {donut.length ? (
            <div className="mt-2 h-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2}>
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-8 text-center text-sm text-gray-400">No inspections yet.</p>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
            {donut.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top risk + recent */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4 text-amber-500" /> Assets at risk
            </h3>
            <Link href="/health" className="text-sm font-medium text-brand hover:underline">
              Insulator Health
            </Link>
          </div>
          {risk.length ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {risk.map((a) => (
                <div key={a.asset_id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.asset_name}</p>
                    <p className="truncate text-xs text-gray-400">
                      {a.trend === "worsening" && a.slope_c_per_month != null
                        ? `Rising +${a.slope_c_per_month}°C/mo`
                        : a.trend}
                      {a.months_to_critical != null && ` · ~${a.months_to_critical} mo to critical`}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{ background: RISK_COLOR[a.risk_level] }}
                  >
                    {a.risk_level}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">
              No at-risk assets. Import a grid and inspect over time to unlock forecasts.
            </p>
          )}
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent inspections</h3>
            <Link href="/inspections" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          {recent.length ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recent.map((i) => (
                <Link
                  key={i.id}
                  href={`/inspections/${i.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {i.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.thumbnail_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 dark:bg-gray-800">
                        <ThermometerSun className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{i.original_filename || "Inspection"}</p>
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" /> {formatDay(i.captured_at ?? i.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{i.measured_temp != null ? `${i.measured_temp}°C` : "—"}</span>
                    <span className={`badge ${faultBadgeClass(i.fault_level)}`}>
                      {i.analysis_status === "failed" ? "FAILED" : i.fault_level || "—"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center py-10 text-center">
              <CircleCheck className="h-9 w-9 text-gray-300" />
              <p className="mt-2 text-sm text-gray-400">No inspections yet.</p>
              <Link href="/upload" className="btn-brand mt-3">
                Upload now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendUpLegend() {
  return (
    <div className="flex gap-3 text-xs text-gray-400">
      {(["Normal", "Warning", "Critical"] as const).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: faultColor[k.toUpperCase()] }} /> {k}
        </span>
      ))}
    </div>
  );
}
