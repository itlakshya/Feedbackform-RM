import Link from "next/link";
import { readAdminStore } from "@/lib/admin-store";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell, SectionCard } from "@/components/admin-shell";

export default async function AdminDashboardPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  const activeBatches = store.batches.filter((batch) => batch.status === "active");

  return (
    <AdminShell
      current="/admin"
      title="Dashboard"
      description="Overview of the feedback administration system and shortcuts to each separate management page."
      metrics={[
        { label: "Branches", value: store.branches.length },
        { label: "Courses", value: store.courses.length },
        { label: "Batches", value: store.batches.length },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5"><p className="text-xs uppercase tracking-[0.18em] text-blue-700">Top Option</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">Branch</h3><p className="mt-2 text-sm text-slate-600">Manage branches on a separate page.</p></div>
        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5"><p className="text-xs uppercase tracking-[0.18em] text-blue-700">Top Option</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">Course</h3><p className="mt-2 text-sm text-slate-600">Manage courses separately before creating batches.</p></div>
        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5"><p className="text-xs uppercase tracking-[0.18em] text-blue-700">Top Option</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">Batch</h3><p className="mt-2 text-sm text-slate-600">Manage active and inactive batches separately.</p></div>
      </section>

      <SectionCard title="Current Status" description="Quick system overview.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Faculty</p><p className="mt-2 text-2xl font-semibold text-slate-950">{store.faculties.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Coordinators</p><p className="mt-2 text-2xl font-semibold text-slate-950">{store.coordinators.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Mentors</p><p className="mt-2 text-2xl font-semibold text-slate-950">{store.mentors.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">Questions</p><p className="mt-2 text-2xl font-semibold text-slate-950">{store.questions.length}</p></div>
        </div>
      </SectionCard>

      <SectionCard title="Batch Status" description="Batches currently available on the public feedback page.">
        {activeBatches.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">{activeBatches.map((batch) => <div key={batch.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700"><p className="text-xl font-semibold text-slate-950">{batch.name}</p></div>)}</div>
        ) : (
          <p className="text-sm text-slate-600">No active batches available.</p>
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
