import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/api/supabase";

const PatchBody = z.object({
  hidden: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.hidden === "boolean") patch.hidden = body.hidden;
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok" });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: "ok" });
}
