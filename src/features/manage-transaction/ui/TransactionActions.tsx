"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TransactionActions({
  transactionId,
  hidden,
}: {
  transactionId: string;
  hidden: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggleHidden() {
    setBusy("toggle");
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hidden: !hidden }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (
      !confirm(
        "Delete this transaction permanently? This can't be undone. If you only want to keep it out of totals, use Hide instead.",
      )
    ) {
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {hidden && (
        <div className="rounded-xl bg-warn/10 px-3 py-2 text-[12px] text-warn ring-1 ring-warn/30">
          This transaction is hidden — excluded from all totals, charts, and
          search results.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleHidden}
          disabled={busy != null}
          className="inline-flex items-center gap-1.5 rounded-full bg-bg-elev px-3 py-1.5 text-[12px] font-medium text-ink ring-1 ring-line hover:bg-bg-hover disabled:opacity-40"
        >
          {hidden ? (
            <>
              <EyeIcon />
              {busy === "toggle" ? "Unhiding…" : "Unhide"}
            </>
          ) : (
            <>
              <EyeOffIcon />
              {busy === "toggle" ? "Hiding…" : "Hide from totals"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy != null}
          className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 px-3 py-1.5 text-[12px] font-medium text-danger ring-1 ring-danger/30 hover:bg-danger/25 disabled:opacity-40"
        >
          <TrashIcon />
          {busy === "delete" ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
      {error && (
        <div className="rounded-xl bg-danger/15 px-3 py-2 text-[12px] text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
      <path
        d="m3 3 18 18M10.6 5.1A10.5 10.5 0 0 1 12 5c5 0 9.27 3.11 11 7-1 2.24-2.74 4.08-4.9 5.3M6.7 6.6A11.4 11.4 0 0 0 1 12c1.73 3.89 6 7 11 7 1.93 0 3.74-.46 5.3-1.27M9.88 9.88a3 3 0 1 0 4.24 4.24"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
      <path
        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m1 0v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7h8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
