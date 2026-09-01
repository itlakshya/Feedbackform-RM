import { requireAdminSession } from "@/lib/admin-auth";
import { parsePage, redirectIfStalePage } from "@/lib/admin-pagination";
import { getBatchMetrics, listBatchesPage, listNamedOptions } from "@/lib/admin-store";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { BatchesManager } from "@/components/batches-manager";

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireAdminSession();
  const requestedPage = parsePage((await searchParams).page);
  const [result, metrics, branches, courses] = await Promise.all([
    listBatchesPage(requestedPage),
    getBatchMetrics(),
    listNamedOptions("branches"),
    listNamedOptions("courses"),
  ]);
  redirectIfStalePage("/admin/batches", requestedPage, result.page);

  return (
    <AdminShell
      current="/admin/batches"
      title="Batches"
      description="Manage batches and batch assignments. New batches are active by default and can be changed to inactive later."
      metrics={[
        { label: "Total", value: metrics.total },
        { label: "Active", value: metrics.active },
        { label: "Students", value: metrics.students },
      ]}
    >
      <SectionCard title="Batch List" description="Existing batches and their status. Add a batch from the popup, then edit or delete with the row icons.">
        <BatchesManager result={result} branches={branches} courses={courses} />
      </SectionCard>
    </AdminShell>
  );
}
