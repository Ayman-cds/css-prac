"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SmartCategory } from "@/entities/smart-category";

export function SmartCategoriesList({
  items,
}: {
  items: SmartCategory[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function remove(id: string) {
    if (!confirm("Delete this smart category?")) return;
    await fetch(`/api/smart-categories/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-ink-muted">
        No smart categories yet. Describe what to track above.
      </div>
    );
  }

  return (
    <ul className="-mx-3 divide-y divide-line/40">
      {items.map((s) => (
        <li
          key={s.id}
          className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-bg-hover"
        >
          <Link href={`/smart/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="text-[18px]">{s.emoji}</span>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-ink">{s.name}</div>
              <div className="truncate text-[12px] text-ink-muted">{s.prompt}</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => remove(s.id)}
            className="text-ink-dim hover:text-danger"
            aria-label="Delete smart category"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path
                d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m1 0v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7h8Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
