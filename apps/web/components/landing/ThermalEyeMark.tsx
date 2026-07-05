import { cn } from "@/lib/utils";

/**
 * Inline, resolution-independent Thermal Eye mark: an eye lens with a thermal
 * "hotspot" pupil. The lens uses currentColor; the hotspot uses a thermal
 * gradient. `animated` adds a slow scan sweep + pulsing hotspot.
 */
export function ThermalEyeMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  const id = animated ? "te-anim" : "te-static";
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9", className)} role="img" aria-label="Thermal Eye">
      <defs>
        <radialGradient id={`${id}-hot`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </radialGradient>
        <linearGradient id={`${id}-scan`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-lens`}>
          <path d="M4 24 Q24 5 44 24 Q24 43 4 24 Z" />
        </clipPath>
      </defs>

      {/* Eye lens outline */}
      <path
        d="M4 24 Q24 5 44 24 Q24 43 4 24 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* Scan sweep, clipped to the lens */}
      {animated && (
        <g clipPath={`url(#${id}-lens)`}>
          <rect x="-14" y="4" width="14" height="40" fill={`url(#${id}-scan)`}>
            <animate attributeName="x" from="-14" to="48" dur="2.8s" repeatCount="indefinite" />
          </rect>
        </g>
      )}

      {/* Iris ring */}
      <circle cx="24" cy="24" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />

      {/* Thermal hotspot pupil */}
      <circle cx="24" cy="24" r="5.4" fill={`url(#${id}-hot)`}>
        {animated && (
          <animate attributeName="r" values="5;6.2;5" dur="2.4s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  );
}
