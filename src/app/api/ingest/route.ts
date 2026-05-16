import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { parseQnbSms } from "@/features/sms-ingest";
import { categorize } from "@/features/categorize";
import { createSupabaseAdminClient } from "@/shared/api/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  smsText: z.string().min(1),
  receivedAt: z.string().optional(),
  source: z.string().optional(),
});

const TAG = "[ingest]";

function log(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ tag: "ingest", event, ...fields });
  if (level === "error") console.error(`${TAG} ${line}`);
  else if (level === "warn") console.warn(`${TAG} ${line}`);
  else console.log(`${TAG} ${line}`);
}

function checkAuth(req: NextRequest): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) return { ok: false, reason: "INGEST_TOKEN env not set" };
  const header = req.headers.get("authorization") ?? "";
  if (!header) return { ok: false, reason: "missing Authorization header" };
  if (!header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, reason: "Authorization header missing Bearer prefix" };
  }
  const provided = header.slice(7).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false, reason: "token length mismatch" };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: "token mismatch" };
  return { ok: true };
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function POST(req: NextRequest) {
  const requestId =
    req.headers.get("x-vercel-id") ?? crypto.randomBytes(4).toString("hex");
  const contentType = req.headers.get("content-type") ?? "";
  const contentLength = req.headers.get("content-length") ?? "";
  const userAgent = req.headers.get("user-agent") ?? "";

  log("info", "start", { requestId, contentType, contentLength, userAgent });

  // ---------- AUTH ----------
  const auth = checkAuth(req);
  if (!auth.ok) {
    log("warn", "auth_failed", { requestId, reason: auth.reason });
    return NextResponse.json(
      { error: "unauthorized", detail: auth.reason },
      { status: 401 },
    );
  }
  log("info", "auth_ok", { requestId });

  // ---------- ENV ----------
  const userId = process.env.INGEST_USER_ID;
  if (!userId) {
    log("error", "missing_env", { requestId, env: "INGEST_USER_ID" });
    return NextResponse.json(
      { error: "server_misconfigured", detail: "INGEST_USER_ID env var is not set" },
      { status: 500 },
    );
  }

  // ---------- BODY PARSE ----------
  // Read raw text first so we can log a preview when JSON or schema validation fails.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    log("error", "read_body_failed", { requestId, error: String(err) });
    return NextResponse.json(
      { error: "cannot_read_body", detail: String(err) },
      { status: 400 },
    );
  }

  if (!rawBody) {
    log("warn", "empty_body", { requestId });
    return NextResponse.json(
      { error: "empty_body", detail: "request body was empty" },
      { status: 400 },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch (err) {
    log("warn", "invalid_json", {
      requestId,
      error: String(err),
      bodyPreview: rawBody.slice(0, 200),
    });
    return NextResponse.json(
      {
        error: "invalid_json",
        detail: "Request body is not valid JSON. Make sure the Shortcut sends Request Body as JSON, not Form.",
        bodyPreview: rawBody.slice(0, 200),
      },
      { status: 400 },
    );
  }

  // Log shape of what we received (without exposing the full SMS body in logs)
  if (parsedJson && typeof parsedJson === "object") {
    const keys = Object.keys(parsedJson as Record<string, unknown>);
    log("info", "body_received", { requestId, keys });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(parsedJson);
  } catch (err) {
    const zerr = err instanceof z.ZodError ? err.flatten() : { error: String(err) };
    log("warn", "validation_failed", {
      requestId,
      error: zerr,
      receivedKeys:
        parsedJson && typeof parsedJson === "object"
          ? Object.keys(parsedJson as Record<string, unknown>)
          : null,
    });
    return NextResponse.json(
      {
        error: "invalid_body",
        detail: zerr,
        hint: "Required: { smsText: string }. Optional: receivedAt (ISO), source.",
      },
      { status: 400 },
    );
  }

  log("info", "body_validated", {
    requestId,
    smsTextLen: body.smsText.length,
    hasReceivedAt: Boolean(body.receivedAt),
    source: body.source,
  });

  // ---------- SMS PARSE ----------
  const parsed = parseQnbSms(body.smsText);
  if (!parsed) {
    log("info", "sms_ignored", {
      requestId,
      reason: "not_a_qnb_transaction",
      preview: body.smsText.slice(0, 120),
    });
    return NextResponse.json(
      {
        status: "ignored",
        reason: "not_a_qnb_transaction",
        detail:
          "SMS did not contain the required markers ('تمت عملية شراء', 'المبلغ', 'الموقع') — likely an OTP, login alert, or non-purchase message.",
      },
      { status: 200 },
    );
  }

  log("info", "sms_parsed", {
    requestId,
    cardLastDigit: parsed.cardLastDigit,
    amountQar: parsed.amountQar,
    merchantRaw: parsed.merchantRaw,
    isApproximate: parsed.isApproximate,
    hasBalance: parsed.balanceQar != null,
  });

  const supabase = createSupabaseAdminClient();
  const smsHash = sha256(body.smsText);

  // ---------- DEDUP ----------
  const { data: existing, error: dedupErr } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("sms_hash", smsHash)
    .maybeSingle();

  if (dedupErr) {
    log("error", "dedup_lookup_failed", { requestId, error: dedupErr.message });
    return NextResponse.json(
      { error: "dedup_lookup_failed", detail: dedupErr.message },
      { status: 500 },
    );
  }

  if (existing?.id) {
    log("info", "deduped", { requestId, transactionId: existing.id });
    return NextResponse.json(
      { status: "ok", deduped: true, id: existing.id },
      { status: 200 },
    );
  }

  // ---------- CATEGORIZE ----------
  let categorizeResult: Awaited<ReturnType<typeof categorize>>;
  try {
    categorizeResult = await categorize(parsed.merchantRaw, { supabase, userId });
  } catch (err) {
    log("error", "categorize_failed", {
      requestId,
      merchant: parsed.merchantRaw,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "categorize_failed", detail: String(err) },
      { status: 500 },
    );
  }

  log("info", "categorized", {
    requestId,
    slug: categorizeResult.result.slug,
    source: categorizeResult.result.source,
    confidence: categorizeResult.result.confidence,
    merchantId: categorizeResult.merchantId,
  });

  // ---------- INSERT ----------
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", categorizeResult.result.slug)
    .single();

  if (!cat) {
    log("error", "category_not_found", {
      requestId,
      slug: categorizeResult.result.slug,
      hint: "Did you run the seed in migration 0001? Categories must exist before ingest.",
    });
    return NextResponse.json(
      {
        error: "category_not_found",
        detail: `No category with slug '${categorizeResult.result.slug}' for this user. Re-run the seed block in 0001_init.sql.`,
      },
      { status: 500 },
    );
  }

  const occurredAt = body.receivedAt ? new Date(body.receivedAt) : new Date();
  if (body.receivedAt && Number.isNaN(occurredAt.getTime())) {
    log("warn", "invalid_received_at", { requestId, receivedAt: body.receivedAt });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      occurred_at: (Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt).toISOString(),
      card_last_digit: parsed.cardLastDigit || null,
      amount_qar: parsed.amountQar,
      is_approximate: parsed.isApproximate,
      merchant_raw: parsed.merchantRaw,
      merchant_normalized: categorizeResult.normalized,
      merchant_id: categorizeResult.merchantId,
      category_id: cat.id,
      category_confidence: categorizeResult.result.confidence,
      balance_qar: parsed.balanceQar,
      raw_sms: body.smsText,
      sms_hash: smsHash,
    })
    .select("id")
    .single();

  if (insertErr) {
    log("error", "insert_failed", {
      requestId,
      error: insertErr.message,
      code: insertErr.code,
      hint: insertErr.hint,
    });
    return NextResponse.json(
      { error: "insert_failed", detail: insertErr.message, code: insertErr.code },
      { status: 500 },
    );
  }

  log("info", "ok", {
    requestId,
    transactionId: inserted!.id,
    merchant: parsed.merchantRaw,
    category: categorizeResult.result.slug,
    amountQar: parsed.amountQar,
  });

  return NextResponse.json(
    {
      status: "ok",
      transactionId: inserted!.id,
      merchant: parsed.merchantRaw,
      category: categorizeResult.result.slug,
      confidence: categorizeResult.result.confidence,
      source: categorizeResult.result.source,
      amountQar: parsed.amountQar,
    },
    { status: 201 },
  );
}
