import { convertToQar } from "@/shared/lib/currency";

export type ParsedSms = {
  cardLastDigit: string;
  /** Amount in QAR (converted from the original currency if needed). */
  amountQar: number;
  /**
   * Original currency code as it appeared in the SMS. "QAR" for native
   * transactions; "USD", "EUR", etc. for foreign-currency charges.
   */
  originalCurrency: string;
  /** Original amount in the source currency (pre-conversion). */
  originalAmount: number;
  isApproximate: boolean;
  merchantRaw: string;
  /** Balance in QAR. Null if missing. */
  balanceQar: number | null;
};

/**
 * Parse a QNB Arabic credit-card purchase SMS.
 *
 *  - Required markers: تمت عملية شراء + المبلغ + الموقع
 *  - Amount may be in any 3-letter currency (QAR, USD, EUR, AED, …);
 *    non-QAR amounts are converted via a static rate table (see
 *    shared/lib/currency.ts) and marked is_approximate=true.
 *  - "تقريباً" anywhere on the amount line also forces is_approximate.
 *  - Returns null for OTPs / login alerts / marketing.
 */
export function parseQnbSms(text: string): ParsedSms | null {
  if (!text || typeof text !== "string") return null;
  if (!text.includes("تمت عملية شراء")) return null;
  if (!text.includes("المبلغ")) return null;
  if (!text.includes("الموقع")) return null;

  const cardMatch = text.match(/رقم\s*البطاقة\s*[:：]?\s*فيزا\s*(\d)/u);

  // Accept any 3-letter currency code, not just QAR. Currency code may
  // butt right up against the amount (e.g. "USD 35.74" or "USD35.74").
  const amountMatch = text.match(
    /المبلغ\s*[:：]?\s*([A-Z]{3})\s*([\d,]+(?:\.\d+)?)/u,
  );
  const merchantMatch = text.match(
    /الموقع\s*[:：]?\s*(.+?)(?=\s*(?:\n|\r|الرصيد))/us,
  );
  // Balance may also be in a foreign currency in rare cases.
  const balanceMatch = text.match(
    /الرصيد\s*[:：]?\s*([A-Z]{3})\s*([\d,]+(?:\.\d+)?)/u,
  );

  if (!amountMatch || !merchantMatch) return null;

  const originalCurrency = amountMatch[1].toUpperCase();
  const originalAmount = parseFloat(amountMatch[2].replace(/,/g, ""));
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) return null;

  const { qar: amountQar, unknown: unknownAmountCurrency } = convertToQar(
    originalAmount,
    originalCurrency,
  );

  // is_approximate fires when the SMS itself flagged the amount as
  // approximate OR we did a currency conversion (rates aren't live).
  const amountLine = text.match(/المبلغ[^\n]*/u)?.[0] ?? "";
  const smsApproximate = /تقريباً|تقريبا/.test(amountLine);
  const conversionApproximate = originalCurrency !== "QAR";
  const isApproximate = smsApproximate || conversionApproximate;

  const merchantRaw = merchantMatch[1].trim().replace(/\s+/g, " ");
  if (!merchantRaw) return null;

  let balanceQar: number | null = null;
  if (balanceMatch) {
    const balCurrency = balanceMatch[1].toUpperCase();
    const balAmount = parseFloat(balanceMatch[2].replace(/,/g, ""));
    if (Number.isFinite(balAmount)) {
      const { qar } = convertToQar(balAmount, balCurrency);
      balanceQar = qar;
    }
  }

  if (unknownAmountCurrency) {
    console.warn(
      `[sms-parser] unknown currency '${originalCurrency}' — storing as-is (rate=1). Add to RATES_TO_QAR.`,
    );
  }

  return {
    cardLastDigit: cardMatch?.[1] ?? "",
    amountQar,
    originalCurrency,
    originalAmount,
    isApproximate,
    merchantRaw,
    balanceQar: balanceQar !== null && Number.isFinite(balanceQar) ? balanceQar : null,
  };
}
