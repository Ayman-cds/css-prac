import { getAnthropic, HAIKU_MODEL } from "@/shared/api/anthropic";
import { CATEGORY_SLUGS } from "@/shared/config";
import type { SmartCategoryFilter } from "@/entities/smart-category";

export type Translation = {
  name: string;
  emoji: string;
  filter: SmartCategoryFilter;
};

const SYSTEM_PROMPT = (today: string) => `You translate a user's natural-language description into a structured filter for matching their QNB credit-card transactions. The result becomes a named "smart category" they revisit.

Today is ${today}. The user is in Qatar — the local weekend is Friday and Saturday (dayOfWeek 5 and 6, where 0=Sunday).

Available existing category slugs: ${CATEGORY_SLUGS.join(", ")}.

Output STRICT JSON ONLY (no prose, no code fences) matching:

{
  "name": "<=30 char title, singular, capitalized",
  "emoji": "<single emoji that visually fits>",
  "filter": {
    "merchantPatterns": ["lowercase substrings, ANY match"]?,
    "categorySlugs": ["from the list above"]?,
    "excludeCategorySlugs": [...]?,
    "amountMin": number?,
    "amountMax": number?,
    "fromDate": "YYYY-MM-DD"?,
    "toDate": "YYYY-MM-DD"?,
    "dayOfWeek": [0-6]?,
    "onlySubscriptions": boolean?,
    "excludeSubscriptions": boolean?
  }
}

Rules:
- Use the narrowest set of fields that captures the intent. Empty arrays are not allowed — omit the key instead.
- Prefer merchantPatterns for specific brands/types (laundry, gym, coffee, parking).
- Prefer categorySlugs when the user names an existing taxonomy.
- Use onlySubscriptions only when the user says "subscriptions", "recurring", "monthly bills" and similar.
- For "weekend" in Qatar, dayOfWeek = [5, 6].
- Resolve "last month", "this year", "last 90 days" etc. into concrete fromDate / toDate using today's date.
- Do not invent fields. Do not include null values.

Examples:
"all laundry I've done over a weekend"
→ { "name": "Weekend Laundry", "emoji": "🧺", "filter": { "merchantPatterns": ["laundry", "wash", "dry clean"], "dayOfWeek": [5, 6] } }

"recurring subscription services"
→ { "name": "Subscriptions", "emoji": "🔁", "filter": { "onlySubscriptions": true } }

"big dining bills over QAR 200 this year"
→ { "name": "Big Dining Nights", "emoji": "🍴", "filter": { "categorySlugs": ["dining"], "amountMin": 200, "fromDate": "${today.slice(0, 4)}-01-01" } }

"coffee runs"
→ { "name": "Coffee", "emoji": "☕", "filter": { "merchantPatterns": ["starbucks", "costa", "tim hortons", "coffee", "cafe", "karak"] } }

"uber and careem"
→ { "name": "Ride Hailing", "emoji": "🚖", "filter": { "merchantPatterns": ["uber", "ubr", "careem"] } }`;

export async function translateToSmartCategory(
  prompt: string,
): Promise<Translation | null> {
  const client = getAnthropic();
  if (!client) {
    // Heuristic fallback: just store the prompt as a single merchant pattern,
    // so the feature degrades gracefully without an API key.
    return {
      name: prompt.slice(0, 30),
      emoji: "✨",
      filter: { merchantPatterns: [prompt.toLowerCase().slice(0, 40)] },
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const resp = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 400,
      temperature: 0,
      system: SYSTEM_PROMPT(today),
      messages: [{ role: "user", content: prompt }],
    });

    const block = resp.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;

    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<Translation>;
    if (!parsed.name || !parsed.filter) return null;

    return {
      name: String(parsed.name).slice(0, 30),
      emoji: typeof parsed.emoji === "string" ? parsed.emoji : "✨",
      filter: sanitizeFilter(parsed.filter),
    };
  } catch (err) {
    console.error("[smart-category translate] failed", err);
    return null;
  }
}

function sanitizeFilter(raw: SmartCategoryFilter): SmartCategoryFilter {
  const out: SmartCategoryFilter = {};
  if (Array.isArray(raw.merchantPatterns) && raw.merchantPatterns.length) {
    out.merchantPatterns = raw.merchantPatterns
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .map((p) => p.toLowerCase().trim());
  }
  if (Array.isArray(raw.categorySlugs) && raw.categorySlugs.length) {
    out.categorySlugs = raw.categorySlugs.filter((s) =>
      CATEGORY_SLUGS.includes(s),
    );
  }
  if (Array.isArray(raw.excludeCategorySlugs) && raw.excludeCategorySlugs.length) {
    out.excludeCategorySlugs = raw.excludeCategorySlugs.filter((s) =>
      CATEGORY_SLUGS.includes(s),
    );
  }
  if (Array.isArray(raw.merchantIds) && raw.merchantIds.length) {
    out.merchantIds = raw.merchantIds.filter((s) => typeof s === "string");
  }
  if (typeof raw.amountMin === "number") out.amountMin = raw.amountMin;
  if (typeof raw.amountMax === "number") out.amountMax = raw.amountMax;
  if (typeof raw.fromDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.fromDate)) {
    out.fromDate = raw.fromDate;
  }
  if (typeof raw.toDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.toDate)) {
    out.toDate = raw.toDate;
  }
  if (Array.isArray(raw.dayOfWeek) && raw.dayOfWeek.length) {
    const days = raw.dayOfWeek.filter(
      (d) => typeof d === "number" && d >= 0 && d <= 6,
    );
    if (days.length) out.dayOfWeek = days;
  }
  if (raw.onlySubscriptions === true) out.onlySubscriptions = true;
  if (raw.excludeSubscriptions === true) out.excludeSubscriptions = true;
  return out;
}
