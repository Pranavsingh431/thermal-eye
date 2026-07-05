"use client";

import { useState } from "react";
import { Menu, ChevronDown, LogOut, Check, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export function TopBar({
  onMenu,
  onToggleSidebar,
  collapsed = false,
}: {
  onMenu: () => void;
  onToggleSidebar?: () => void;
  collapsed?: boolean;
}) {
  const { me, org, logout, switchOrg } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 lg:px-6">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
        <button
          className="hidden h-9 w-9 place-items-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800 lg:grid"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
          title={collapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
        <div className="hidden text-sm text-gray-500 lg:block">
          {org ? `${org.name} · ${me?.active_role}` : ""}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      <div className="relative">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold text-brand-fg">
            {(me?.user.full_name || me?.user.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <span className="hidden sm:block max-w-[160px] truncate">{me?.user.email}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900">
              {me && me.organizations.length > 1 && (
                <div className="mb-2 border-b border-gray-100 pb-2 dark:border-gray-800">
                  <p className="px-2 py-1 text-xs font-medium text-gray-400">Organizations</p>
                  {me.organizations.map((o) => (
                    <button key={o.id} onClick={() => { setOpen(false); switchOrg(o.id); }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                      <span className="truncate">{o.name}</span>
                      {o.id === me.active_org_id && <Check className="h-4 w-4 text-brand" />}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => { setOpen(false); logout(); }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </header>
  );
}
