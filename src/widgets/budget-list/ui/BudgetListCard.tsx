import { Card } from "@/shared/ui/card";
import { BudgetProgress } from "@/entities/budget";

export type BudgetWithSpent = {
  id: string;
  monthly_limit: number;
  spent: number;
  categories: { slug: string; name: string; emoji: string; color: string } | null;
};

export function BudgetListCard({
  budgets,
  monthLabel,
}: {
  budgets: BudgetWithSpent[];
  monthLabel: string;
}) {
  if (budgets.length === 0) return null;
  return (
    <Card title="Budgets" hint={monthLabel}>
      <div className="grid gap-3 md:grid-cols-2">
        {budgets.map((b) => (
          <BudgetProgress
            key={b.id}
            category={b.categories ?? { slug: "other", name: "Other", emoji: "📦", color: "#7c5cff" }}
            spent={b.spent}
            limit={Number(b.monthly_limit)}
          />
        ))}
      </div>
    </Card>
  );
}
