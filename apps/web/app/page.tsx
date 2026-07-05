import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BellRing,
  FileText,
  Gauge,
  LineChart,
  Lock,
  MapPin,
  ScanEye,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { ThermalEyeMark } from "@/components/landing/ThermalEyeMark";
import { LandingNav, LandingFooter } from "@/components/landing/LandingChrome";

const features = [
  {
    icon: ScanEye,
    title: "Reads the reading — never guesses",
    text: "A vision model lifts the actual temperature off the camera's overlay. If a value isn't legible it says so. It never invents a number to look confident.",
  },
  {
    icon: TrendingUp,
    title: "Predicts the next failure",
    text: "Every asset gets a ΔT trend line. Thermal Eye projects when a tower crosses critical — weeks before it does — and ranks your fleet by risk.",
    highlight: true,
  },
  {
    icon: BellRing,
    title: "Alerts the right people",
    text: "Warning and critical hotspots trigger email alerts routed to the recipients each team configures. No dashboard-watching required.",
  },
  {
    icon: MapPin,
    title: "Your grid, on your map",
    text: "Upload your own towers, lines and substations as KML, GeoJSON or CSV. Inspections auto-match to the nearest asset by GPS.",
  },
  {
    icon: FileText,
    title: "Board-ready reports",
    text: "Branded, AI-written inspection reports — findings, likely cause, recommended action — generated in one click.",
  },
  {
    icon: ShieldCheck,
    title: "Isolated & secure",
    text: "Every company's data is fully separated. Argon2 auth, signed URLs, Postgres RLS, rate limiting and audit logs by default.",
  },
];

const steps = [
  {
    n: "01",
    icon: Zap,
    title: "Upload thermal imagery",
    text: "Drop in FLIR-style images — single or in bulk. GPS is matched to your grid automatically.",
  },
  {
    n: "02",
    icon: ScanEye,
    title: "AI reads & grades every hotspot",
    text: "Temperatures are extracted from the overlay, compared to your thresholds, and classified — normal, warning, critical.",
  },
  {
    n: "03",
    icon: LineChart,
    title: "Predict, alert & prevent",
    text: "Per-asset trends forecast the next failure. Alerts fire, reports write themselves, crews fix the fault before the outage.",
  },
];

const credentials = [
  "Deployed with Tata Power",
  "Built by IIT Ropar engineers",
  "Incubated at TBIF · IIT Ropar",
  "Proven on live transmission infrastructure",
  "No fabricated readings — ever",
  "Multi-tenant & white-labeled",
];

const security = [
  { icon: ShieldCheck, title: "True multi-tenancy", text: "Every row scoped by org, with Postgres RLS underneath." },
  { icon: Lock, title: "Hardened auth", text: "Argon2 hashing, rotating JWT refresh, RBAC roles." },
  { icon: FileText, title: "Signed URLs & audit logs", text: "Private storage, time-boxed links, full audit trail." },
  { icon: Activity, title: "White-labeled", text: "Your logo, colors, thresholds and alert routing." },
];

function PredictionMock() {
  return (
    <div className="relative w-full max-w-md">
      <div className="animate-float rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-2xl shadow-black/10 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/15 text-red-500">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">TWR-110-085</p>
              <p className="text-xs text-gray-400">400 kV · Bhira–Khopoli L2</p>
            </div>
          </div>
          <span className="badge bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">AT RISK</span>
        </div>

        {/* Forecast sparkline: measured trend + dashed projection crossing the critical line */}
        <svg viewBox="0 0 320 120" className="mt-4 w-full">
          <line x1="0" y1="34" x2="320" y2="34" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
          <text x="4" y="28" className="fill-red-500" fontSize="9" fontWeight="600">critical ΔT</text>
          <polyline
            points="6,104 60,96 114,86 168,74 208,64"
            fill="none"
            stroke="url(#spark)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <polyline
            points="208,64 250,52 292,38 314,30"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx="208" cy="64" r="3.5" fill="#f59e0b" />
          <circle cx="300" cy="35" r="4" fill="#ef4444">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
            <p className="text-lg font-bold">+2.1°</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">ΔT / month</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
            <p className="text-lg font-bold text-red-500">~6 wks</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">to critical</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-white/5">
            <p className="text-lg font-bold">92%</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">confidence</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Inspect clamp before the monsoon load peak. Trend accelerating since Apr.
        </div>
      </div>

      {/* floating hotspot chip */}
      <div className="absolute -left-6 -top-5 hidden animate-float rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-xl dark:border-white/10 dark:bg-[#0e1017] sm:block" style={{ animationDelay: "1.2s" }}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium">1,204 assets healthy</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900 antialiased dark:bg-[#0a0a0a] dark:text-gray-100">
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 hero-grid" />
        <div className="glow-orb absolute -top-24 left-1/4 -z-10 h-72 w-72 animate-pulse-glow bg-amber-500/25 dark:bg-amber-500/20" />
        <div className="glow-orb absolute -top-10 right-1/4 -z-10 h-72 w-72 animate-pulse-glow bg-brand/25" style={{ animationDelay: "2s" }} />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
          <div>
            <Reveal>
              <span className="badge gap-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> Predictive thermal intelligence for the grid
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                See the failure
                <br />
                <span className="thermal-text thermal-text-animated">before it happens.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                Thermal Eye reads your thermal imagery, grades every hotspot, and forecasts which
                tower crosses critical <span className="font-semibold text-gray-900 dark:text-white">next</span> — so
                crews fix the fault while it's still cheap, not after the outage.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
                <BadgeCheck className="h-5 w-5 shrink-0 text-green-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  The predictive inspection platform{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">Tata Power</span> chose — over a
                  ₹7-lakh vendor.
                </span>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register" className="btn-brand px-6 !py-3 text-base">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#how" className="btn-outline px-6 !py-3 text-base dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10">
                  See how it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-green-500" /> Never fabricates a reading</span>
                <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-brand" /> Live-infrastructure proven</span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="flex justify-center lg:justify-end">
            <PredictionMock />
          </Reveal>
        </div>

        {/* Credentials marquee */}
        <div className="border-y border-gray-200/70 bg-gray-50/60 py-4 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="marquee-track animate-marquee gap-10 pr-10">
              {[...credentials, ...credentials].map((c, i) => (
                <span key={i} className="flex shrink-0 items-center gap-2.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Reframe: reactive → predictive ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Stop inspecting. Start predicting.</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Finding a hotspot after it's grown is a chore. Knowing which asset fails next is an
            advantage. Thermal Eye turns a pile of images into foresight.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-gray-200 bg-gray-50/50 p-7 dark:border-white/10 dark:bg-white/[0.02]">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">The old way</p>
              <ul className="mt-5 space-y-3.5 text-sm text-gray-600 dark:text-gray-400">
                {[
                  "Thousands of images reviewed by eye, on a deadline",
                  "Faults caught only once they're already severe",
                  "Numbers sometimes filled in to complete the sheet",
                  "Failures still arrive as surprises — and outages",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative h-full overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.07] to-brand/[0.06] p-7">
              <p className="text-sm font-semibold uppercase tracking-wide thermal-text">With Thermal Eye</p>
              <ul className="mt-5 space-y-3.5 text-sm text-gray-700 dark:text-gray-200">
                {[
                  "Every image read and graded automatically in minutes",
                  "Per-asset ΔT trends surface problems weeks earlier",
                  "Honest by design — an illegible frame is flagged, not faked",
                  "A ranked list of which towers to fix, and when",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-amber-500">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything a reliability team needs</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            One platform, from raw thermal frame to a decision your board will sign off on.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div
                className={`group h-full rounded-2xl border p-6 transition-all hover:-translate-y-1 ${
                  f.highlight
                    ? "border-amber-500/40 bg-gradient-to-br from-amber-500/[0.08] to-transparent shadow-lg shadow-amber-500/5"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
                }`}
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
                    f.highlight ? "bg-amber-500/15 text-amber-500" : "bg-brand/10 text-brand"
                  }`}
                >
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="border-y border-gray-200/70 bg-gray-50/50 py-24 dark:border-white/10 dark:bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="badge bg-brand/10 text-brand">How it works</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">From image to foresight in three steps</h2>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="relative h-full rounded-2xl border border-gray-200 bg-white p-7 dark:border-white/10 dark:bg-[#141414]">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="text-4xl font-black text-gray-100 dark:text-white/10">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Predictive spotlight ─────────────────────────────────────────── */}
      <section id="predict" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="badge gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <TrendingUp className="h-3.5 w-3.5" /> Insulator Health · Predictive Maintenance
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              It remembers every inspection — and tells you what's coming.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              Thermal Eye keeps the full thermal history of every asset. It fits a trend to each
              tower's temperature rise, then projects the date it will cross your critical
              threshold — ranking the whole fleet so maintenance goes where it matters first.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                ["Per-asset ΔT trend", "Least-squares fit over the asset's real inspection history."],
                ["Time-to-critical forecast", "A projected date each tower crosses your threshold."],
                ["Fleet risk ranking", "Sort thousands of assets by who fails first."],
              ].map(([h, t]) => (
                <li key={h} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <span className="font-semibold">{h}.</span>{" "}
                    <span className="text-gray-600 dark:text-gray-400">{t}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-brand mt-8 px-6 !py-3">
              Try it on your fleet <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <Reveal delay={140} className="flex justify-center">
            <PredictionMock />
          </Reveal>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <section id="security" className="border-y border-gray-200/70 bg-gray-50/50 py-24 dark:border-white/10 dark:bg-white/[0.015]">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="badge gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400">
              <Lock className="h-3.5 w-3.5" /> Enterprise-grade by default
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Built for critical infrastructure</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              A utility's data never touches another tenant's. Isolation is enforced in the app and
              again in the database.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {security.map((s, i) => (
              <Reveal key={s.title} delay={i * 70}>
                <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#141414]">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Institutional credibility ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-brand/[0.06] via-transparent to-amber-500/[0.06] p-8 dark:border-white/10 sm:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Engineered at IIT Ropar. Incubated at TBIF. Proven in the field.
              </h2>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Thermal Eye is the flagship product of <span className="font-semibold text-gray-900 dark:text-white">Evizen AI</span> —
                a deep-tech startup founded by IIT Ropar engineers and incubated at TBIF, IIT Ropar.
                We built it against the reality of a live power grid, not a lab demo. That discipline
                is why it refuses to fabricate a single reading.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                {["Evizen AI", "IIT Ropar", "TBIF Incubated", "Live-grid tested"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="w-full rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200/60">
                {/* Evizen AI logo (black-on-white) — presented on a white chip for brand safety */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/evizen-ai-horizontal.jpg" alt="Evizen AI" className="mx-auto h-12 w-auto object-contain" />
              </div>
              <p className="text-center text-xs text-gray-400">The team behind Thermal Eye</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden px-6 py-24">
        <div className="glow-orb absolute left-1/2 top-1/2 -z-10 h-80 w-[36rem] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow bg-amber-500/15" />
        <Reveal className="mx-auto max-w-2xl text-center">
          <ThermalEyeMark animated className="mx-auto h-14 w-14 text-gray-900 dark:text-white" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Find the failure while it's still cheap.
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Spin up a white-labeled workspace, upload your grid, and see your first forecast today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-brand px-7 !py-3.5 text-base">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-outline px-7 !py-3.5 text-base dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10">
              Sign in
            </Link>
          </div>
        </Reveal>
      </section>

      <LandingFooter />
    </div>
  );
}
