import Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_SLUGS, type CategorySlug } from "@/shared/config";

export const HAIKU_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

let _client: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (_client !== undefined) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  _client = key ? new Anthropic({ apiKey: key }) : null;
  return _client;
}

export type ClaudeCategorization = {
  slug: CategorySlug;
  confidence: number;
  reasoning: string;
};

const SYSTEM_PROMPT = `You categorize Qatar merchant names from QNB credit-card SMS transactions.

Return ONLY a single JSON object — no prose, no code fences — with this shape:
{ "category": "<slug>", "confidence": 0.0-1.0, "reasoning": "short why" }

The "category" MUST be exactly one of these slugs:
- dining          — sit-down restaurants, cafes, fast food
- food-delivery   — Snoonu, Talabat, Rafeeq, Jahez
- groceries       — Carrefour, Lulu, Monoprix, Al Meera, etc.
- transport       — Uber, Careem, taxi, fuel/petrol (Woqod)
- shopping        — retail, clothing, electronics
- entertainment   — cinema, streaming, subscriptions
- health          — pharmacy, clinic, hospital, gym
- bills           — utilities (Kahramaa, Ooredoo, Vodafone)
- travel          — airlines, hotels, Qatar Airways, Booking.com
- cash            — ATM withdrawals / cash advance
- other           — only if none of the above clearly fit

Merchant strings may be truncated or contain noise like "* PENDING" or ".COM".
Use the highest-likelihood category. Confidence below 0.6 → "other".`;

export async function categorizeMerchantWithClaude(
  merchantRaw: string,
): Promise<ClaudeCategorization | null> {
  const client = getAnthropic();
  if (!client) return null;
  try {
    const resp = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 200,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Merchant: ${merchantRaw}` }],
    });
    const block = resp.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const json = block.text.match(/\{[\s\S]*\}/);
    if (!json) return null;
    const parsed = JSON.parse(json[0]) as {
      category?: string;
      confidence?: number;
      reasoning?: string;
    };
    const slug = (parsed.category ?? "").toLowerCase() as CategorySlug;
    if (!CATEGORY_SLUGS.includes(slug)) return null;
    return {
      slug,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };
  } catch (err) {
    console.error("[anthropic] categorization failed", err);
    return null;
  }
}
