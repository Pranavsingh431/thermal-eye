"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.auth.forgot(email);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Request failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-xl font-bold">Reset password</h1>
          {sent ? (
            <p className="mt-3 text-sm text-gray-500">
              If an account exists for <b>{email}</b>, a reset link has been sent. Check your inbox.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="btn-brand w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
            </form>
          )}
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-brand hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
