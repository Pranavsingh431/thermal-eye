"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { ThermalEyeMark } from "@/components/landing/ThermalEyeMark";
import { PasswordInput } from "@/components/PasswordInput";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gray-950 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 text-white">
          <ThermalEyeMark className="h-9 w-9 text-white" />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold">Thermal Eye</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">by Evizen AI</span>
          </span>
        </Link>
        <div className="card p-8">
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your inspection dashboard.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button className="btn-brand w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <Link href="/forgot-password" className="text-gray-500 hover:text-brand">Forgot password?</Link>
            <Link href="/register" className="font-medium text-brand hover:underline">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
