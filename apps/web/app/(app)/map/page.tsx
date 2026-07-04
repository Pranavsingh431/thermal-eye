"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Asset, Inspection } from "@/lib/types";
import { faultColor } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-gray-400">Loading map…</div>,
});

export default function MapPage() {
  const { org } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    api.assets.list().then(setAssets).catch(() => {});
    api.inspections.list({ limit: "300" }).then(setInspections).catch(() => {});
  }, []);

  const center = useMemo<[number, number]>(
    () => (org?.settings.map?.center as [number, number]) || [20.5937, 78.9629],
    [org]
  );
  const zoom = org?.settings.map?.zoom || 5;

  const legend = [["Critical", "CRITICAL"], ["Warning", "WARNING"], ["Normal", "NORMAL"]] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Map</h1>
          <p className="text-sm text-gray-500">{assets.length} assets · {inspections.length} inspections</p>
        </div>
        <div className="flex gap-3 text-xs">
          {legend.map(([label, key]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: faultColor[key] }} /> {label}
            </span>
          ))}
        </div>
      </div>
      <div className="card h-[70vh] overflow-hidden">
        <MapView center={center} zoom={zoom} assets={assets} inspections={inspections} />
      </div>
    </div>
  );
}
