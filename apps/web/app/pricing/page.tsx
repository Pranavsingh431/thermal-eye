import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Zap, Building2, Boxes, Plug } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { LandingNav, LandingFooter } from "@/components/landing/LandingChrome";

export const metadata: Metadata = {
  title: "Pricing — Thermal Eye",
  description:
    "Priced against the cost of a failure, not a camera. Pilots, annual platform subscriptions, and white-label API for inspection companies.",
};

const MAILTO = "mailto:singhpranav431@gmail.com?subject=Thermal%20Eye%20pilot%20enquiry";

const tiers = [
  {
    name: "Site",
    icon: Zap,
    price: "₹4–6L",
    period: "/ year",
    for: "Single site — a solar farm or one substation",
    features: [
      "Up to 5,000 images / year",
      "1 site dashboard",
      "AI defect detection + ΔT grading",
      "Branded PDF reports",
      "Email alerts on warning / critical",
    ],
    cta: "Start free",
    href: "/register",
    featured: false,
  },
  {
    name: "Fleet",
    icon: Boxes,
    price: "₹12–20L",
    period: "/ year",
    for: "Multi-site operators & regional utilities",
    features: [
      "Up to 25,000 images / year",
      "Unlimited sites",
      "Full historical analysis",
      "Predictive maintenance calendar",
      "Value-at-risk & ROI reporting",
      "API access",
    ],
    cta: "Book a pilot",
    href: MAILTO,
    featured: true,
  },
  {
    name: "Enterprise",
    icon: Building2,
    price: "₹25–50L",
    period: "/ year",
    for: "Large utilities, EPCs, 50+ assets",
    features: [
      "Unlimited images",
      "White-labeled reports",
      "Per-asset-type thresholds",
      "Dedicated onboarding + SLA",
      "SSO, audit & compliance",
    ],
    cta: "Talk to us",
    href: MAILTO,
    featured: false,
  },
];

const pilots = [
  { name: "Discovery pilot", scope: "Up to 500 images, single site, full report + prediction summary", price: "₹1.5–2.5L" },
  { name: "Standard pilot", scope: "Up to 2,000 images, multi-site, historical + 6-month prediction report", price: "₹3–5L" },
  { name: "Enterprise pilot", scope: "Full fleet, complete predictive report, dashboard onboarding", price: "₹6–12L" },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900 antialiased dark:bg-[#0a0a0a] dark:text-gray-100">
      <LandingNav />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="glow-orb absolute -top-24 left-1/3 -z-10 h-72 w-72 animate-pulse-glow bg-amber-500/20" />
        <div className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center lg:pt-24">
          <Reveal>
            <span className="badge gap-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              Pricing
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Priced against the cost of a <span className="thermal-text">failure</span> — not a camera.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              A single unplanned transformer failure runs ₹40–80 lakh in emergency procurement and lost
              generation. Thermal Eye gives 6–8 weeks of early warning on every asset. Our plans cost a
              fraction of one avoided failure.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5">
              <Check className="h-4 w-4 text-green-500" /> The platform Tata Power chose — over a ₹7-lakh vendor.
            </div>
          </Reveal>
        </div>
      </section>

      {/* Subscription tiers */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-7 ${
                  t.featured
                    ? "border-amber-500/50 bg-gradient-to-b from-amber-500/[0.08] to-transparent shadow-xl shadow-amber-500/10"
                    : "border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.02]"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl ${
                    t.featured ? "bg-amber-500/15 text-amber-500" : "bg-brand/10 text-brand"
                  }`}
                >
                  <t.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-bold">{t.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{t.for}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{t.price}</span>
                  <span className="text-sm text-gray-400">{t.period}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-gray-600 dark:text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.href}
                  className={`mt-7 ${t.featured ? "btn-brand" : "btn-outline dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"} w-full justify-center`}
                >
                  {t.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-gray-400">
          Billed annually. Prices scale with fleet size — the ranges above are typical engagements.
        </p>
      </section>

      {/* Pilots */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Not ready for annual? Start with a paid pilot.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600 dark:text-gray-400">
            Send us 1–3 months of your own thermal data. We run Thermal Eye on it and deliver a full
            analysis + prediction report. No procurement marathon — a department PO, results on your real assets.
          </p>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {pilots.map((p, i) => (
            <Reveal key={p.name} delay={i * 70}>
              <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.02]">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-1.5 flex-1 text-sm text-gray-500">{p.scope}</p>
                <p className="mt-4 text-2xl font-bold">{p.price}</p>
                <p className="text-xs text-gray-400">one-time</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href={MAILTO} className="btn-brand px-6 !py-3">
            Book a pilot <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* White-label API */}
      <section className="border-y border-gray-200/70 bg-gray-50/50 py-16 dark:border-white/10 dark:bg-white/[0.015]">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-2xl border border-gray-200 bg-white p-8 dark:border-white/10 dark:bg-[#141414] md:flex-row md:items-center">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Plug className="h-7 w-7" />
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-bold">White-label API — for drone & inspection companies</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  You collect the footage; Thermal Eye turns it into AI defect reports under your brand.
                  Platform fee from <span className="font-semibold text-gray-900 dark:text-white">₹3–6L/year</span> plus
                  <span className="font-semibold text-gray-900 dark:text-white"> ₹500–1,500 per report</span> (volume tiers available).
                </p>
              </div>
              <Link href={MAILTO} className="btn-outline shrink-0 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10">
                Partner with us
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Reframe / CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            What does an unplanned failure cost <span className="thermal-text">your</span> operations?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-600 dark:text-gray-400">
            That number is your anchor. A Fleet plan is 15–20% of a single avoided failure — and it works
            across every asset, continuously.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={MAILTO} className="btn-brand px-7 !py-3.5 text-base">
              Book a pilot <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/register" className="btn-outline px-7 !py-3.5 text-base dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10">
              Start free
            </Link>
          </div>
        </Reveal>
      </section>

      <LandingFooter />
    </div>
  );
}
