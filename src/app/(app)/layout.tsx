import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { Nav } from "@/widgets/nav";

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

  return (
    <div className="min-h-screen pb-28 md:pb-0 md:pl-60">
      <Nav userEmail={user.email} />
      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-10 sm:px-6 md:pt-12 md:pb-16">
        {children}
      </main>
    </div>
  );
}
