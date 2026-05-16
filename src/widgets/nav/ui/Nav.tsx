"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/features/auth-magic-link";
import { cn } from "@/shared/lib";

const links = [
  { href: "/", label: "Overview" },
  { href: "/monthly", label: "Monthly" },
  { href: "/ask", label: "Ask" },
  { href: "/search", label: "Search" },
  { href: "/trends", label: "Trends" },
  { href: "/settings", label: "Settings" },
];

function NavIcon({ name }: { name: string }) {
  const sw = 1.6;
  switch (name) {
    case "Overview":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0Z" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 12V3" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path d="M12 12l6.5 3.75" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "Monthly":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth={sw} />
          <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth={sw} />
          <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "Search":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth={sw} />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "Ask":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M21 12a8 8 0 1 1-3.06-6.3L21 4l-1 4-3.94-1"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 9.5a2.5 2.5 0 1 1 4 2c-.8.5-1.5 1-1.5 2"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
      );
    case "Trends":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path d="M3 17l5-5 4 3 8-9" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 6h6v6" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={sw} />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.07 4.1l.06.06a1.7 1.7 0 0 0 1.87.34h.02A1.7 1.7 0 0 0 10 3.07V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06A2 2 0 1 1 19.9 7.07l-.06.06a1.7 1.7 0 0 0-.34 1.87v.02c.27.62.86 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.56 1.03Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

function useIsActive() {
  const pathname = usePathname();
  return function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}

export function Nav({
  userEmail,
  smartCategories = [],
}: {
  userEmail?: string | null;
  smartCategories?: Array<{ id: string; name: string; emoji: string }>;
}) {
  const isActive = useIsActive();

  return (
    <>
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:overflow-y-auto md:px-4 md:py-8">
        <div className="glass mb-3 rounded-2xl px-4 py-5">
          <div className="text-[15px] font-semibold tracking-tight text-ink">QNB Expenses</div>
          <div className="mt-0.5 text-[12px] text-ink-muted">personal intelligence</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-ink/90 hover:bg-bg-hover",
                )}
              >
                <span
                  className={cn(
                    active ? "text-accent" : "text-ink-muted group-hover:text-ink",
                  )}
                >
                  <NavIcon name={l.label} />
                </span>
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>
        {smartCategories.length > 0 && (
          <nav className="mt-6 flex flex-col gap-0.5">
            <div className="mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.10em] text-ink-dim">
              Smart
            </div>
            {smartCategories.map((s) => {
              const active = isActive(`/smart/${s.id}`);
              return (
                <Link
                  key={s.id}
                  href={`/smart/${s.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-ink/90 hover:bg-bg-hover",
                  )}
                >
                  <span className="text-[14px]">{s.emoji}</span>
                  <span className="truncate">{s.name}</span>
                </Link>
              );
            })}
          </nav>
        )}
        <div className="mt-auto pt-4">
          {userEmail && (
            <div className="mb-2 px-3 text-[11px] text-ink-dim">
              <div className="truncate">{userEmail}</div>
            </div>
          )}
          <SignOutButton />
        </div>
      </aside>

      <nav
        className="glass-strong fixed inset-x-2 z-30 flex rounded-2xl px-1 py-1.5 shadow-card md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
      >
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-ink-muted active:bg-bg-hover",
              )}
            >
              <span className={active ? "text-accent" : "text-ink"}>
                <NavIcon name={l.label} />
              </span>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
