import { requireAdminSession } from "@/lib/admin-auth";
import { parsePage, redirectIfStalePage } from "@/lib/admin-pagination";
import { getFacultyMetrics, listFacultiesPage, listNamedOptions } from "@/lib/admin-store";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { FacultyManager } from "@/components/faculty-manager";

export default async function FacultyPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireAdminSession();
  const requestedPage = parsePage((await searchParams).page);
  const [result, metrics, batches] = await Promise.all([
    listFacultiesPage(requestedPage),
    getFacultyMetrics(),
    listNamedOptions("batches"),
  ]);
  redirectIfStalePage("/admin/faculty", requestedPage, result.page);

  return (
    <AdminShell
      current="/admin/faculty"
      title="Faculty"
      description="Manage faculty on a dedicated page."
      metrics={[
        { label: "Total", value: metrics.total },
        { label: "Assignments", value: metrics.assignments },
      ]}
    >
      <SectionCard title="Faculty List" description="Faculty with assigned batches, branches, and courses. Add from the popup, then edit or delete with the row icons.">
        <FacultyManager result={result} batches={batches} />
      </SectionCard>
    </AdminShell>
  );
}
