import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { BulkUploadForm } from "@/components/bulk-upload-form";

export default async function BulkUploadPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/bulk-upload" title="Bulk Upload" description="Upload one CSV file using branch, course, batch, and one or more faculty columns." metrics={[{ label: "Rows Ready", value: store.batches.length }, { label: "Faculty", value: store.faculties.length }]}>
      <SectionCard title="CSV Import" description="Use one CSV file for branch, course, batch, and faculty mapping. Add Faculty1, Faculty2, Faculty3, and more columns when a batch has multiple faculties.">
        <BulkUploadForm />
      </SectionCard>
      <SectionCard title="Import Order" description="Required CSV fields only.">
        <div className="space-y-2 text-sm text-slate-700">
          <p>1. Branch</p>
          <p>2. Course</p>
          <p>3. Batch</p>
          <p>4. Faculty1, Faculty2, Faculty3, and so on</p>
          <p className="pt-2 text-slate-600">Keep one row per branch, course, and batch. Put extra faculty names in additional Faculty columns. Empty faculty cells are ignored. Existing branch, course, batch, and faculty names are reused.</p>
        </div>
      </SectionCard>
    </AdminShell>
  );
}
