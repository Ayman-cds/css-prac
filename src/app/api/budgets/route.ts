import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/api/supabase";

const Body = z.object({
  categoryId: z.string().nullable(),
  monthlyLimit: z.number().nullable(),
});

export async function POST(req: NextRequest) {
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

  if (body.monthlyLimit == null) {
    await supabase
      .from("budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("category_id", body.categoryId ?? "");
    return NextResponse.json({ status: "ok" });
  }

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      category_id: body.categoryId,
      monthly_limit: body.monthlyLimit,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
