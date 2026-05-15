import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { parseQnbSms } from "@/features/sms-ingest";
import { categorize } from "@/features/categorize";
import { createSupabaseAdminClient } from "@/shared/api/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  smsText: z.string().min(1),
  receivedAt: z.string().optional(),
  source: z.string().optional(),
});

function checkAuth(req: NextRequest): boolean {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  const provided = header.slice(7).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = process.env.INGEST_USER_ID;
  if (!userId) {
    return NextResponse.json(
      { error: "INGEST_USER_ID not configured" },
      { status: 500 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", detail: String(err) },
      { status: 400 },
    );
  }

  const parsed = parseQnbSms(body.smsText);
  if (!parsed) {
    return NextResponse.json(
      { status: "ignored", reason: "not_a_qnb_transaction" },
      { status: 200 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const smsHash = sha256(body.smsText);

  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("sms_hash", smsHash)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json(
      { status: "ok", deduped: true, id: existing.id },
      { status: 200 },
    );
  }

  const { result, normalized, merchantId } = await categorize(parsed.merchantRaw, {
    supabase,
    userId,
  });

  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", result.slug)
    .single();

  const occurredAt = body.receivedAt ? new Date(body.receivedAt) : new Date();

  const { data: inserted, error: insertErr } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      occurred_at: occurredAt.toISOString(),
      card_last_digit: parsed.cardLastDigit || null,
      amount_qar: parsed.amountQar,
      is_approximate: parsed.isApproximate,
      merchant_raw: parsed.merchantRaw,
      merchant_normalized: normalized,
      merchant_id: merchantId,
      category_id: cat?.id ?? null,
      category_confidence: result.confidence,
      balance_qar: parsed.balanceQar,
      raw_sms: body.smsText,
      sms_hash: smsHash,
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: "insert_failed", detail: insertErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      transactionId: inserted!.id,
      merchant: parsed.merchantRaw,
      category: result.slug,
      confidence: result.confidence,
      source: result.source,
      amountQar: parsed.amountQar,
    },
    { status: 201 },
  );
}
