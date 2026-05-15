const SUGGESTIONS = [
  "How much did I spend on Uber last month?",
  "What's my top category this month?",
  "Compare dining vs groceries this month",
  "Find my biggest single transaction this year",
  "How much do I spend on subscriptions each month?",
];

export function Suggestions({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="rounded-full bg-bg-elev px-3 py-1.5 text-[12px] text-ink-muted ring-1 ring-line transition-colors hover:bg-bg-hover hover:text-ink"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
