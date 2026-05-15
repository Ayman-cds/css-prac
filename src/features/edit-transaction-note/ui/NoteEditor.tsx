"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function NoteEditor({
  transactionId,
  initial,
}: {
  transactionId: string;
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/transactions/${transactionId}/note`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a note…"
        rows={3}
        className="w-full resize-none rounded-xl bg-bg-elev px-3 py-2 text-[14px] text-ink ring-1 ring-line placeholder:text-ink-dim focus:outline-none focus:ring-accent/50"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-dim">
          {saved ? "Saved" : ""}
        </span>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-accent px-4 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}
