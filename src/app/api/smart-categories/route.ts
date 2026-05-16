import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { translateToSmartCategory } from "@/features/create-smart-category";
import { listSmartCategories } from "@/entities/smart-category";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  prompt: z.string().min(3).max(400),
  name: z.string().max(60).optional(),
  emoji: z.string().max(8).optional(),
});

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const items = await listSmartCategories(supabase);
  return NextResponse.json({ items });
}

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

  const translation = await translateToSmartCategory(body.prompt);
  if (!translation) {
    return NextResponse.json(
      { error: "translation_failed", detail: "Couldn't turn that into a filter. Try rephrasing." },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("smart_categories")
    .insert({
      user_id: user.id,
      name: body.name?.trim() || translation.name,
      emoji: body.emoji || translation.emoji,
      prompt: body.prompt,
      filter: translation.filter,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ smartCategory: data }, { status: 201 });
}
