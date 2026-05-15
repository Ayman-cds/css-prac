"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { addMonths, format, parse } from "date-fns";

export function MonthSelector({ basePath = "/monthly" }: { basePath?: string }) {
  const sp = useSearchParams();
  const ym = sp.get("m");
  const current = ym ? parse(ym, "yyyy-MM", new Date()) : new Date();
  const prev = format(addMonths(current, -1), "yyyy-MM");
  const next = format(addMonths(current, 1), "yyyy-MM");
  const label = format(current, "MMMM yyyy");

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-bg-elev p-1 ring-1 ring-line">
      <Link
        href={`${basePath}?m=${prev}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-bg-hover hover:text-ink"
        aria-label="Previous month"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path d="m14 6-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <div className="min-w-[140px] px-3 text-center text-[13px] font-medium tracking-tight text-ink">
        {label}
      </div>
      <Link
        href={`${basePath}?m=${next}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-bg-hover hover:text-ink"
        aria-label="Next month"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path d="m10 6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}
