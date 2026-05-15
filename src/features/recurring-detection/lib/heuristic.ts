import type { Cadence } from "@/entities/subscription";

type TxLite = { occurred_at: string; amount_qar: number };

export type Candidate = {
  cadence: Cadence;
  meanGapDays: number;
  expectedAmount: number;
  amountCoefVar: number; // stddev / mean
  lastSeenAt: string;
  transactionCount: number;
};

const CADENCE_RANGES: Array<{ cadence: Cadence; min: number; max: number; target: number }> = [
  { cadence: "weekly", min: 6, max: 8, target: 7 },
  { cadence: "monthly", min: 26, max: 34, target: 30 },
  { cadence: "quarterly", min: 85, max: 95, target: 91 },
  { cadence: "annual", min: 350, max: 380, target: 365 },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Inspect a merchant's transaction history; return a Candidate iff the
 * cadence + amount-stability heuristic fires.
 *
 *  Requirements:
 *   - ≥ 3 transactions
 *   - mean gap falls within one of the cadence ranges
 *   - coefficient of variation of amounts < 0.15
 *   - 80% of gaps fall within the cadence's range
 */
export function detectCadence(txs: TxLite[]): Candidate | null {
  if (txs.length < 3) return null;

  // sort by date ascending
  const sorted = [...txs].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const ms = new Date(sorted[i].occurred_at).getTime() - new Date(sorted[i - 1].occurred_at).getTime();
    gaps.push(ms / MS_PER_DAY);
  }
  const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  const match = CADENCE_RANGES.find((c) => meanGap >= c.min && meanGap <= c.max);
  if (!match) return null;

  // 80% of gaps must fall within range
  const inRange = gaps.filter((g) => g >= match.min && g <= match.max).length;
  if (inRange / gaps.length < 0.8) return null;

  const amounts = sorted.map((t) => Number(t.amount_qar));
  const meanAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((a, b) => a + (b - meanAmount) ** 2, 0) / amounts.length;
  const stddev = Math.sqrt(variance);
  const coefVar = meanAmount ? stddev / meanAmount : Infinity;

  if (coefVar > 0.15) return null;

  return {
    cadence: match.cadence,
    meanGapDays: meanGap,
    expectedAmount: Math.round(meanAmount * 100) / 100,
    amountCoefVar: coefVar,
    lastSeenAt: sorted[sorted.length - 1].occurred_at,
    transactionCount: sorted.length,
  };
}

export function nextExpectedDate(lastSeenIso: string, cadence: Cadence): string {
  const range = CADENCE_RANGES.find((c) => c.cadence === cadence)!;
  const last = new Date(lastSeenIso);
  const next = new Date(last.getTime() + range.target * MS_PER_DAY);
  return next.toISOString().slice(0, 10);
}
