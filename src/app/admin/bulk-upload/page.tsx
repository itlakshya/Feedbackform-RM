import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { BulkUploadForm } from "@/components/bulk-upload-form";

export default async function BulkUploadPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/bulk-upload" title="Bulk Upload" description="Upload one CSV file using only branch, course, batch, and faculty name." metrics={[{ label: "Rows Ready", value: store.batches.length }, { label: "Faculty", value: store.faculties.length }]}>
      <SectionCard title="CSV Import" description="Use one CSV file for branch, course, batch, and faculty mapping.">
        <BulkUploadForm />
      </SectionCard>
      <SectionCard title="Import Order" description="Required CSV fields only.">
        <div className="space-y-2 text-sm text-slate-700"><p>1. Branch</p><p>2. Course</p><p>3. Batch</p><p>4. Faculty</p><p className="pt-2 text-slate-600">Existing branch, course, and batch names are reused. New names are created only when they are not already available in the portal.</p></div>
      </SectionCard>
    </AdminShell>
  );
}
