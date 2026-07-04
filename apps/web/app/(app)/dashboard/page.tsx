"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Flame, ThermometerSun, CircleCheck, Network, Clock } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/lib/api";
import type { DashboardStats, Inspection } from "@/lib/types";
import { faultBadgeClass, faultColor, formatDate } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, tone }: {
  icon: React.ElementType; label: string; value: string | number; tone?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon className={`h-5 w-5 ${tone || "text-gray-400"}`} />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.inspections.stats(), api.inspections.list({ limit: "8" })])
      .then(([s, r]) => { setStats(s); setRecent(r); })
      .finally(() => setLoading(false));
  }, []);

  const donut = stats ? [
    { name: "Critical", value: stats.critical_count, color: faultColor.CRITICAL },
    { name: "Warning", value: stats.warning_count, color: faultColor.WARNING },
    { name: "Normal", value: stats.normal_count, color: faultColor.NORMAL },
    { name: "Failed", value: stats.failed_count, color: "#9ca3af" },
  ].filter((d) => d.value > 0) : [];

  if (loading) return <div className="text-gray-500">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Fleet thermal health at a glance.</p>
        </div>
        <Link href="/upload" className="btn-brand">Upload images</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ThermometerSun} label="Total inspections" value={stats?.total_inspections ?? 0} />
        <StatCard icon={Flame} label="Critical" value={stats?.critical_count ?? 0} tone="text-critical" />
        <StatCard icon={AlertTriangle} label="Warnings" value={stats?.warning_count ?? 0} tone="text-warning" />
        <StatCard icon={Network} label="Assets tracked" value={stats?.total_assets ?? 0} tone="text-brand" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h3 className="font-semibold">Fault distribution</h3>
          {donut.length ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
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

        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent inspections</h3>
            <Link href="/inspections" className="text-sm font-medium text-brand hover:underline">View all</Link>
          </div>
          {recent.length ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recent.map((i) => (
                <Link key={i.id} href={`/inspections/${i.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                  <div className="flex min-w-0 items-center gap-3">
                    {i.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.thumbnail_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-gray-100 dark:bg-gray-800">
                        <ThermometerSun className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{i.original_filename || "Inspection"}</p>
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" /> {formatDate(i.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {i.measured_temp != null ? `${i.measured_temp}°C` : "—"}
                    </span>
                    <span className={`badge ${faultBadgeClass(i.fault_level)}`}>
                      {i.analysis_status === "failed" ? "FAILED" : i.fault_level || "—"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center py-12 text-center">
              <CircleCheck className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">No inspections yet. Upload thermal images to get started.</p>
              <Link href="/upload" className="btn-brand mt-4">Upload now</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
