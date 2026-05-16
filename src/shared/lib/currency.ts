/**
 * Approximate FX rates → QAR. Updated periodically by hand; no live API
 * to avoid an extra network call on every ingest. Foreign-currency
 * transactions get is_approximate=true to flag the conversion.
 *
 * Last manual update: 2026-05
 */
export const RATES_TO_QAR: Record<string, number> = {
  QAR: 1,
  USD: 3.64,
  EUR: 4.0,
  GBP: 4.6,
  AED: 0.99,
  SAR: 0.97,
  KWD: 11.83,
  BHD: 9.66,
  OMR: 9.45,
  INR: 0.044,
  PKR: 0.013,
  EGP: 0.075,
  TRY: 0.1,
  THB: 0.1,
  JPY: 0.024,
  CNY: 0.51,
  CAD: 2.7,
  AUD: 2.4,
  CHF: 4.1,
  SGD: 2.75,
  HKD: 0.47,
  MYR: 0.78,
};

/**
 * Convert any amount to QAR. Unknown currencies fall back to the original
 * amount (rate=1) with `unknown=true` so callers can flag/log.
 */
export function convertToQar(
  amount: number,
  currency: string,
): { qar: number; rate: number; unknown: boolean } {
  const code = currency.toUpperCase().trim();
  const rate = RATES_TO_QAR[code];
  if (rate == null) {
    return { qar: amount, rate: 1, unknown: true };
  }
  // Round to 2dp to match all other amounts
  return { qar: Math.round(amount * rate * 100) / 100, rate, unknown: false };
}
