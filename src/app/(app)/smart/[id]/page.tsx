import { SmartCategoryDetailPage } from "@/views/smart-category-detail";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  return <SmartCategoryDetailPage id={params.id} />;
}
