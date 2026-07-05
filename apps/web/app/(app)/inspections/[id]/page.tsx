"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { InspectionDetail } from "@/lib/types";
import { faultBadgeClass, formatDate, formatDay } from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2.5 text-sm dark:border-gray-800">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [insp, setInsp] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    api.inspections.get(id).then(setInsp).catch(() => toast.error("Not found")).finally(() => setLoading(false));
  }, [id]);

  async function generateReport() {
    setReporting(true);
    try {
      const res = await api.reports.generate(id);
      if (res.report_url) window.open(res.report_url, "_blank");
      else toast.error("Report generation failed");
      const fresh = await api.inspections.get(id);
      setInsp(fresh);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Report failed");
    } finally {
      setReporting(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this inspection?")) return;
    try {
      await api.inspections.remove(id);
      toast.success("Deleted");
      router.push("/inspections");
    } catch { toast.error("Delete failed"); }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!insp) return <div className="text-gray-500">Inspection not found.</div>;

  const failed = insp.analysis_status === "failed";

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{insp.asset_name || insp.original_filename || "Inspection"}</h1>
          <p className="text-sm text-gray-500">
            Captured {formatDay(insp.captured_at ?? insp.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge px-3 py-1.5 ${faultBadgeClass(insp.fault_level)}`}>
            {failed ? "FAILED" : insp.fault_level}
          </span>
          {!failed && (
            <button className="btn-outline" onClick={generateReport} disabled={reporting}>
              {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Report
            </button>
          )}
          <button className="btn-ghost text-red-600" onClick={remove}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {failed && (
        <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Analysis failed — no reading fabricated</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">{insp.failure_reason}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          {insp.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={insp.image_url} alt="" className="w-full object-contain" />
          ) : <div className="grid h-64 place-items-center text-gray-400">No image</div>}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-2 font-semibold">Measurements</h3>
            <Row label="Measured temperature" value={insp.measured_temp != null ? `${insp.measured_temp} °C` : "—"} />
            <Row label="Ambient" value={insp.ambient_temp != null ? `${insp.ambient_temp} °C` : "—"} />
            <Row label="Delta-T" value={insp.delta_t != null ? `${insp.delta_t} °C` : "—"} />
            <Row label="Priority" value={insp.priority || "—"} />
            <Row label="Confidence" value={insp.confidence != null ? `${Math.round(insp.confidence * 100)}%` : "—"} />
            <Row label="Location" value={insp.latitude != null ? `${insp.latitude.toFixed(5)}, ${insp.longitude?.toFixed(5)}` : "—"} />
            <Row label="Matched asset" value={insp.asset_name || "Unmatched"} />
            <Row label="Captured" value={formatDay(insp.captured_at ?? insp.created_at)} />
            <Row label="Uploaded" value={formatDate(insp.created_at)} />
          </div>

          {insp.ai_summary && (
            <div className="card p-5">
              <h3 className="mb-2 font-semibold">AI analysis</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {insp.ai_summary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
