import Link from "next/link";
import { Card } from "@/shared/ui/card";
import { TransactionList } from "@/entities/transaction";
import type { TransactionWithCategory } from "@/entities/transaction";

export function RecentTransactionsCard({
  transactions,
}: {
  transactions: TransactionWithCategory[];
}) {
  return (
    <Card
      title="Recent"
      hint={`${transactions.length} latest`}
      action={
        <Link
          href="/search"
          className="text-[12px] font-medium text-accent hover:underline"
        >
          See all →
        </Link>
      }
    >
      <TransactionList transactions={transactions} />
    </Card>
  );
}
