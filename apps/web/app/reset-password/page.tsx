"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { PasswordInput, PasswordRequirements, isPasswordValid } from "@/components/PasswordInput";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const pwValid = isPasswordValid(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pwValid) {
      toast.error("Please choose a stronger password.");
      return;
    }
    setBusy(true);
    try {
      await api.auth.reset(token, password);
      toast.success("Password updated — please sign in");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Reset failed");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="label">Reset token</label>
        <input className="input" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token from your email" />
      </div>
      <div>
        <label className="label">New password</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="At least 10 characters"
          invalid={password.length > 0 && !pwValid}
        />
        {password.length > 0 && <PasswordRequirements value={password} />}
      </div>
      <button className="btn-brand w-full" disabled={busy || !pwValid}>{busy ? "Updating…" : "Update password"}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-xl font-bold">Set a new password</h1>
          <Suspense fallback={<p className="mt-4 text-sm text-gray-500">Loading…</p>}>
            <ResetForm />
          </Suspense>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-brand hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
