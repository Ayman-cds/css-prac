import type { CategorizationSource } from "@/shared/config";
import type { CategoryDisplay } from "@/entities/category";

export type Merchant = {
  id: string;
  normalized_name: string;
  display_name: string;
  category_id: string | null;
  confidence: number | null;
  source: CategorizationSource;
  times_seen: number;
  total_spent_qar: number;
  first_seen: string;
  last_seen_at: string;
};

export type MerchantWithCategory = Merchant & { categories: CategoryDisplay | null };
