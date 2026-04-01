import { createMentorAction, deleteMentorAction, updateMentorAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, NameRow, SectionCard } from "@/components/admin-shell";

export default async function MentorsPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/mentors" title="Mentors" description="Manage mentors on a dedicated page." metrics={[{ label: "Total", value: store.mentors.length }, { label: "Batches", value: store.batches.filter((b) => b.mentorId).length }]}>
      <SectionCard title="Add Mentor" description="Create one mentor at a time.">
        <form action={createMentorAction} className="max-w-2xl space-y-3"><label className="block text-sm font-medium text-slate-700">Name</label><input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="name" placeholder="Mentor name" required /><button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white" type="submit">Save</button></form>
      </SectionCard>
      <SectionCard title="Mentor List" description="Existing mentors.">
        <div className="space-y-3">{store.mentors.map((item) => <NameRow key={item.id} item={item} updateAction={updateMentorAction} deleteAction={deleteMentorAction} />)}</div>
      </SectionCard>
    </AdminShell>
  );
}
