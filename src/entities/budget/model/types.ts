import type { CategoryDisplay } from "@/entities/category";

export type Budget = {
  id: string;
  category_id: string | null;
  monthly_limit: number;
  categories: CategoryDisplay | null;
};
