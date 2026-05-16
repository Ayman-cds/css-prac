import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { mergeMerchants } from "@/features/merge-merchants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  targetMerchantId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  try {
    const result = await mergeMerchants(
      supabase,
      user.id,
      params.id,
      body.targetMerchantId,
    );
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return NextResponse.json(
      { error: "merge_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
