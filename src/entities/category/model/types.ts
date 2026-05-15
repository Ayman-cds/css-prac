import type { CategorySlug } from "@/shared/config";

export type Category = {
  id: string;
  slug: CategorySlug;
  name: string;
  emoji: string;
  color: string;
  is_system: boolean;
  sort_order: number;
  budget_qar: number | null;
};

export type CategoryDisplay = Pick<Category, "slug" | "name" | "emoji" | "color">;
