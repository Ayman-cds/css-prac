import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { getSmartCategory } from "@/entities/smart-category";
import { evaluateSmartCategoryFilter } from "@/features/evaluate-smart-category";
import { TransactionList } from "@/entities/transaction";
import { Card } from "@/shared/ui/card";
import { Amount } from "@/shared/ui/amount";
import { formatQar } from "@/shared/lib";

export async function SmartCategoryDetailPage({ id }: { id: string }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const sc = await getSmartCategory(supabase, id);
  if (!sc) notFound();

  const transactions = await evaluateSmartCategoryFilter(
    supabase,
    user.id,
    sc.filter,
  );
  const total = transactions.reduce((a, t) => a + Number(t.amount_qar), 0);
  const avg = transactions.length ? total / transactions.length : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elev ring-1 ring-line hover:bg-bg-hover"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-muted" fill="none">
            <path
              d="m14 6-6 6 6 6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[22px]">{sc.emoji}</span>
            <h1 className="font-display text-[22px] font-semibold tracking-display text-ink">
              {sc.name}
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">{sc.prompt}</p>
        </div>
      </header>

      <Card>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.10em] text-ink-dim">
              Total
            </div>
            <div className="mt-1">
              <Amount amount={total} size="lg" />
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.10em] text-ink-dim">
              Transactions
            </div>
            <div className="tabular mt-1 font-display text-[22px] font-semibold tracking-display text-ink">
              {transactions.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.10em] text-ink-dim">
              Avg per tx
            </div>
            <div className="tabular mt-1 font-display text-[22px] font-semibold tracking-display text-ink">
              {formatQar(avg)}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Matching transactions" hint={`${transactions.length} found`}>
        <TransactionList transactions={transactions} group />
      </Card>

      <Card title="Filter" hint="parsed by Claude">
        <pre className="overflow-x-auto rounded-xl bg-bg-elev p-3 font-mono text-[11px] text-ink-muted ring-1 ring-line">
          {JSON.stringify(sc.filter, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
