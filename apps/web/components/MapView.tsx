"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import type { Asset, Inspection } from "@/lib/types";
import { faultColor } from "@/lib/utils";

interface Props {
  center: [number, number];
  zoom: number;
  assets: Asset[];
  inspections: Inspection[];
}

export default function MapView({ center, zoom, assets, inspections }: Props) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {assets.map((a) => {
        if (a.geometry && a.geometry.type === "LineString") {
          const coords = (a.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
          return <Polyline key={a.id} positions={coords} pathOptions={{ color: "#2563eb", weight: 2, opacity: 0.6 }} />;
        }
        if (a.latitude == null || a.longitude == null) return null;
        return (
          <CircleMarker key={a.id} center={[a.latitude, a.longitude]} radius={4}
            pathOptions={{ color: "#64748b", fillColor: "#94a3b8", fillOpacity: 0.7 }}>
            <Popup><b>{a.name}</b><br />{a.asset_type}{a.voltage_kv ? ` · ${a.voltage_kv} kV` : ""}</Popup>
          </CircleMarker>
        );
      })}

      {inspections.filter((i) => i.latitude != null && i.longitude != null).map((i) => (
        <CircleMarker key={i.id} center={[i.latitude!, i.longitude!]} radius={8}
          pathOptions={{
            color: "#fff", weight: 2,
            fillColor: faultColor[i.fault_level || ""] || "#9ca3af", fillOpacity: 0.95,
          }}>
          <Popup>
            <b>{i.measured_temp != null ? `${i.measured_temp} °C` : "No reading"}</b><br />
            {i.fault_level || i.analysis_status}<br />
            {i.original_filename}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
