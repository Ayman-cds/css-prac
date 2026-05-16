"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type MerchantOption = {
  id: string;
  display_name: string;
  normalized_name: string;
  times_seen: number;
};

export function MergeMerchantsButton({
  sourceId,
  sourceName,
  candidates,
}: {
  sourceId: string;
  sourceName: string;
  candidates: MerchantOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<MerchantOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    if (submitting) return;
    setOpen(false);
    setQuery("");
    setPicked(null);
    setError(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = candidates.filter((c) => c.id !== sourceId);
    if (!q) return pool.slice(0, 50);
    return pool
      .filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          c.normalized_name.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [candidates, query, sourceId]);

  async function submit() {
    if (!picked) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/merchants/${sourceId}/merge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetMerchantId: picked.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail || `HTTP ${res.status}`);
      close();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full bg-bg-elev px-2.5 py-1 text-[11px] font-medium text-ink-muted ring-1 ring-line hover:bg-bg-hover hover:text-ink"
        title="Merge into another merchant"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
          <path
            d="M8 7h8M8 17h8M12 3v18m-4-4 4-4 4 4M8 11l4-4 4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Merge
      </button>

      {mounted && open &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
              ref={dialogRef}
              className="glass-strong relative w-full max-w-md rounded-2xl p-5 shadow-card"
            >
              <header className="mb-3">
                <div className="text-[11px] uppercase tracking-[0.10em] text-ink-dim">
                  Merge merchant
                </div>
                <div className="mt-1 text-[15px] font-medium text-ink">
                  Move all transactions from
                </div>
                <div className="mt-1 truncate rounded-lg bg-bg-elev px-3 py-2 font-mono text-[12px] text-ink ring-1 ring-line">
                  {sourceName}
                </div>
                <div className="mt-2 text-[13px] text-ink-muted">into:</div>
              </header>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search merchants"
                  className="w-full rounded-xl bg-bg-elev py-2 pl-9 pr-3 text-[14px] text-ink ring-1 ring-line placeholder:text-ink-dim focus:outline-none focus:ring-accent/50"
                />
              </div>

              <ul className="mt-3 max-h-[40vh] overflow-y-auto rounded-xl ring-1 ring-line">
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-[13px] text-ink-muted">
                    No matches.
                  </li>
                ) : (
                  filtered.map((c) => {
                    const isPicked = picked?.id === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setPicked(c)}
                          className={
                            "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-bg-hover" +
                            (isPicked ? " bg-accent/15" : "")
                          }
                        >
                          <div className="min-w-0">
                            <div className="truncate text-ink">{c.display_name}</div>
                            <div className="truncate text-[11px] text-ink-dim">
                              {c.times_seen} tx · {c.normalized_name}
                            </div>
                          </div>
                          {isPicked && (
                            <span className="text-accent">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                                <path
                                  d="m5 12 5 5L20 7"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              {error && (
                <div className="mt-3 rounded-xl bg-danger/15 px-3 py-2 text-[12px] text-danger">
                  {error}
                </div>
              )}

              <footer className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={submitting}
                  className="rounded-full bg-bg-elev px-4 py-2 text-[13px] font-medium text-ink-muted ring-1 ring-line hover:bg-bg-hover hover:text-ink disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!picked || submitting}
                  className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
                >
                  {submitting ? "Merging…" : picked ? `Merge into ${picked.display_name.slice(0, 20)}` : "Pick a target"}
                </button>
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
