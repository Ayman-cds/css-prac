import { cn } from "@/shared/lib";

export function Card({
  className,
  children,
  title,
  hint,
  action,
}: {
  className?: string;
  children: React.ReactNode;
  title?: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("glass rounded-2xl p-5 md:p-6 shadow-card", className)}>
      {(title || hint || action) && (
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            {title && (
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                {title}
              </h2>
            )}
            {hint && <span className="text-[12px] text-ink-dim">{hint}</span>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function CardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-4 md:gap-5", className)}>{children}</div>;
}
