import { createSupabaseServerClient } from "@/shared/api/supabase";
import { getCategories } from "@/entities/category";
import { searchTransactions } from "@/entities/transaction";
import type { SearchFilters } from "@/entities/transaction";
import { TransactionList } from "@/entities/transaction";
import { SearchForm } from "@/features/search-transactions";
import { Card } from "@/shared/ui/card";

export async function SearchPage({ filters }: { filters: SearchFilters }) {
  const supabase = createSupabaseServerClient();
  const [categories, results] = await Promise.all([
    getCategories(supabase),
    searchTransactions(supabase, filters),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold tracking-display text-ink">
          Search
        </h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          Find any transaction by merchant, amount, or date.
        </p>
      </header>

      <Card>
        <SearchForm categories={categories} />
      </Card>

      <Card title="Results" hint={`${results.length} match${results.length === 1 ? "" : "es"}`}>
        <TransactionList transactions={results} group empty="No results. Try widening filters." />
      </Card>
    </div>
  );
}
