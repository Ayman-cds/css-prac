export type CategorySlug =
  | "dining"
  | "food-delivery"
  | "groceries"
  | "transport"
  | "shopping"
  | "entertainment"
  | "health"
  | "bills"
  | "travel"
  | "cash"
  | "other";

export const CATEGORY_SLUGS: CategorySlug[] = [
  "dining",
  "food-delivery",
  "groceries",
  "transport",
  "shopping",
  "entertainment",
  "health",
  "bills",
  "travel",
  "cash",
  "other",
];

export type CategorizationSource = "cache" | "rule" | "ai" | "fallback" | "manual";
