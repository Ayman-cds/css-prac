// Server-only barrel. Do NOT import from this in "use client" components —
// it pulls in next/headers via server.ts. Client components must import the
// browser client directly from "./client".
export { createSupabaseServerClient } from "./server";
export { createSupabaseAdminClient } from "./admin";
