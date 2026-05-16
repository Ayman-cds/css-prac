import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/api/supabase";

/**
 * Public auth shell. Signed-in users bounce to / immediately so they
 * can't see /login when already authenticated.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
              <path d="M7 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="font-display text-[18px] font-semibold tracking-display text-ink">
            QNB Expenses
          </div>
          <div className="mt-0.5 text-[12px] text-ink-muted">personal intelligence</div>
        </div>
        {children}
      </div>
    </div>
  );
}
