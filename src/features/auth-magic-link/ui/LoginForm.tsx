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

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-semibold tracking-display text-ink">
          Sign in
        </h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          You&apos;ll get a magic link by email.
        </p>
      </div>

      {status === "sent" ? (
        <div className="glass rounded-2xl p-4 text-[13px] text-ink">
          Check <b>{email}</b> for a sign-in link.
        </div>
      ) : (
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
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {status === "error" && <div className="text-[13px] text-danger">{errMsg}</div>}
        </form>
      )}
    </div>
  );
}
