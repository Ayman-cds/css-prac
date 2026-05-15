import { cn } from "@/shared/lib";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  className,
  ...rest
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all active:scale-[0.98] disabled:opacity-40";
  const styles: Record<Variant, string> = {
    primary: "bg-accent text-white hover:bg-accent/90",
    secondary:
      "bg-bg-elev text-ink ring-1 ring-line hover:bg-bg-hover hover:ring-line-strong",
    ghost: "text-ink-muted hover:text-ink hover:bg-bg-hover",
    danger: "bg-danger/15 text-danger ring-1 ring-danger/30 hover:bg-danger/25",
  };
  return <button className={cn(base, styles[variant], className)} {...rest} />;
}
