import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, HAIKU_MODEL } from "@/shared/api/anthropic";
import type { Cadence } from "@/entities/subscription";
import { detectCadence, nextExpectedDate, type Candidate } from "../lib/heuristic";

type MerchantWithTxs = {
  id: string;
  display_name: string;
  txs: Array<{ occurred_at: string; amount_qar: number }>;
};

export type DetectionResult = {
  candidatesFound: number;
  confirmed: number;
  inserted: number;
  deactivated: number;
};

/**
 * Full detection pipeline:
 *   1. fetch each merchant with its transaction history
 *   2. apply the heuristic to surface candidates
 *   3. (optional) ask Claude to filter false positives
 *   4. upsert into subscriptions, deactivate ones no longer detected
 */
export async function detectRecurring(
  supabase: SupabaseClient,
  userId: string,
): Promise<DetectionResult> {
  // pull all merchants + their transactions in one round trip
  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, display_name")
    .eq("user_id", userId);

  if (!merchants || merchants.length === 0) {
    return { candidatesFound: 0, confirmed: 0, inserted: 0, deactivated: 0 };
  }

  const merchantIds = merchants.map((m) => m.id);

  const { data: txs } = await supabase
    .from("transactions")
    .select("merchant_id, occurred_at, amount_qar")
    .eq("user_id", userId)
    .in("merchant_id", merchantIds);

  const byMerchant = new Map<string, MerchantWithTxs>();
  for (const m of merchants) {
    byMerchant.set(m.id, { id: m.id, display_name: m.display_name, txs: [] });
  }
  for (const t of txs ?? []) {
    const row = t as { merchant_id: string | null; occurred_at: string; amount_qar: number };
    if (row.merchant_id && byMerchant.has(row.merchant_id)) {
      byMerchant.get(row.merchant_id)!.txs.push({
        occurred_at: row.occurred_at,
        amount_qar: Number(row.amount_qar),
      });
    }
  }

  const candidates: Array<{ merchant: MerchantWithTxs; candidate: Candidate }> = [];
  for (const m of byMerchant.values()) {
    const c = detectCadence(m.txs);
    if (c) candidates.push({ merchant: m, candidate: c });
  }

  // AI filtering pass (optional — falls back to "all confirmed" if no key)
  const confirmed = await aiFilterCandidates(candidates);

  // upsert
  let inserted = 0;
  for (const c of confirmed) {
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        merchant_id: c.merchant.id,
        cadence: c.candidate.cadence,
        expected_amount_qar: c.candidate.expectedAmount,
        confidence: 1 - c.candidate.amountCoefVar, // 0..1, higher = more stable
        next_expected_date: nextExpectedDate(c.candidate.lastSeenAt, c.candidate.cadence),
        active: true,
        detected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,merchant_id" },
    );
    if (!error) inserted++;
  }

  // deactivate subscriptions whose merchants no longer match the heuristic
  const confirmedMerchantIds = new Set(confirmed.map((c) => c.merchant.id));
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, merchant_id")
    .eq("user_id", userId)
    .eq("active", true);

  let deactivated = 0;
  for (const s of existing ?? []) {
    if (!confirmedMerchantIds.has(s.merchant_id)) {
      await supabase
        .from("subscriptions")
        .update({ active: false })
        .eq("id", s.id);
      deactivated++;
    }
  }

  return {
    candidatesFound: candidates.length,
    confirmed: confirmed.length,
    inserted,
    deactivated,
  };
}

async function aiFilterCandidates(
  candidates: Array<{ merchant: MerchantWithTxs; candidate: Candidate }>,
): Promise<Array<{ merchant: MerchantWithTxs; candidate: Candidate }>> {
  const client = getAnthropic();
  if (!client || candidates.length === 0) return candidates;

  const payload = candidates.map((c) => ({
    id: c.merchant.id,
    name: c.merchant.display_name,
    cadence: c.candidate.cadence,
    meanAmount: c.candidate.expectedAmount,
    transactionCount: c.candidate.transactionCount,
    amountCoefVar: Number(c.candidate.amountCoefVar.toFixed(3)),
  }));

  try {
    const resp = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 800,
      temperature: 0,
      system: `You filter recurring-subscription candidates from a Qatar credit-card user. Heuristics already grouped these by amount stability + cadence. Your job: weed out merchants that are obviously NOT subscriptions (e.g. a regular coffee shop that's monthly-ish by coincidence, fuel station, grocery store), even though the heuristic flagged them.

KEEP merchants that look like real recurring services: streaming, telco, ISP, gym, software/SaaS, insurance, charity, news.

Return STRICT JSON: an array of objects { "id": string, "isSubscription": boolean }. Include every input id. No prose.`,
      messages: [
        {
          role: "user",
          content: `Candidates:\n${JSON.stringify(payload, null, 2)}\n\nReturn the JSON.`,
        },
      ],
    });
    const block = resp.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return candidates;
    const m = block.text.match(/\[[\s\S]*\]/);
    if (!m) return candidates;
    const parsed = JSON.parse(m[0]) as Array<{ id: string; isSubscription: boolean }>;
    const allowed = new Set(parsed.filter((p) => p.isSubscription).map((p) => p.id));
    return candidates.filter((c) => allowed.has(c.merchant.id));
  } catch (err) {
    console.error("[recurring] AI filter failed, keeping all candidates", err);
    return candidates;
  }
}
