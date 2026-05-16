import type { CategorySlug } from "@/shared/config";

export type SmartCategoryFilter = {
  /** Case-insensitive substrings; ANY match included. */
  merchantPatterns?: string[];
  /** Restrict to transactions belonging to these existing categories. */
  categorySlugs?: CategorySlug[];
  /** Exclude these categories. */
  excludeCategorySlugs?: CategorySlug[];
  /** Restrict to transactions linked to these merchant IDs. */
  merchantIds?: string[];
  /** Minimum amount (inclusive). */
  amountMin?: number;
  /** Maximum amount (inclusive). */
  amountMax?: number;
  /** ISO date 'YYYY-MM-DD' (inclusive). */
  fromDate?: string;
  /** ISO date 'YYYY-MM-DD' (inclusive). */
  toDate?: string;
  /** Days of the week to keep. 0=Sunday … 6=Saturday. Qatar weekend is [5,6]. */
  dayOfWeek?: number[];
  /** Match only merchants the system has flagged as recurring subscriptions. */
  onlySubscriptions?: boolean;
  /** Exclude merchants flagged as recurring subscriptions. */
  excludeSubscriptions?: boolean;
};

export type SmartCategory = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  prompt: string;
  filter: SmartCategoryFilter;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
