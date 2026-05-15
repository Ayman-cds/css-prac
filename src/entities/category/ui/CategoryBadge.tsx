import { cn } from "@/shared/lib";

export function CategoryBadge({
  emoji,
  name,
  color,
  size = "md",
  className,
}: {
  emoji?: string | null;
  name?: string | null;
  color?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!name) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-ink-dim", className)}>
        <span className="h-2 w-2 rounded-full bg-ink-dim" />
        Uncategorized
      </span>
    );
  }
  const bg = color ? hexToTint(color, 0.14) : "rgba(255,255,255,0.06)";
  const fg = color ?? "#f5f5f7";
  const sizes = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-[12px] px-2.5 py-1",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium tracking-tight",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {emoji && <span className="text-[1em] leading-none">{emoji}</span>}
      <span>{name}</span>
    </span>
  );
}

function hexToTint(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const n = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const r = parseInt(n.substring(0, 2), 16);
  const g = parseInt(n.substring(2, 4), 16);
  const b = parseInt(n.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
