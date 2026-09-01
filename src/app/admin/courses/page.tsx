import { requireAdminSession } from "@/lib/admin-auth";
import { parsePage, redirectIfStalePage } from "@/lib/admin-pagination";
import { countBatches, listCoursesPage } from "@/lib/admin-store";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { CoursesManager } from "@/components/courses-manager";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireAdminSession();
  const requestedPage = parsePage((await searchParams).page);
  const [result, batches] = await Promise.all([listCoursesPage(requestedPage), countBatches()]);
  redirectIfStalePage("/admin/courses", requestedPage, result.page);

  return (
    <AdminShell
      current="/admin/courses"
      title="Courses"
      description="Create, edit, and delete courses on a dedicated page."
      metrics={[
        { label: "Total", value: result.total },
        { label: "Batches", value: batches },
      ]}
    >
      <SectionCard title="Course List" description="Existing courses. Add a course from the popup, then edit or delete with the row icons.">
        <CoursesManager result={result} />
      </SectionCard>
    </AdminShell>
  );
}
