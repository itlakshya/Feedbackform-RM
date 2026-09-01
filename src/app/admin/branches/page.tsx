import { requireAdminSession } from "@/lib/admin-auth";
import { parsePage, redirectIfStalePage } from "@/lib/admin-pagination";
import { countActiveBatches, listBranchesPage } from "@/lib/admin-store";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { BranchesManager } from "@/components/branches-manager";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireAdminSession();
  const requestedPage = parsePage((await searchParams).page);
  const [result, activeBatches] = await Promise.all([listBranchesPage(requestedPage), countActiveBatches()]);
  redirectIfStalePage("/admin/branches", requestedPage, result.page);

  return (
    <AdminShell
      current="/admin/branches"
      title="Branches"
      description="Create, edit, and delete branches on a dedicated page."
      metrics={[
        { label: "Total", value: result.total },
        { label: "Active Batches", value: activeBatches },
      ]}
    >
      <SectionCard title="Branch List" description="Existing branches. Add a branch from the popup, then edit or delete with the row icons.">
        <BranchesManager result={result} />
      </SectionCard>
    </AdminShell>
  );
}
