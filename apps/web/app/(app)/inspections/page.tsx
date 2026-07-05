"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Inspection } from "@/lib/types";
import { faultBadgeClass, formatDay } from "@/lib/utils";

const FILTERS = ["", "CRITICAL", "WARNING", "NORMAL"];

export default function InspectionsPage() {
  const [items, setItems] = useState<Inspection[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { limit: "200" };
    if (filter) params.fault_level = filter;
    api.inspections.list(params).then(setItems).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inspections</h1>
          <p className="text-sm text-gray-500">{items.length} record(s)</p>
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`badge px-3 py-1.5 ${filter === f ? "bg-brand text-brand-fg" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
              {f || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Temp</th>
              <th className="px-4 py-3">ΔT</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No inspections found.</td></tr>
            ) : items.map((i) => (
              <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-2.5">
                  {i.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.thumbnail_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800" />}
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/inspections/${i.id}`} className="font-medium text-brand hover:underline">
                    {i.original_filename || "Inspection"}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-semibold">{i.measured_temp != null ? `${i.measured_temp}°C` : "—"}</td>
                <td className="px-4 py-2.5">{i.delta_t != null ? `${i.delta_t}°C` : "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${faultBadgeClass(i.fault_level)}`}>
                    {i.analysis_status === "failed" ? "FAILED" : i.fault_level || "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{formatDay(i.captured_at ?? i.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
