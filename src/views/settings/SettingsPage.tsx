import { createSupabaseServerClient } from "@/shared/api/supabase";
import { getCategories } from "@/entities/category";
import { getMerchants } from "@/entities/merchant";
import { getBudgets } from "@/entities/budget";
import { Card } from "@/shared/ui/card";
import { BudgetsEditor } from "@/features/manage-budgets";
import { ReanalyzeCard } from "@/features/reanalyze-merchants";
import { CreateSmartCategoryForm } from "@/features/create-smart-category";
import { listSmartCategories } from "@/entities/smart-category";
import { SmartCategoriesList } from "@/widgets/smart-categories-list";
import { CategoryBadge } from "@/entities/category";
import { formatQar } from "@/shared/lib";

export async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const [categories, merchants, budgets, smartCategories] = await Promise.all([
    getCategories(supabase),
    getMerchants(supabase),
    getBudgets(supabase),
    listSmartCategories(supabase),
  ]);

  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasIngestToken = Boolean(process.env.INGEST_TOKEN);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold tracking-display text-ink">
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          Tune categorization, budgets, and integrations.
        </p>
      </header>

      <Card
        title="Smart categories"
        hint={`${smartCategories.length} active`}
      >
        <CreateSmartCategoryForm />
        <div className="mt-6">
          <SmartCategoriesList items={smartCategories} />
        </div>
      </Card>

      <Card
        title="Re-analyze with AI"
        hint="Re-run Claude over your merchant catalog"
      >
        <ReanalyzeCard />
      </Card>

      <Card title="Budgets" hint="monthly limits">
        <BudgetsEditor categories={categories} budgets={budgets} />
      </Card>

      <Card title="Merchant rules" hint={`${merchants.length} known`}>
        {merchants.length === 0 ? (
          <div className="text-[13px] text-ink-muted">No merchants yet.</div>
        ) : (
          <ul className="-mx-3 max-h-[480px] divide-y divide-line/40 overflow-y-auto">
            {merchants.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-ink">{m.display_name}</div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-muted">
                    <CategoryBadge
                      emoji={m.categories?.emoji}
                      name={m.categories?.name}
                      color={m.categories?.color}
                      size="sm"
                    />
                    <span className="text-ink-dim">·</span>
                    <span className="capitalize">{m.source}</span>
                    {m.confidence != null && (
                      <>
                        <span className="text-ink-dim">·</span>
                        <span>{Math.round(Number(m.confidence) * 100)}%</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular text-[13px] text-ink">
                    {formatQar(Number(m.total_spent_qar))}
                  </div>
                  <div className="text-[11px] text-ink-dim">{m.times_seen} seen</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Categories" hint={`${categories.length} active`}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl bg-bg-elev px-3 py-2 ring-1 ring-line"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: `${c.color}24`, color: c.color }}
              >
                {c.emoji}
              </span>
              <span className="text-[14px] text-ink">{c.name}</span>
              {c.is_system && (
                <span className="ml-auto rounded-full bg-bg px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-dim">
                  system
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Integrations">
        <ul className="space-y-2">
          <Row
            label="Anthropic (Claude Haiku)"
            ok={hasAnthropic}
            hint={hasAnthropic ? "AI categorization enabled" : "Set ANTHROPIC_API_KEY to enable AI"}
          />
          <Row
            label="Ingest webhook"
            ok={hasIngestToken}
            hint={
              hasIngestToken
                ? "POST /api/ingest is ready for your iOS Shortcut"
                : "Set INGEST_TOKEN + INGEST_USER_ID"
            }
          />
        </ul>
      </Card>

      <Card title="Export">
        <a
          href="/api/export"
          className="inline-flex items-center gap-1.5 rounded-full bg-bg-elev px-4 py-2 text-[13px] font-medium text-ink ring-1 ring-line hover:bg-bg-hover"
        >
          Download all transactions (CSV)
        </a>
      </Card>
    </div>
  );
}

function Row({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-bg-elev px-3 py-2.5 ring-1 ring-line">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          ok ? "bg-success" : "bg-ink-dim"
        }`}
      />
      <div>
        <div className="text-[14px] text-ink">{label}</div>
        <div className="text-[12px] text-ink-muted">{hint}</div>
      </div>
    </li>
  );
}
