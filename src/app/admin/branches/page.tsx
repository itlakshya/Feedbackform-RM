import { createBranchAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, NameRow, SectionCard } from "@/components/admin-shell";
import { deleteBranchAction, updateBranchAction } from "@/app/admin/actions";

export default async function BranchesPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/branches" title="Branches" description="Create, edit, and delete branches on a dedicated page." metrics={[{ label: "Total", value: store.branches.length }, { label: "Active Batches", value: store.batches.filter((batch) => batch.status === "active").length }]}>
      <SectionCard title="Add Branch" description="Create one branch at a time.">
        <form action={createBranchAction} className="max-w-2xl space-y-3"><label className="block text-sm font-medium text-slate-700">Name</label><input className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="name" placeholder="e.g. Commerce" required /><button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white" type="submit">Save</button></form>
      </SectionCard>
      <SectionCard title="Branch List" description="Existing branches.">
        <div className="space-y-3">{store.branches.map((item) => <NameRow key={item.id} item={item} updateAction={updateBranchAction} deleteAction={deleteBranchAction} />)}</div>
      </SectionCard>
    </AdminShell>
  );
}
