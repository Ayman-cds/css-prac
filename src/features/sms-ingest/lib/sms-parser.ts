export type ParsedSms = {
  cardLastDigit: string;
  amountQar: number;
  isApproximate: boolean;
  merchantRaw: string;
  balanceQar: number | null;
};

/**
 * Parse a QNB Arabic credit-card transaction SMS.
 *
 * Returns null for any message that isn't a purchase confirmation
 * (login notifications, OTPs, marketing).
 *
 * Expected format:
 *   تمت عملية شراء ببطاقة الائتمانية.
 *   التفاصيل:
 *   رقم البطاقة: فيزا[N]
 *   المبلغ: QAR [AMOUNT][ تقريباً]?
 *   الموقع: [MERCHANT]
 *   الرصيد: QAR [BALANCE]
 */
export function parseQnbSms(text: string): ParsedSms | null {
  if (!text || typeof text !== "string") return null;
  if (!text.includes("تمت عملية شراء")) return null;
  if (!text.includes("المبلغ")) return null;
  if (!text.includes("الموقع")) return null;

  const cardMatch = text.match(/رقم\s*البطاقة\s*[:：]?\s*فيزا\s*(\d)/u);
  const amountMatch = text.match(/المبلغ\s*[:：]?\s*QAR\s*([\d,]+(?:\.\d+)?)/u);
  const merchantMatch = text.match(/الموقع\s*[:：]?\s*(.+?)(?=\s*(?:\n|\r|الرصيد))/us);
  const balanceMatch = text.match(/الرصيد\s*[:：]?\s*QAR\s*([\d,]+(?:\.\d+)?)/u);

  if (!amountMatch || !merchantMatch) return null;

  const amountLine = text.match(/المبلغ[^\n]*/u)?.[0] ?? "";
  const isApproximate = /تقريباً|تقريبا/.test(amountLine);

  const amountQar = parseFloat(amountMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(amountQar) || amountQar <= 0) return null;

  const merchantRaw = merchantMatch[1].trim().replace(/\s+/g, " ");
  if (!merchantRaw) return null;

  const balanceQar = balanceMatch
    ? parseFloat(balanceMatch[1].replace(/,/g, ""))
    : null;

  return {
    cardLastDigit: cardMatch?.[1] ?? "",
    amountQar,
    isApproximate,
    merchantRaw,
    balanceQar: balanceQar !== null && Number.isFinite(balanceQar) ? balanceQar : null,
  };
}
