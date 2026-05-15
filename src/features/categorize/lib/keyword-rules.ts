import type { CategorySlug } from "@/shared/config";

/**
 * First-match-wins keyword rules. Matched against the NORMALIZED merchant.
 */
export const KEYWORD_RULES: ReadonlyArray<readonly [RegExp, CategorySlug]> = [
  // Food delivery (before generic dining)
  [/SNOONU|TALABAT|RAFEEQ|JAHEZ|DELIVEROO/i, "food-delivery"],

  // Groceries
  [/CARREFOUR|LULU|MONOPRIX|AL\s*MEERA|SPINNEYS|GRAND\s*MART|FAMILY\s*FOOD/i, "groceries"],

  // Dining
  [/BRD|ROTISERIE|COMMON\s*ROOM|REST|RESTAURA|CAFE|COFFEE|STARBUCKS|COSTA|KARAK|KFC|MCDONALD|BURGER|PIZZA|SHAWARMA|TIM\s*HORTONS/i, "dining"],

  // Transport (incl. fuel)
  [/UBER|UBR|CAREEM|TAXI|KARWA/i, "transport"],
  [/WOQOD|PETROL|FUEL/i, "transport"],

  // Bills / Utilities
  [/KAHRAMAA|OOREDOO|VODAFONE|QEWC|OOREDO/i, "bills"],

  // Health
  [/PHARMACY|HOSPITAL|CLINIC|ASTER|MEDICAL/i, "health"],

  // Travel
  [/QATAR\s*AIRWAYS|AIRLINE|HOTEL|BOOKING\.?COM|AGODA|EXPEDIA/i, "travel"],

  // Entertainment
  [/NETFLIX|SPOTIFY|CINEMA|VOX|YOUTUBE|APPLE\s*COM|DISNEY/i, "entertainment"],

  // Cash
  [/\bATM\b|CASH\s*WITHDRAW|CASH\s*ADVANCE/i, "cash"],

  // Shopping
  [/^BATTERY/i, "shopping"],
  [/AMAZON|NAMSHI|VIRGIN\s*MEGASTORE|H\s*M|ZARA|IKEA/i, "shopping"],
];

export function applyKeywordRules(normalizedMerchant: string): CategorySlug | null {
  for (const [re, slug] of KEYWORD_RULES) {
    if (re.test(normalizedMerchant)) return slug;
  }
  return null;
}
