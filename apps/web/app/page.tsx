import Link from "next/link";
import { Activity, BellRing, FileText, Map, ShieldCheck, Zap } from "lucide-react";

const features = [
  { icon: Zap, title: "AI temperature reading", text: "Reads the camera's thermal overlay with a vision model — accurate, and never a fabricated number." },
  { icon: BellRing, title: "Instant alerts", text: "Automatic email alerts on warning/critical hotspots, routed to the recipients each team configures." },
  { icon: Map, title: "Your grid, your map", text: "Upload your own towers, lines & substations via KML, GeoJSON or CSV. Nothing hard-wired." },
  { icon: FileText, title: "Board-ready reports", text: "Branded, AI-written inspection reports with findings, likely cause and recommended action." },
  { icon: ShieldCheck, title: "Isolated & secure", text: "Every company's data is fully separated. Argon2 auth, signed URLs, audit logs, RBAC." },
  { icon: Activity, title: "Live dashboard", text: "Fleet health at a glance — criticals, trends and per-asset history in real time." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-bold">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-fg">TE</div>
          ThermalEye
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white">Sign in</Link>
          <Link href="/register" className="btn-brand !py-2">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 text-center">
        <span className="badge bg-brand/15 text-brand-fg ring-1 ring-brand/30">
          Thermal inspection, reimagined
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Catch failures before they<span className="text-brand"> catch fire</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-400">
          A multi-tenant platform for infrastructure teams: upload thermal imagery, get AI hotspot
          analysis, automatic alerts, and professional reports — all white-labeled to your company.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-brand px-6 !py-3 text-base">Get started</Link>
          <Link href="/login" className="btn-outline border-gray-700 bg-transparent px-6 !py-3 text-base text-white hover:bg-white/5">
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <f.icon className="h-7 w-7 text-brand" />
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-gray-400">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} ThermalEye · Built for critical infrastructure teams.
      </footer>
    </div>
  );
}
