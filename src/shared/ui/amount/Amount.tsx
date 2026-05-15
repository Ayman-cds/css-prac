import { cn, formatQar } from "@/shared/lib";

export function Amount({
  amount,
  size = "md",
  className,
  approximate = false,
  signed = false,
}: {
  amount: number;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
  approximate?: boolean;
  signed?: boolean;
}) {
  const sizes: Record<typeof size, string> = {
    sm: "text-[13px]",
    md: "text-[15px]",
    lg: "text-[22px]",
    xl: "text-[32px]",
    hero: "text-[48px] md:text-[56px] leading-none",
  };
  const isHero = size === "hero" || size === "xl";
  const formatted = formatQar(Math.abs(amount));
  const [currency, ...rest] = formatted.split(" ");
  const number = rest.join(" ");

  return (
    <span
      className={cn(
        "tabular inline-flex items-baseline gap-1.5",
        sizes[size],
        isHero && "font-display font-semibold tracking-display",
        !isHero && "font-medium tracking-tight",
        className,
      )}
    >
      <span className={cn("text-ink-muted", isHero ? "text-[0.4em]" : "text-[0.85em]")}>
        {currency}
      </span>
      <span>
        {signed && amount > 0 ? "+" : signed && amount < 0 ? "−" : ""}
        {number}
      </span>
      {approximate && (
        <span className="ml-1 inline-flex items-center rounded-full bg-bg-elev px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted">
          ≈
        </span>
      )}
    </span>
  );
}

export function DeltaPill({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const positive = pct > 0;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        positive
          ? "bg-danger/15 text-danger"
          : pct < 0
          ? "bg-success/15 text-success"
          : "bg-bg-elev text-ink-muted",
      )}
    >
      {positive ? "↑" : pct < 0 ? "↓" : "·"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
