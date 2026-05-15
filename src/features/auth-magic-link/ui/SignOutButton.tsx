"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/shared/api/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    start(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-ink-muted transition-colors hover:bg-bg-hover hover:text-ink"
      }
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <path
          d="M15 17l5-5-5-5M20 12H9M12 19a7 7 0 1 1 0-14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
