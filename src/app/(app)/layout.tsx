import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { Nav } from "@/widgets/nav";
import { listSmartCategories } from "@/entities/smart-category";

/**
 * Protected layout. Every route inside this group is gated by getUser().
 * getUser() verifies the JWT against Supabase's auth server — unlike
 * getSession() which only reads the cookie, so cookie tampering can't
 * fake a session here.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Smart categories are user-defined; surface them in the sidebar so they
  // feel like first-class destinations. Tolerate missing table (pre-0003
  // migration) — if the query fails we just render an empty list.
  let smartCategories: { id: string; name: string; emoji: string }[] = [];
  try {
    const items = await listSmartCategories(supabase);
    smartCategories = items.map((i) => ({ id: i.id, name: i.name, emoji: i.emoji }));
  } catch {
    /* table doesn't exist yet — ignore */
  }

  return (
    <div className="min-h-screen md:pl-60">
      <Nav userEmail={user.email} smartCategories={smartCategories} />
      <main
        className="mx-auto w-full max-w-5xl px-4 sm:px-6 md:pt-12 md:pb-16"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)",
          paddingBottom:
            "calc(env(safe-area-inset-bottom) + 7rem)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
