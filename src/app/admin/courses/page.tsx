import { createCourseAction, deleteCourseAction, updateCourseAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, NameRow, SectionCard } from "@/components/admin-shell";

export default async function CoursesPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/courses" title="Courses" description="Create, edit, and delete courses on a dedicated page." metrics={[{ label: "Total", value: store.courses.length }, { label: "Batches", value: store.batches.length }]}>
      <SectionCard title="Add Course" description="Create one course at a time.">
        <form action={createCourseAction} className="max-w-2xl space-y-3"><label className="block text-sm font-medium text-slate-700">Name</label><input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="name" placeholder="e.g. BCA" required /><button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white" type="submit">Save</button></form>
      </SectionCard>
      <SectionCard title="Course List" description="Existing courses.">
        <div className="space-y-3">{store.courses.map((item) => <NameRow key={item.id} item={item} updateAction={updateCourseAction} deleteAction={deleteCourseAction} />)}</div>
      </SectionCard>
    </AdminShell>
  );
}
