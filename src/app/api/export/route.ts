import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/shared/api/supabase";
import { toCsv } from "@/shared/lib";

export const dynamic = "force-dynamic";

type ExportRow = {
  occurred_at: string;
  card_last_digit: string | null;
  amount_qar: number;
  is_approximate: boolean;
  merchant_raw: string;
  merchant_normalized: string;
  balance_qar: number | null;
  notes: string | null;
  user_corrected: boolean;
  hidden?: boolean;
  categories: { slug: string; name: string } | null;
};

let _hasHiddenColumn: boolean | null = null;
async function hasHiddenColumn(supabase: SupabaseClient): Promise<boolean> {
  if (_hasHiddenColumn !== null) return _hasHiddenColumn;
  const { error } = await supabase
    .from("transactions")
    .select("hidden", { count: "exact", head: true });
  _hasHiddenColumn = !(error && (error.code === "42703" || /hidden/i.test(error.message ?? "")));
  return _hasHiddenColumn;
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supports = await hasHiddenColumn(supabase);
  const includeHidden = req.nextUrl.searchParams.get("includeHidden") === "true";

  const baseSelect =
    "occurred_at, card_last_digit, amount_qar, is_approximate, merchant_raw, merchant_normalized, balance_qar, notes, user_corrected, categories(slug, name)";
  const selectStr = supports ? `${baseSelect}, hidden` : baseSelect;

  let q = supabase
    .from("transactions")
    .select(selectStr)
    .order("occurred_at", { ascending: false });
  if (supports && !includeHidden) q = q.eq("hidden", false);

  const { data: rows } = await q;

  const flat = ((rows ?? []) as unknown as ExportRow[]).map((r) => ({
    occurred_at: r.occurred_at,
    card: r.card_last_digit ? `visa_${r.card_last_digit}` : "",
    amount_qar: r.amount_qar,
    is_approximate: r.is_approximate ? "true" : "false",
    merchant: r.merchant_raw,
    merchant_normalized: r.merchant_normalized,
    category: r.categories?.name ?? "",
    category_slug: r.categories?.slug ?? "",
    balance_qar: r.balance_qar ?? "",
    notes: r.notes ?? "",
    user_corrected: r.user_corrected ? "true" : "false",
    hidden: r.hidden ? "true" : "false",
  }));

  const csv = toCsv(flat, [
    { key: "occurred_at", header: "occurred_at" },
    { key: "card", header: "card" },
    { key: "amount_qar", header: "amount_qar" },
    { key: "is_approximate", header: "is_approximate" },
    { key: "merchant", header: "merchant" },
    { key: "merchant_normalized", header: "merchant_normalized" },
    { key: "category", header: "category" },
    { key: "category_slug", header: "category_slug" },
    { key: "balance_qar", header: "balance_qar" },
    { key: "notes", header: "notes" },
    { key: "user_corrected", header: "user_corrected" },
    { key: "hidden", header: "hidden" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="qnb-transactions.csv"`,
    },
  });
}
