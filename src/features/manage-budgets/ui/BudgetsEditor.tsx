"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/entities/category";
import type { Budget } from "@/entities/budget";

export function BudgetsEditor({
  categories,
  budgets,
}: {
  categories: Category[];
  budgets: Budget[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const initial = Object.fromEntries(
    budgets.map((b) => [b.category_id ?? "_total", String(b.monthly_limit)]),
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState<string | null>(null);

  async function save(categoryId: string | null) {
    const key = categoryId ?? "_total";
    setSaving(key);
    const val = values[key];
    const monthlyLimit = val === "" ? null : Number(val);
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoryId, monthlyLimit }),
    });
    setSaving(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      {categories.map((c) => {
        const key = c.id;
        return (
          <div key={key} className="flex items-center gap-3 rounded-xl bg-bg-elev p-3 ring-1 ring-line">
            <span className="text-[18px]">{c.emoji}</span>
            <span className="flex-1 text-[14px] text-ink">{c.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-ink-dim">QAR</span>
              <input
                type="number"
                placeholder="—"
                value={values[key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                className="w-24 rounded-lg bg-bg px-2 py-1.5 text-right text-[13px] tabular text-ink ring-1 ring-line"
              />
              <button
                onClick={() => save(c.id)}
                disabled={saving === key}
                className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
              >
                {saving === key ? "…" : "Save"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
