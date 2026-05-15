const qarFormatter = new Intl.NumberFormat("en-QA", {
  style: "currency",
  currency: "QAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qarCompactFormatter = new Intl.NumberFormat("en-QA", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatQar(amount: number, opts?: { compact?: boolean }): string {
  if (!Number.isFinite(amount)) return "QAR 0.00";
  if (opts?.compact) return `QAR ${qarCompactFormatter.format(amount)}`;
  return qarFormatter.format(amount);
}

export function formatDate(iso: string | Date, opts?: { time?: boolean }): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  if (opts?.time) {
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ARABIC_RANGE = /[؀-ۿ]/;
export function isArabic(s: string): boolean {
  return ARABIC_RANGE.test(s);
}
export function dirFor(s: string): "rtl" | "ltr" {
  return isArabic(s) ? "rtl" : "ltr";
}

/**
 * Strip noise from QNB merchant strings.
 *  - "UBER * PENDING" → "UBER"
 *  - "UBR* PENDING.UBER.COM" → "UBER"
 */
export function normalizeMerchant(raw: string): string {
  if (!raw) return "";
  let s = raw.trim().toUpperCase();
  if (/UBER|UBR/.test(s) && /PENDING/.test(s)) return "UBER";
  s = s
    .replace(/\.COM\b/g, "")
    .replace(/\bPENDING\b/g, "")
    .replace(/[*•·]+/g, " ")
    .replace(/\.{2,}$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

export function pctChange(current: number, prior: number): number | null {
  if (!prior) return null;
  return ((current - prior) / prior) * 100;
}
