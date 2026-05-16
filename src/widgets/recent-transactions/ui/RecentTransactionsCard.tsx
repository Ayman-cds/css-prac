"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/shared/ui/card";
import { TransactionList } from "@/entities/transaction";
import type { TransactionWithCategory } from "@/entities/transaction";

const COLLAPSED_LIMIT = 5;

export function RecentTransactionsCard({
  transactions,
}: {
  transactions: TransactionWithCategory[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = transactions.length > COLLAPSED_LIMIT;
  const visible = expanded ? transactions : transactions.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = transactions.length - COLLAPSED_LIMIT;

  return (
    <Card
      title="Recent"
      hint={
        expanded
          ? `${transactions.length} shown`
          : `top ${Math.min(COLLAPSED_LIMIT, transactions.length)}`
      }
      action={
        <Link
          href="/search"
          className="text-[12px] font-medium text-accent hover:underline"
        >
          See all →
        </Link>
      }
    >
      <TransactionList transactions={visible} />

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-bg-elev px-4 py-1.5 text-[12px] font-medium text-ink ring-1 ring-line hover:bg-bg-hover"
          >
            {expanded ? (
              <>
                Show less
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                  <path
                    d="m18 15-6-6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            ) : (
              <>
                Show {hiddenCount} more
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  );
}
