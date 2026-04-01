import { createFacultyAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, FacultyRow, SectionCard } from "@/components/admin-shell";

export default async function FacultyPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/faculty" title="Faculty" description="Manage faculty on a dedicated page." metrics={[{ label: "Total", value: store.faculties.length }, { label: "Assignments", value: store.batches.reduce((sum, b) => sum + b.facultyIds.length, 0) }]}>
      <SectionCard title="Add Faculty" description="A faculty can be assigned to multiple batches. Branch and course are derived from the selected batches.">
        <form action={createFacultyAction} className="grid max-w-4xl gap-3 md:grid-cols-2"><input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="name" placeholder="Faculty name" required /><div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:col-span-2"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Assign batches</p><div className="mt-3 grid gap-3 md:grid-cols-2">{store.batches.map((batch) => <label key={batch.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><input type="checkbox" name="batchIds" value={batch.id} />{batch.name}</label>)}</div></div><button className="md:col-span-2 rounded-full bg-slate-950 px-6 py-3 font-semibold text-white" type="submit">Save</button></form>
      </SectionCard>
      <SectionCard title="Full Faculty List" description="Complete faculty list with assigned batch, branch, and course details.">
        <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Faculty Name</th>
                <th className="px-4 py-3 font-semibold">Batches</th>
                <th className="px-4 py-3 font-semibold">Branches</th>
                <th className="px-4 py-3 font-semibold">Courses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {store.faculties.map((faculty) => {
                const assignedBatches = store.batches.filter((batch) => batch.facultyIds.includes(faculty.id));
                const branchNames = Array.from(new Set(assignedBatches.map((batch) => store.branches.find((item) => item.id === batch.branchId)?.name).filter(Boolean)));
                const courseNames = Array.from(new Set(assignedBatches.map((batch) => store.courses.find((item) => item.id === batch.courseId)?.name).filter(Boolean)));
                return (
                  <tr key={faculty.id}>
                    <td className="px-4 py-3 font-medium text-slate-950">{faculty.name}</td>
                    <td className="px-4 py-3 text-slate-700">{assignedBatches.length > 0 ? assignedBatches.map((batch) => batch.name).join(", ") : "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{branchNames.length > 0 ? branchNames.join(", ") : "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{courseNames.length > 0 ? courseNames.join(", ") : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Edit Faculty" description="Update faculty names and batch assignments.">
        <div className="space-y-3">{store.faculties.map((faculty) => <FacultyRow key={faculty.id} faculty={faculty} batches={store.batches} branches={store.branches} courses={store.courses} />)}</div>
      </SectionCard>
    </AdminShell>
  );
}
