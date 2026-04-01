import { createBatchAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, BatchRow, SectionCard } from "@/components/admin-shell";

export default async function BatchesPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/batches" title="Batches" description="Manage batches and batch assignments. New batches are active by default and can be changed to inactive later." metrics={[{ label: "Total", value: store.batches.length }, { label: "Active", value: store.batches.filter((batch) => batch.status === "active").length }, { label: "Students", value: store.batches.reduce((sum, batch) => sum + batch.strength, 0) }]}>
      <SectionCard title="Add Batch" description="Create one batch at a time. New batches start in active status.">
        <form action={createBatchAction} className="grid gap-4 lg:grid-cols-2"><input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="name" placeholder="Batch name" required /><select name="branchId" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" defaultValue="" required><option value="" disabled>Select branch</option>{store.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><select name="courseId" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" defaultValue="" required><option value="" disabled>Select course</option>{store.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><button className="lg:col-span-2 rounded-full bg-slate-950 px-6 py-3 font-semibold text-white" type="submit">Save batch</button></form>
      </SectionCard>
      <SectionCard title="Batch List" description="Existing batches and their status.">
        <div className="space-y-4">{store.batches.map((batch) => <BatchRow key={batch.id} batch={batch} branches={store.branches} courses={store.courses} />)}</div>
      </SectionCard>
    </AdminShell>
  );
}
