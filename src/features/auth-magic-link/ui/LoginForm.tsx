"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/shared/api/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrMsg("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setErrMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-[15px] font-medium text-ink">Check your email</div>
        <div className="mt-1 text-[13px] text-ink-muted">
          We sent a sign-in link to <b className="text-ink">{email}</b>.
        </div>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-[12px] font-medium text-accent hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="block text-[11px] uppercase tracking-[0.10em] text-ink-dim">
          Email
        </span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 block w-full rounded-xl bg-bg-elev px-3 py-2.5 text-[15px] text-ink ring-1 ring-line placeholder:text-ink-dim focus:outline-none focus:ring-accent/50"
        />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-accent py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Continue with email"}
      </button>
      {status === "error" && (
        <div className="rounded-xl bg-danger/15 px-3 py-2 text-[13px] text-danger">
          {errMsg}
        </div>
      )}
      <p className="pt-2 text-center text-[11px] text-ink-dim">
        We&apos;ll email you a one-time link. No passwords.
      </p>
    </form>
  );
}
