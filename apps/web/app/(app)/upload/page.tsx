"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { Inspection } from "@/lib/types";
import { faultBadgeClass } from "@/lib/utils";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Inspection[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [capturedDate, setCapturedDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs].slice(0, 50));
  }

  async function onUpload() {
    if (!files.length) return;
    setBusy(true);
    setResults(null);
    try {
      const res = await api.inspections.upload(files, capturedDate || undefined);
      setResults(res.inspections);
      const crit = res.inspections.filter((i) => i.fault_level === "CRITICAL").length;
      toast.success(`Analyzed ${res.inspections.length} image(s)${crit ? ` · ${crit} critical` : ""}`);
      setFiles([]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload &amp; Analyze</h1>
        <p className="text-sm text-gray-500">
          Drop thermal images with a visible temperature overlay. We read the reading with a vision
          model — GPS is matched to your grid automatically.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`card cursor-pointer border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-brand bg-brand/5" : "border-gray-300 dark:border-gray-700"
        }`}
      >
        <UploadCloud className="mx-auto h-12 w-12 text-brand" />
        <p className="mt-3 font-medium">Drag &amp; drop images, or click to browse</p>
        <p className="text-sm text-gray-400">JPEG / PNG / WebP · up to 50 at once</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{files.length} image(s) ready</h3>
            <div className="flex items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Inspection date</label>
                <input
                  type="date"
                  className="input !py-2 !w-auto"
                  max={today}
                  value={capturedDate}
                  onChange={(e) => setCapturedDate(e.target.value)}
                  title="Set the date these images were captured (defaults to each image's EXIF date, else today)."
                />
              </div>
              <button className="btn-ghost" onClick={() => setFiles([])} disabled={busy}>Clear</button>
              <button className="btn-brand" onClick={onUpload} disabled={busy}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : "Analyze"}
              </button>
            </div>
          </div>
          <p className="mb-3 -mt-1 text-xs text-gray-400">
            Uploading yesterday&apos;s images? Set the inspection date so trends and history are dated correctly.
            Leave blank to use each photo&apos;s EXIF capture date (or today).
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-8">
            {files.map((f, idx) => (
              <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, i) => i !== idx)); }}
                  className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">Results</h3>
          <div className="space-y-2">
            {results.map((i) => (
              <Link key={i.id} href={`/inspections/${i.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                <div className="flex min-w-0 items-center gap-3">
                  {i.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.thumbnail_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  )}
                  <span className="truncate text-sm font-medium">{i.original_filename}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{i.measured_temp != null ? `${i.measured_temp}°C` : "—"}</span>
                  <span className={`badge ${faultBadgeClass(i.fault_level)}`}>
                    {i.analysis_status === "failed" ? "COULD NOT READ" : i.fault_level}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {results.some((i) => i.analysis_status === "failed") && (
            <p className="mt-3 text-xs text-gray-400">
              &ldquo;Could not read&rdquo; means no legible temperature overlay was detected — we never guess a value.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
