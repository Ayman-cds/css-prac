"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // SSR-safe portal target
  useEffect(() => setMounted(true), []);

  // Position panel under the trigger; recompute on scroll/resize/open
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelWidth = 224; // w-56
      const left = Math.min(
        r.left + window.scrollX,
        window.scrollX + window.innerWidth - panelWidth - 8,
      );
      setCoords({
        top: r.bottom + window.scrollY + 8,
        left,
        width: panelWidth,
      });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    <>
      <button
        ref={triggerRef}
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
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {mounted && open && coords &&
        createPortal(
          <div
            ref={panelRef}
            className="glass-strong fixed z-[100] rounded-2xl p-1.5 shadow-card"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            role="listbox"
          >
            <div className="grid max-h-[60vh] grid-cols-1 overflow-y-auto">
              {categories.map((c) => {
                const isCurrent = current?.slug === c.slug;
                return (
                  <button
                    key={c.id}
                    onClick={() => pick(c.slug)}
                    role="option"
                    aria-selected={isCurrent}
                    className={
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-bg-hover" +
                      (isCurrent ? " bg-bg-hover" : "")
                    }
                  >
                    <span className="text-[14px]">{c.emoji}</span>
                    <span className="text-ink">{c.name}</span>
                    {isCurrent && (
                      <span className="ml-auto text-accent">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                          <path
                            d="m5 12 5 5L20 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
