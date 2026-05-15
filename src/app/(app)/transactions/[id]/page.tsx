import { TransactionDetailPage } from "@/views/transaction-detail";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  return <TransactionDetailPage id={params.id} />;
}
