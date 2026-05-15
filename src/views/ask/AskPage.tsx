import { AskChat } from "@/features/ask-ai";

export function AskPage() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-display text-ink">
            Ask
          </h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            Natural-language search across your spend.
          </p>
        </div>
      </header>
      <AskChat />
    </div>
  );
}
