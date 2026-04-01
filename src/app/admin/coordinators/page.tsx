import { createCoordinatorAction, deleteCoordinatorAction, updateCoordinatorAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, NameRow, SectionCard } from "@/components/admin-shell";

export default async function CoordinatorsPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/coordinators" title="Coordinators" description="Manage coordinators on a dedicated page." metrics={[{ label: "Total", value: store.coordinators.length }, { label: "Batches", value: store.batches.filter((b) => b.coordinatorId).length }]}>
      <SectionCard title="Add Coordinator" description="Create one coordinator at a time.">
        <form action={createCoordinatorAction} className="max-w-2xl space-y-3"><label className="block text-sm font-medium text-slate-700">Name</label><input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="name" placeholder="Coordinator name" required /><button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white" type="submit">Save</button></form>
      </SectionCard>
      <SectionCard title="Coordinator List" description="Existing coordinators.">
        <div className="space-y-3">{store.coordinators.map((item) => <NameRow key={item.id} item={item} updateAction={updateCoordinatorAction} deleteAction={deleteCoordinatorAction} />)}</div>
      </SectionCard>
    </AdminShell>
  );
}
