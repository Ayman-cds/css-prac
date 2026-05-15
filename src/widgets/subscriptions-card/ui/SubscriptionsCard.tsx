"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/shared/ui/card";
import { formatQar } from "@/shared/lib";
import { monthlyEquivalent, type SubscriptionWithMerchant } from "@/entities/subscription";
import { CategoryBadge } from "@/entities/category";

const CADENCE_LABEL = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
} as const;

export function SubscriptionsCard({
  subscriptions,
}: {
  subscriptions: SubscriptionWithMerchant[];
}) {
  const router = useRouter();
  const [detecting, setDetecting] = useState(false);
  const [, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalMonthly = subscriptions.reduce(
    (s, sub) => s + monthlyEquivalent(sub.cadence, Number(sub.expected_amount_qar)),
    0,
  );

  async function detect() {
    setDetecting(true);
    setError(null);
    try {
      const res = await fetch("/api/recurring/detect", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.detail || `HTTP ${res.status}`);
      setSummary(
        `${body.confirmed} subscription${body.confirmed === 1 ? "" : "s"} confirmed · ${body.deactivated} deactivated`,
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(false);
    }
  }

  return (
    <Card
      title="Recurring subscriptions"
      hint={subscriptions.length > 0 ? `${formatQar(totalMonthly)} / mo total` : "none detected"}
      action={
        <button
          type="button"
          onClick={detect}
          disabled={detecting}
          className="rounded-full bg-bg-elev px-3 py-1.5 text-[12px] font-medium text-ink ring-1 ring-line hover:bg-bg-hover disabled:opacity-40"
        >
          {detecting ? "Detecting…" : subscriptions.length > 0 ? "Re-detect" : "Detect now"}
        </button>
      }
    >
      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-ink-muted">
          {detecting
            ? "Analyzing transaction history…"
            : "No recurring subscriptions detected yet. Click Detect to analyze."}
        </div>
      ) : (
        <ul className="-mx-3 divide-y divide-line/40">
          {subscriptions.map((s) => {
            const m = s.merchants;
            const monthly = monthlyEquivalent(s.cadence, Number(s.expected_amount_qar));
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-ink">
                    {m?.display_name ?? "—"}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                    <CategoryBadge
                      emoji={m?.categories?.emoji}
                      name={m?.categories?.name}
                      color={m?.categories?.color}
                      size="sm"
                    />
                    <span className="rounded-full bg-bg-elev px-2 py-0.5 ring-1 ring-line">
                      {CADENCE_LABEL[s.cadence]}
                    </span>
                    {s.next_expected_date && (
                      <span className="text-ink-dim">
                        next ~{new Date(s.next_expected_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular text-[14px] font-medium text-ink">
                    {formatQar(Number(s.expected_amount_qar))}
                  </div>
                  {s.cadence !== "monthly" && (
                    <div className="tabular text-[11px] text-ink-dim">
                      {formatQar(monthly)} / mo
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {summary && (
        <div className="mt-3 text-[12px] text-ink-muted">{summary}</div>
      )}
      {error && (
        <div className="mt-3 rounded-xl bg-danger/15 px-3 py-2 text-[12px] text-danger">{error}</div>
      )}
    </Card>
  );
}
