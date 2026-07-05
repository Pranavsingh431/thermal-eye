import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThermalEyeMark } from "@/components/landing/ThermalEyeMark";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0a0a]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <ThermalEyeMark className="h-9 w-9 text-gray-900 dark:text-white" />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight">Thermal Eye</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">by Evizen AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300 md:flex">
          <a href="/#how" className="transition-colors hover:text-gray-900 dark:hover:text-white">How it works</a>
          <a href="/#predict" className="transition-colors hover:text-gray-900 dark:hover:text-white">Prediction</a>
          <Link href="/pricing" className="transition-colors hover:text-gray-900 dark:hover:text-white">Pricing</Link>
          <a href="/#security" className="transition-colors hover:text-gray-900 dark:hover:text-white">Security</a>
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link href="/register" className="btn-brand !py-2">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-gray-200/70 py-10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <ThermalEyeMark className="h-7 w-7 text-gray-900 dark:text-white" />
          <span className="text-sm">
            <span className="font-semibold">Thermal Eye</span>
            <span className="text-gray-400"> · by Evizen AI</span>
          </span>
        </div>
        <div className="flex items-center gap-5 text-sm text-gray-400">
          <Link href="/pricing" className="hover:text-gray-600 dark:hover:text-gray-200">Pricing</Link>
          <Link href="/login" className="hover:text-gray-600 dark:hover:text-gray-200">Sign in</Link>
          <span>© {new Date().getFullYear()} Evizen AI</span>
        </div>
      </div>
    </footer>
  );
}
