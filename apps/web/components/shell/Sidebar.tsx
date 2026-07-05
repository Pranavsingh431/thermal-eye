"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UploadCloud, ClipboardList, Map, Network, Settings, X, HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload & Analyze", icon: UploadCloud },
  { href: "/inspections", label: "Inspections", icon: ClipboardList },
  { href: "/health", label: "Insulator Health", icon: HeartPulse },
  { href: "/map", label: "Map", icon: Map },
  { href: "/assets", label: "Grid / Assets", icon: Network },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  open,
  onClose,
  collapsed = false,
}: {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { org } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:-translate-x-full" : "lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <BrandLogo logoUrl={org?.logo_url} className="h-8 w-8 shrink-0" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-semibold">{org?.name || "Thermal Eye"}</span>
              {org?.logo_url && (
                <span className="truncate text-[10px] uppercase tracking-wide text-gray-400">
                  Thermal Eye
                </span>
              )}
            </span>
          </div>
          <button className="lg:hidden" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                )}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4 text-xs text-gray-400 dark:border-gray-800">
          Thermal Eye · by Evizen AI · {org?.plan || "pilot"}
        </div>
      </aside>
    </>
  );
}
