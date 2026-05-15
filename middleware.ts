import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isApiIngest(p: string) {
  return p.startsWith("/api/ingest");
}

function isStatic(p: string) {
  return (
    p.startsWith("/_next") ||
    p.startsWith("/favicon") ||
    p.startsWith("/icon") ||
    p.startsWith("/public") ||
    p.includes(".")
  );
}

/**
 * Auth gate for every request except:
 *  - /api/ingest (bearer-token auth from iOS Shortcut)
 *  - /login, /auth/callback (public)
 *  - static assets
 *
 * Uses getUser() — validates the JWT against Supabase rather than just
 * reading the cookie. This is the authoritative check; cookie tampering
 * cannot fake a session.
 *
 * Note: route-group layouts (src/app/(app)/layout.tsx) also gate themselves
 * server-side via getUser() — this middleware is the first line of defense,
 * the layout is the second. Defense in depth.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isApiIngest(pathname)) return NextResponse.next();
  if (isStatic(pathname)) return NextResponse.next();

  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // getUser() refreshes the session if expired AND verifies the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
