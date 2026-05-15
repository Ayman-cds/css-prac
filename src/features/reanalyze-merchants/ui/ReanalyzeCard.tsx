"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Scope = "low-confidence" | "all-except-corrected" | "everything";

type Progress = {
  done: number;
  total: number;
  merchant: string;
  newCategory: string | null;
  changed: boolean;
};

type DoneSummary = {
  merchantsProcessed: number;
  transactionsUpdated: number;
  changedCategory: number;
  hasMore: boolean;
  nextOffset: number;
};

const SCOPE_LABEL: Record<Scope, string> = {
  "low-confidence": "Low-confidence merchants",
  "all-except-corrected": "All except your manual corrections",
  everything: "Everything (including corrections)",
};

const SCOPE_HINT: Record<Scope, string> = {
  "low-confidence": "Merchants categorized with confidence below 0.8 or fallback.",
  "all-except-corrected": "Re-runs Claude on every merchant — keeps your manual fixes.",
  everything: "Wipes manual corrections. Only useful for a fresh classification.",
};

export function ReanalyzeCard() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("low-confidence");
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<Progress | null>(null);
  const [totals, setTotals] = useState({ processed: 0, txUpdated: 0, changed: 0 });
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runChunk(offset: number, prev: typeof totals): Promise<{ next: number | null; totals: typeof totals }> {
    const res = await fetch("/api/reanalyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope, offset, chunk: 20 }),
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let acc = { ...prev };
    let next: number | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      // SSE frames separated by \n\n
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
        const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!eventLine || !dataLine) continue;
        const eventName = eventLine.slice(7);
        const payload = JSON.parse(dataLine.slice(6));
        if (eventName === "progress") {
          setCurrent(payload as Progress);
          acc = {
            processed: acc.processed + 1,
            txUpdated: acc.txUpdated, // updated at done event with cumulative
            changed: acc.changed + (payload.changed ? 1 : 0),
          };
        } else if (eventName === "done") {
          const d = payload as DoneSummary;
          acc = {
            processed: acc.processed, // already incremented per progress event
            txUpdated: acc.txUpdated + d.transactionsUpdated,
            changed: acc.changed,
          };
          next = d.hasMore ? d.nextOffset : null;
        } else if (eventName === "error") {
          throw new Error((payload as { message?: string }).message ?? "stream error");
        }
      }
    }
    return { next, totals: acc };
  }

  async function run() {
    setRunning(true);
    setFinished(false);
    setError(null);
    setCurrent(null);
    let offset = 0;
    let acc = { processed: 0, txUpdated: 0, changed: 0 };
    try {
      while (true) {
        const { next, totals: nextTotals } = await runChunk(offset, acc);
        acc = nextTotals;
        setTotals(acc);
        if (next == null) break;
        offset = next;
      }
      setFinished(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  const pct = current && current.total > 0 ? Math.round((current.done / current.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.10em] text-ink-dim">Scope</span>
            <select
              value={scope}
              disabled={running}
              onChange={(e) => setScope(e.target.value as Scope)}
              className="mt-1 block w-full rounded-xl bg-bg-elev px-3 py-2 text-[14px] text-ink ring-1 ring-line disabled:opacity-40"
            >
              {(Object.keys(SCOPE_LABEL) as Scope[]).map((k) => (
                <option key={k} value={k}>
                  {SCOPE_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1.5 text-[12px] text-ink-muted">{SCOPE_HINT[scope]}</p>
        </div>
        <div className="self-end">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
          >
            {running ? "Re-analyzing…" : "Run"}
          </button>
        </div>
      </div>

      {(running || finished) && (
        <div className="rounded-2xl bg-bg-elev p-4 ring-1 ring-line">
          {!finished && current && (
            <>
              <div className="flex items-center justify-between text-[12px] text-ink-muted">
                <span className="truncate">
                  {current.done} / {current.total} · <span className="text-ink">{current.merchant}</span>
                </span>
                <span className="tabular">{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
          {finished && (
            <div className="flex items-baseline gap-4 text-[13px]">
              <div>
                <div className="text-ink-dim text-[11px] uppercase tracking-wider">Merchants</div>
                <div className="tabular text-ink">{totals.processed}</div>
              </div>
              <div>
                <div className="text-ink-dim text-[11px] uppercase tracking-wider">Re-classified</div>
                <div className="tabular text-success">{totals.changed}</div>
              </div>
              <div>
                <div className="text-ink-dim text-[11px] uppercase tracking-wider">Transactions updated</div>
                <div className="tabular text-ink">{totals.txUpdated}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-danger/15 px-3 py-2 text-[13px] text-danger">{error}</div>
      )}
    </div>
  );
}
