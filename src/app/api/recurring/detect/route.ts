import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { detectRecurring } from "@/features/recurring-detection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await detectRecurring(supabase, user.id);
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return NextResponse.json(
      { error: "detection_failed", detail: String(err) },
      { status: 500 },
    );
  }
}
