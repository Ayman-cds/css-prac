/**
 * Smoke test for the QNB SMS parser.
 * Run with: npm run test:parser
 */

import { parseQnbSms } from "../src/features/sms-ingest";
import { normalizeMerchant } from "../src/shared/lib";

type Case = {
  name: string;
  text: string;
  expect:
    | {
        cardLastDigit?: string;
        amountQar?: number;
        merchantContains?: string;
        normalizedTo?: string;
        approximate?: boolean;
        balanceQar?: number | null;
      }
    | null;
};

const cases: Case[] = [
  {
    name: "BRD ROTISERIE — Visa ·8",
    text: `تمت عملية شراء ببطاقة الائتمانية.
التفاصيل:
رقم البطاقة: فيزا8
المبلغ: QAR 736.00
الموقع: BRD ROTISERIE RESTAURA
الرصيد: QAR 3974.90
استخدم بطاقة QNB الائتمانية الخاصة بك واستمتع بمزايا فريدة.`,
    expect: {
      cardLastDigit: "8",
      amountQar: 736,
      merchantContains: "BRD ROTISERIE",
      balanceQar: 3974.9,
      approximate: false,
    },
  },
  {
    name: "UBER * PENDING — approximate, Visa ·9",
    text: `تمت عملية شراء ببطاقة الائتمانية.
التفاصيل:
رقم البطاقة: فيزا9
المبلغ: QAR 7.74 تقريباً
الموقع: UBER * PENDING
الرصيد: QAR 3866.16`,
    expect: {
      cardLastDigit: "9",
      amountQar: 7.74,
      merchantContains: "UBER",
      normalizedTo: "UBER",
      approximate: true,
    },
  },
  {
    name: "UBR* PENDING.UBER.COM normalizes to UBER",
    text: `تمت عملية شراء ببطاقة الائتمانية.
رقم البطاقة: فيزا9
المبلغ: QAR 7.84
الموقع: UBR* PENDING.UBER.COM
الرصيد: QAR 3854.85`,
    expect: {
      amountQar: 7.84,
      merchantContains: "UBR",
      normalizedTo: "UBER",
    },
  },
  {
    name: "SNOONU TRADING",
    text: `تمت عملية شراء ببطاقة الائتمانية.
رقم البطاقة: فيزا9
المبلغ: QAR 35.00
الموقع: SNOONU TRADING
الرصيد: QAR 3810.75`,
    expect: {
      amountQar: 35,
      merchantContains: "SNOONU",
    },
  },
  {
    name: "Truncated BATTERY...",
    text: `تمت عملية شراء ببطاقة الائتمانية.
رقم البطاقة: فيزا8
المبلغ: QAR 73.00
الموقع: BATTERY...
الرصيد: QAR 3737.75`,
    expect: { amountQar: 73, merchantContains: "BATTERY" },
  },
  {
    name: "USD (Noon) — converts to QAR, marks approximate",
    text: `تمت عملية شراء ببطاقة الائتمانية.\r\n التفاصيل: \r\nرقم البطاقة: فيزا8 \r\nالمبلغ: USD 35.74تقريباً \r\nالموقع: Noon\r\nالرصيد: QAR 1234.56`,
    expect: {
      cardLastDigit: "8",
      merchantContains: "Noon",
      approximate: true,
    },
  },
  {
    name: "Login notification — ignore",
    text: `تم تسجيل الدخول بنجاح في خدمة QNB المصرفية`,
    expect: null,
  },
  {
    name: "Marketing — ignore",
    text: `استفد من العروض الحصرية لبطاقات QNB.`,
    expect: null,
  },
];

let failed = 0;
for (const c of cases) {
  const got = parseQnbSms(c.text);
  const ok = (() => {
    if (c.expect === null) return got === null;
    if (got === null) return false;
    const e = c.expect;
    if (e.cardLastDigit && got.cardLastDigit !== e.cardLastDigit) return false;
    if (e.amountQar != null && Math.abs(got.amountQar - e.amountQar) > 0.001) return false;
    if (e.merchantContains && !got.merchantRaw.includes(e.merchantContains)) return false;
    if (e.normalizedTo && normalizeMerchant(got.merchantRaw) !== e.normalizedTo) return false;
    if (e.approximate != null && got.isApproximate !== e.approximate) return false;
    if (e.balanceQar !== undefined && got.balanceQar !== e.balanceQar) return false;
    return true;
  })();
  if (ok) {
    console.log(`✓ ${c.name}`);
  } else {
    failed++;
    console.error(`✗ ${c.name}`);
    console.error("  expected:", c.expect);
    console.error("  got:     ", got);
  }
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
} else {
  console.log(`\nAll ${cases.length} parser cases passed.`);
}
