import type { CategoryDisplay } from "@/entities/category";

export type Cadence = "weekly" | "monthly" | "quarterly" | "annual";

export type Subscription = {
  id: string;
  merchant_id: string;
  cadence: Cadence;
  expected_amount_qar: number;
  confidence: number;
  next_expected_date: string | null;
  active: boolean;
  detected_at: string;
};

export type SubscriptionWithMerchant = Subscription & {
  merchants: {
    display_name: string;
    normalized_name: string;
    categories: CategoryDisplay | null;
  } | null;
};

export function monthlyEquivalent(cadence: Cadence, amount: number): number {
  switch (cadence) {
    case "weekly":
      return amount * 4.345;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "annual":
      return amount / 12;
  }
}
