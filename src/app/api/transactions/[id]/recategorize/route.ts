import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { CATEGORY_SLUGS } from "@/shared/config";

const Body = z.object({
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  applyToMerchant: z.boolean().optional().default(true),
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

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("slug", body.categorySlug)
    .single();
  if (!cat) return NextResponse.json({ error: "category_not_found" }, { status: 404 });

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .update({
      category_id: cat.id,
      category_confidence: 1,
      user_corrected: true,
    })
    .eq("id", params.id)
    .select("id, merchant_normalized, merchant_id, merchant_raw")
    .single();
  if (txErr || !tx) {
    return NextResponse.json(
      { error: "tx_not_found", detail: txErr?.message },
      { status: 404 },
    );
  }

  if (body.applyToMerchant && tx.merchant_normalized) {
    await supabase.from("merchants").upsert(
      {
        user_id: user.id,
        normalized_name: tx.merchant_normalized,
        display_name: tx.merchant_raw,
        category_id: cat.id,
        confidence: 1,
        source: "manual",
        reasoning: "user correction",
      },
      { onConflict: "user_id,normalized_name" },
    );
  }

  return NextResponse.json({ status: "ok" });
}
