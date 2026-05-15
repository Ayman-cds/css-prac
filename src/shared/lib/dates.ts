import {
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  format as fnsFormat,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns";

export function monthRange(d: Date = new Date()) {
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

export function lastNDays(n: number, ref: Date = new Date()) {
  return { start: startOfDay(subDays(ref, n - 1)), end: endOfDay(ref) };
}

export function last12Months(ref: Date = new Date()) {
  const months = eachMonthOfInterval({
    start: startOfMonth(subMonths(ref, 11)),
    end: startOfMonth(ref),
  });
  return months.map((m) => ({
    start: startOfMonth(m),
    end: endOfMonth(m),
    key: fnsFormat(m, "yyyy-MM"),
    label: fnsFormat(m, "MMM yy"),
  }));
}

export function dayList(start: Date, end: Date) {
  return eachDayOfInterval({ start, end }).map((d) => ({
    key: fnsFormat(d, "yyyy-MM-dd"),
    label: fnsFormat(d, "d MMM"),
    date: d,
  }));
}

export function ymKey(d: Date): string {
  return fnsFormat(d, "yyyy-MM");
}

export function parseYm(ym: string | null | undefined): Date {
  if (!ym) return new Date();
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

export function prevMonth(d: Date): Date {
  return subMonths(d, 1);
}
