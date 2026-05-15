import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { sseResponse } from "@/shared/lib";
import {
  fetchMerchantsForScope,
  reanalyzeMerchant,
} from "@/features/reanalyze-merchants/model/reanalyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  scope: z.enum(["low-confidence", "all-except-corrected", "everything"]),
  offset: z.number().int().min(0).optional().default(0),
  chunk: z.number().int().min(1).max(50).optional().default(25),
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

  return sseResponse(async function* () {
    const all = await fetchMerchantsForScope(supabase, user.id, body.scope);
    const total = all.length;
    const slice = all.slice(body.offset, body.offset + body.chunk);
    const nextOffset = body.offset + slice.length;

    yield { event: "start", data: { total, offset: body.offset, chunk: slice.length } };

    let merchantsProcessed = 0;
    let transactionsUpdated = 0;
    let changedCategory = 0;

    for (const m of slice) {
      try {
        const { newSlug, changed, transactionsUpdated: tu } = await reanalyzeMerchant(
          supabase,
          user.id,
          m,
        );
        merchantsProcessed++;
        transactionsUpdated += tu;
        if (changed) changedCategory++;
        yield {
          event: "progress",
          data: {
            done: body.offset + merchantsProcessed,
            total,
            merchant: m.display_name,
            previousCategory: m.current_category_slug,
            newCategory: newSlug,
            changed,
          },
        };
      } catch (err) {
        yield {
          event: "progress",
          data: {
            done: body.offset + merchantsProcessed,
            total,
            merchant: m.display_name,
            error: String(err),
            changed: false,
          },
        };
      }
    }

    yield {
      event: "done",
      data: {
        merchantsProcessed,
        transactionsUpdated,
        changedCategory,
        nextOffset,
        hasMore: nextOffset < total,
        total,
      },
    };
  });
}
