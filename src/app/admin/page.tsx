import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { parsePage, redirectIfStalePage } from "@/lib/admin-pagination";
import { getDashboardCounts, listActiveBatchesPage } from "@/lib/admin-store";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { AdminPagination, ShowingCount } from "@/components/admin-list-ui";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireAdminSession();
  const requestedPage = parsePage((await searchParams).page);
  const [counts, activeBatches] = await Promise.all([getDashboardCounts(), listActiveBatchesPage(requestedPage)]);
  redirectIfStalePage("/admin", requestedPage, activeBatches.page);

  return (
    <AdminShell
      current="/admin"
      title="Dashboard"
      description="Overview of the feedback administration system and shortcuts to each separate management page."
      metrics={[
        { label: "Branches", value: counts.branches },
        { label: "Courses", value: counts.courses },
        { label: "Batches", value: counts.batches },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5"><p className="text-xs uppercase tracking-[0.18em] text-blue-700">Top Option</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">Branch</h3><p className="mt-2 text-sm text-slate-600">Manage branches on a separate page.</p></div>
        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5"><p className="text-xs uppercase tracking-[0.18em] text-blue-700">Top Option</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">Course</h3><p className="mt-2 text-sm text-slate-600">Manage courses separately before creating batches.</p></div>
        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5"><p className="text-xs uppercase tracking-[0.18em] text-blue-700">Top Option</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">Batch</h3><p className="mt-2 text-sm text-slate-600">Manage active and inactive batches separately.</p></div>
      </section>

      <SectionCard title="Current Status" description="Quick system overview.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Faculty</p><p className="mt-2 text-2xl font-semibold text-slate-950">{counts.faculties}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Coordinators</p><p className="mt-2 text-2xl font-semibold text-slate-950">{counts.coordinators}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Mentors</p><p className="mt-2 text-2xl font-semibold text-slate-950">{counts.mentors}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Questions</p><p className="mt-2 text-2xl font-semibold text-slate-950">{counts.questions}</p></div>
        </div>
      </SectionCard>

      <SectionCard title="Batch Status" description="Batches currently available on the public feedback page.">
        {activeBatches.total === 0 ? (
          <p className="text-sm text-slate-600">No active batches available.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {activeBatches.items.map((batch) => (
                <div key={batch.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                  <p className="text-xl font-semibold text-slate-950">{batch.name}</p>
                </div>
              ))}
            </div>
            <ShowingCount result={activeBatches} />
            <AdminPagination basePath="/admin" page={activeBatches.page} totalPages={activeBatches.totalPages} />
          </>
        )}
      </SectionCard>

      <SectionCard title="Quick Links" description="Open each admin page directly.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["/admin/branches", "Branches"],
            ["/admin/courses", "Courses"],
            ["/admin/batches", "Batches"],
            ["/admin/faculty", "Faculty"],
            ["/admin/coordinators", "Coordinators"],
            ["/admin/mentors", "Mentors"],
            ["/admin/bulk-upload", "Bulk Upload"],
            ["/admin/questions", "Questions"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-semibold text-slate-900 transition hover:border-blue-300 hover:bg-blue-50">{label}</Link>
          ))}
        </div>
      </SectionCard>
    </AdminShell>
  );
}
