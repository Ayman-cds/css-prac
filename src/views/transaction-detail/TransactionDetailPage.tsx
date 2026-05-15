import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import {
  getTransactionById,
  getTransactionsByMerchant,
} from "@/entities/transaction";
import { getCategories } from "@/entities/category";
import { Card } from "@/shared/ui/card";
import { Amount } from "@/shared/ui/amount";
import { CategoryEditor } from "@/features/recategorize-transaction";
import { NoteEditor } from "@/features/edit-transaction-note";
import { TransactionRow } from "@/entities/transaction";
import { formatDate, dirFor, formatQar } from "@/shared/lib";

export async function TransactionDetailPage({ id }: { id: string }) {
  const supabase = createSupabaseServerClient();
  const [tx, categories] = await Promise.all([
    getTransactionById(supabase, id),
    getCategories(supabase),
  ]);
  if (!tx) notFound();

  const related = tx.merchant_id
    ? await getTransactionsByMerchant(supabase, tx.merchant_id, tx.id, 6)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elev ring-1 ring-line hover:bg-bg-hover"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-muted" fill="none">
            <path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-display text-[22px] font-semibold tracking-display text-ink">
          Transaction
        </h1>
      </header>

      <Card>
        <div className="flex flex-col items-center text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-[28px]"
            style={{
              backgroundColor: tx.category?.color
                ? `${tx.category.color}24`
                : "rgba(255,255,255,0.06)",
            }}
          >
            {tx.category?.emoji ?? "💳"}
          </div>
          <div className="mt-3 font-medium text-ink" dir={dirFor(tx.merchant_raw)}>
            {tx.merchant_raw}
          </div>
          <div className="mt-1 text-[12px] text-ink-muted">
            {formatDate(tx.occurred_at, { time: true })}
            {tx.card_last_digit && ` · Visa ·${tx.card_last_digit}`}
          </div>
          <div className="mt-4">
            <Amount amount={tx.amount_qar} size="hero" approximate={tx.is_approximate} />
          </div>
          {tx.balance_qar != null && (
            <div className="mt-2 text-[12px] text-ink-muted">
              Balance after: <span className="tabular text-ink">{formatQar(tx.balance_qar)}</span>
            </div>
          )}
          <div className="mt-5">
            <CategoryEditor
              transactionId={tx.id}
              current={tx.category}
              categories={categories}
            />
          </div>
        </div>
      </Card>

      <Card title="Note">
        <NoteEditor transactionId={tx.id} initial={tx.notes} />
      </Card>

      <Card title="Original SMS">
        <pre
          className="whitespace-pre-wrap break-words rounded-xl bg-bg-elev p-4 font-mono text-[12px] text-ink ring-1 ring-line"
          dir={dirFor(tx.raw_sms)}
        >
{tx.raw_sms}
        </pre>
        <div className="mt-3 grid gap-2 text-[12px] text-ink-muted sm:grid-cols-2">
          <Field label="Card" value={tx.card_last_digit ? `visa_${tx.card_last_digit}` : "—"} />
          <Field label="Amount" value={formatQar(tx.amount_qar) + (tx.is_approximate ? " ≈" : "")} />
          <Field label="Merchant (normalized)" value={tx.merchant_normalized} />
          <Field label="Balance" value={tx.balance_qar == null ? "—" : formatQar(tx.balance_qar)} />
          <Field
            label="Categorization"
            value={`${tx.category?.name ?? "—"} · conf ${
              tx.category_confidence == null ? "?" : Math.round(Number(tx.category_confidence) * 100) + "%"
            }${tx.user_corrected ? " · user-corrected" : ""}`}
          />
          <Field label="Captured" value={formatDate(tx.created_at, { time: true })} />
        </div>
      </Card>

      {related.length > 0 && (
        <Card title="Other transactions at this merchant">
          <ul className="-mx-3 divide-y divide-line/40">
            {related.map((r) => (
              <li key={r.id}>
                <TransactionRow tx={r} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-bg-elev px-3 py-2 ring-1 ring-line">
      <span className="text-ink-dim">{label}</span>
      <span className="text-ink tabular">{value}</span>
    </div>
  );
}
