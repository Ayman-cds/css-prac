import type { CategoryDisplay } from "@/entities/category";

export type Transaction = {
  id: string;
  occurred_at: string;
  card_last_digit: string | null;
  amount_qar: number;
  is_approximate: boolean;
  merchant_raw: string;
  merchant_normalized: string;
  merchant_id: string | null;
  category_id: string | null;
  category_confidence: number | null;
  balance_qar: number | null;
  raw_sms: string;
  notes: string | null;
  user_corrected: boolean;
  created_at: string;
};

export type TransactionWithCategory = Transaction & {
  category: CategoryDisplay | null;
};
