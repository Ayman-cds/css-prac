import { MonthlyPage } from "@/views/monthly";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  return <MonthlyPage ym={searchParams.m} />;
}
