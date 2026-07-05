import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Canonical fault colors, shared by charts, map markers and legends. */
export const faultColor: Record<string, string> = {
  CRITICAL: "#dc2626",
  WARNING: "#d97706",
  NORMAL: "#16a34a",
  "": "#9ca3af",
};

/** Badge classes for a fault level (works in light + dark). */
export function faultBadgeClass(level?: string | null): string {
  switch ((level || "").toUpperCase()) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "WARNING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "NORMAL":
      return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }
}

/** Human-friendly local date/time; safe on null. */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short date only (no time). */
export function formatDay(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Convert a #rrggbb / #rgb hex to the "H S% L%" triplet used by our CSS vars. */
function hexToHslTriplet(hex: string): string | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Apply an org's brand colors at runtime by overriding the CSS custom properties
 * consumed by Tailwind (`--brand`, `--accent`). Pass null to leave one untouched.
 */
export function applyBrand(primary?: string | null, accent?: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (primary) {
    const t = hexToHslTriplet(primary);
    if (t) root.style.setProperty("--brand", t);
  }
  if (accent) {
    const t = hexToHslTriplet(accent);
    if (t) root.style.setProperty("--accent", t);
  }
}
