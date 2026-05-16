"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/entities/category";

type View = "visible" | "hidden" | "all";

export function SearchForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const initialView: View = sp.get("onlyHidden") === "true"
    ? "hidden"
    : sp.get("includeHidden") === "true"
    ? "all"
    : "visible";

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [categoryId, setCategoryId] = useState(sp.get("categoryId") ?? "");
  const [card, setCard] = useState(sp.get("card") ?? "");
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [minAmount, setMinAmount] = useState(sp.get("minAmount") ?? "");
  const [maxAmount, setMaxAmount] = useState(sp.get("maxAmount") ?? "");
  const [view, setView] = useState<View>(initialView);

  function buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (card) params.set("card", card);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);
    if (view === "hidden") params.set("onlyHidden", "true");
    else if (view === "all") params.set("includeHidden", "true");
    return params;
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    startTransition(() => router.push(`/search?${buildParams().toString()}`));
  }

  function reset() {
    setQ(""); setCategoryId(""); setCard(""); setFrom(""); setTo(""); setMinAmount(""); setMaxAmount("");
    setView("visible");
    startTransition(() => router.push("/search"));
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search merchants"
          className="w-full rounded-full bg-bg-elev py-2.5 pl-9 pr-3 text-[15px] text-ink ring-1 ring-line placeholder:text-ink-dim focus:outline-none focus:ring-accent/50"
        />
      </div>

      <div className="inline-flex rounded-full bg-bg-elev p-1 ring-1 ring-line">
        {(
          [
            { key: "visible", label: "Visible" },
            { key: "hidden", label: "Hidden" },
            { key: "all", label: "All" },
          ] as Array<{ key: View; label: string }>
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setView(opt.key)}
            className={
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors" +
              (view === opt.key ? " bg-accent text-white" : " text-ink-muted hover:text-ink")
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-xl bg-bg-elev px-3 py-2 text-[14px] text-ink ring-1 ring-line"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
        <select
          value={card}
          onChange={(e) => setCard(e.target.value)}
          className="rounded-xl bg-bg-elev px-3 py-2 text-[14px] text-ink ring-1 ring-line"
        >
          <option value="">Any card</option>
          <option value="8">Visa ·8</option>
          <option value="9">Visa ·9</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min QAR"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="rounded-xl bg-bg-elev px-3 py-2 text-[14px] text-ink ring-1 ring-line placeholder:text-ink-dim"
          />
          <input
            type="number"
            placeholder="Max QAR"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="rounded-xl bg-bg-elev px-3 py-2 text-[14px] text-ink ring-1 ring-line placeholder:text-ink-dim"
          />
        </div>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl bg-bg-elev px-3 py-2 text-[14px] text-ink ring-1 ring-line"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl bg-bg-elev px-3 py-2 text-[14px] text-ink ring-1 ring-line"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white"
        >
          Search
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-bg-elev px-4 py-2 text-[13px] font-medium text-ink-muted ring-1 ring-line hover:bg-bg-hover"
        >
          Reset
        </button>
        <span className="ml-auto text-[12px] text-ink-muted">
          <a
            href={`/api/export?${buildParams().toString()}`}
            className="hover:text-ink hover:underline"
          >
            Export CSV ↓
          </a>
        </span>
      </div>
    </form>
  );
}
