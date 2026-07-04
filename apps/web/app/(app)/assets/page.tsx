"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { Asset } from "@/lib/types";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [replace, setReplace] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => api.assets.list().then(setAssets).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function onFile(file: File) {
    setImporting(true);
    try {
      const res = await api.assets.import(file, replace);
      toast.success(`Imported ${res.imported} asset(s)${res.skipped ? `, ${res.skipped} skipped` : ""}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grid / Assets</h1>
        <p className="text-sm text-gray-500">
          Upload your own infrastructure — towers, lines, substations — as KML, GeoJSON, or CSV.
          Inspections are auto-matched to the nearest asset by GPS.
        </p>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <UploadCloud className="h-8 w-8 text-brand" />
          <div>
            <p className="font-medium">Import grid file</p>
            <p className="text-sm text-gray-400">Accepted: .kml · .geojson · .csv (name, latitude, longitude, voltage_kv…)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace existing
          </label>
          <button className="btn-brand" onClick={() => inputRef.current?.click()} disabled={importing}>
            {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : "Choose file"}
          </button>
          <input ref={inputRef} type="file" accept=".kml,.geojson,.json,.csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h3 className="font-semibold">Assets</h3>
          <span className="text-sm text-gray-400">{assets.length} total</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Voltage</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Region</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : assets.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No assets yet — import a file above.</td></tr>
            ) : assets.slice(0, 500).map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-2.5 font-medium">{a.name}</td>
                <td className="px-4 py-2.5"><span className="badge bg-gray-100 text-gray-600 dark:bg-gray-800">{a.asset_type}</span></td>
                <td className="px-4 py-2.5">{a.voltage_kv ? `${a.voltage_kv} kV` : "—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{a.latitude != null ? `${a.latitude.toFixed(4)}, ${a.longitude?.toFixed(4)}` : "—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{a.region || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
