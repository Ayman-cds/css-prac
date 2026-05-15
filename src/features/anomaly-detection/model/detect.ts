import type { CategorySlug } from "@/shared/config";
import type { Transaction } from "@/entities/transaction";

export type Anomaly = {
  transactionId: string;
  merchantRaw: string;
  amountQar: number;
  categorySlug: CategorySlug | null;
  zScore: number;
  reason: "high_amount" | "new_merchant_large" | "category_spike";
  detail: string;
};

type EnrichedTx = Transaction & { category_slug: CategorySlug | null };

function meanStdDev(values: number[]): { mean: number; stddev: number } {
  if (values.length === 0) return { mean: 0, stddev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, stddev: Math.sqrt(variance) };
}

export function detectAnomalies(
  recent: EnrichedTx[],
  historical: EnrichedTx[],
): Anomaly[] {
  const out: Anomaly[] = [];
  const byCat = new Map<string, number[]>();
  for (const tx of historical) {
    const key = tx.category_slug ?? "other";
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(Number(tx.amount_qar));
  }
  const stats = new Map<string, { mean: number; stddev: number }>();
  for (const [k, vals] of byCat.entries()) stats.set(k, meanStdDev(vals));

  const knownMerchants = new Set(historical.map((t) => t.merchant_normalized));

  for (const tx of recent) {
    const key = tx.category_slug ?? "other";
    const s = stats.get(key);
    if (!s || s.stddev === 0) continue;

    const z = (Number(tx.amount_qar) - s.mean) / s.stddev;

    if (z >= 2.5) {
      out.push({
        transactionId: tx.id,
        merchantRaw: tx.merchant_raw,
        amountQar: Number(tx.amount_qar),
        categorySlug: tx.category_slug,
        zScore: z,
        reason: "high_amount",
        detail: `${z.toFixed(1)}σ above ${key} average (${s.mean.toFixed(0)} QAR)`,
      });
      continue;
    }

    const isNew = !knownMerchants.has(tx.merchant_normalized);
    if (isNew && s.mean > 0 && Number(tx.amount_qar) > 2 * s.mean) {
      out.push({
        transactionId: tx.id,
        merchantRaw: tx.merchant_raw,
        amountQar: Number(tx.amount_qar),
        categorySlug: tx.category_slug,
        zScore: z,
        reason: "new_merchant_large",
        detail: `new merchant, ${(Number(tx.amount_qar) / s.mean).toFixed(1)}× ${key} average`,
      });
    }
  }

  return out.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)).slice(0, 5);
}
