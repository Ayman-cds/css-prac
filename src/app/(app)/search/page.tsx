import { SearchPage } from "@/views/search";
import type { SearchFilters } from "@/entities/transaction";

export const dynamic = "force-dynamic";

function toFilters(sp: Record<string, string | undefined>): SearchFilters {
  return {
    q: sp.q || undefined,
    categoryId: sp.categoryId || undefined,
    card: sp.card || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
    minAmount: sp.minAmount ? Number(sp.minAmount) : undefined,
    maxAmount: sp.maxAmount ? Number(sp.maxAmount) : undefined,
    onlyHidden: sp.onlyHidden === "true" ? true : undefined,
    includeHidden: sp.includeHidden === "true" ? true : undefined,
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return <SearchPage filters={toFilters(searchParams)} />;
}
