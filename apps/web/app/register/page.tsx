"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: "", organization_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register(form);
      toast.success("Welcome to ThermalEye!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gray-950 px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-fg">TE</div>
          <span className="text-lg font-bold">ThermalEye</span>
        </Link>
        <div className="card p-8">
          <h1 className="text-xl font-bold">Create your workspace</h1>
          <p className="mt-1 text-sm text-gray-500">Start inspecting in minutes. You'll be the owner.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Your name</label>
              <input className="input" required value={form.full_name} onChange={set("full_name")} placeholder="Ada Lovelace" />
            </div>
            <div>
              <label className="label">Company / organization</label>
              <input className="input" required value={form.organization_name} onChange={set("organization_name")} placeholder="Acme Power" />
            </div>
            <div>
              <label className="label">Work email</label>
              <input className="input" type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required value={form.password} onChange={set("password")} placeholder="At least 10 characters" />
              <p className="mt-1 text-xs text-gray-400">Min 10 chars, with letters and numbers.</p>
            </div>
            <button className="btn-brand w-full" disabled={busy}>
              {busy ? "Creating…" : "Create workspace"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
