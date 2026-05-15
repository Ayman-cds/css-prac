"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CategoryBadge } from "@/entities/category";
import type { Category } from "@/entities/category";

export function CategoryEditor({
  transactionId,
  current,
  categories,
}: {
  transactionId: string;
  current: { slug: string; name: string; emoji: string; color: string } | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  async function pick(slug: string) {
    setOpen(false);
    const res = await fetch(`/api/transactions/${transactionId}/recategorize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categorySlug: slug, applyToMerchant: true }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full bg-bg-elev px-3 py-1.5 text-[13px] font-medium ring-1 ring-line hover:bg-bg-hover"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
      >
        <CategoryBadge
          emoji={current?.emoji}
          name={current?.name ?? "Uncategorized"}
          color={current?.color}
          size="sm"
        />
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ink-muted" fill="none">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="glass-strong absolute z-20 mt-2 w-56 rounded-2xl p-1.5 shadow-card">
          <div className="grid grid-cols-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => pick(c.slug)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-bg-hover"
              >
                <span className="text-[14px]">{c.emoji}</span>
                <span className="text-ink">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
