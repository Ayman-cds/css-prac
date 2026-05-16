"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  "All laundry I've done over a weekend",
  "Recurring subscription services",
  "Coffee runs",
  "Big dining bills over QAR 200",
  "Uber and Careem rides",
];

export function CreateSmartCategoryForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function create() {
    if (!prompt.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/smart-categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.detail || `HTTP ${res.status}`);
      setPrompt("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-[11px] uppercase tracking-[0.10em] text-ink-dim">
          Describe what to track
        </span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={creating}
          placeholder="e.g. all laundry I've done over a weekend"
          rows={2}
          className="mt-1 block w-full resize-none rounded-xl bg-bg-elev px-3 py-2.5 text-[15px] text-ink ring-1 ring-line placeholder:text-ink-dim focus:outline-none focus:ring-accent/50 disabled:opacity-40"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPrompt(s)}
            disabled={creating}
            className="rounded-full bg-bg-elev px-3 py-1 text-[11px] text-ink-muted ring-1 ring-line hover:bg-bg-hover hover:text-ink disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={create}
          disabled={creating || !prompt.trim()}
          className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create smart category"}
        </button>
        <p className="text-[12px] text-ink-muted">
          Claude turns your description into a saved filter.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-danger/15 px-3 py-2 text-[13px] text-danger">{error}</div>
      )}
    </div>
  );
}
