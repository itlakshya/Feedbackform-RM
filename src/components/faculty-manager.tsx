"use client";

import { useState } from "react";
import { createFacultyAction, deleteFacultyAction, updateFacultyAction } from "@/app/admin/actions";
import {
  AddButton,
  AdminModal,
  AdminPagination,
  ConfirmDeleteForm,
  DeleteIconButton,
  EditIconButton,
  fieldClassName,
  FormActions,
  ShowingCount,
} from "@/components/admin-list-ui";
import type { FacultyListItem, FacultyListPage, NamedOption } from "@/lib/admin-types";

type ModalKind = { type: "add" } | { type: "edit"; faculty: FacultyListItem } | { type: "delete"; faculty: FacultyListItem } | null;

function FacultyForm({
  action,
  faculty,
  batches,
  submitLabel,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  faculty?: FacultyListItem;
  batches: NamedOption[];
  submitLabel: string;
  onClose: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        if (formData.getAll("batchIds").length === 0) return;
        await action(formData);
        onClose();
      }}
      className="space-y-4"
    >
      {faculty ? <input type="hidden" name="id" value={faculty.id} /> : null}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input className={fieldClassName} name="name" defaultValue={faculty?.name} placeholder="Faculty name" required autoFocus />
      </label>
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Assign batches</p>
        <p className="mt-1 text-sm text-slate-600">Select at least one batch. Branch and course come from the selected batches.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {batches.length === 0 ? (
            <p className="text-sm text-slate-600">No batches available. Create a batch first.</p>
          ) : (
            batches.map((batch) => (
              <label key={batch.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" name="batchIds" value={batch.id} defaultChecked={faculty?.batchIds.includes(batch.id)} />
                {batch.name}
              </label>
            ))
          )}
        </div>
      </div>
      <FormActions onClose={onClose} submitLabel={submitLabel} />
    </form>
  );
}

export function FacultyManager({ result, batches }: { result: FacultyListPage; batches: NamedOption[] }) {
  const [modal, setModal] = useState<ModalKind>(null);
  const closeModal = () => setModal(null);

  return (
    <>
      <AddButton onClick={() => setModal({ type: "add" })}>Add Faculty</AddButton>

      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">No faculty yet. Use Add Faculty to create one.</div>
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Faculty Name</th>
                <th className="px-4 py-3 font-semibold">Batches</th>
                <th className="px-4 py-3 font-semibold">Branches</th>
                <th className="px-4 py-3 font-semibold">Courses</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {result.items.map((faculty) => (
                <tr key={faculty.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">{faculty.name}</td>
                  <td className="px-4 py-3 text-slate-700">{faculty.batchNames.length > 0 ? faculty.batchNames.join(", ") : "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{faculty.branchNames.length > 0 ? faculty.branchNames.join(", ") : "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{faculty.courseNames.length > 0 ? faculty.courseNames.join(", ") : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <EditIconButton label={`Edit ${faculty.name}`} onClick={() => setModal({ type: "edit", faculty })} />
                      <DeleteIconButton label={`Delete ${faculty.name}`} onClick={() => setModal({ type: "delete", faculty })} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ShowingCount result={result} />
      <AdminPagination basePath="/admin/faculty" page={result.page} totalPages={result.totalPages} />

      {modal?.type === "add" ? (
        <AdminModal title="Add Faculty" description="A faculty can be assigned to multiple batches." size="lg" onClose={closeModal}>
          <FacultyForm action={createFacultyAction} batches={batches} submitLabel="Save" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "edit" ? (
        <AdminModal key={modal.faculty.id} title="Edit Faculty" description="Update the faculty name and batch assignments." size="lg" onClose={closeModal}>
          <FacultyForm action={updateFacultyAction} faculty={modal.faculty} batches={batches} submitLabel="Save changes" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "delete" ? (
        <AdminModal key={modal.faculty.id} title="Delete Faculty" description={`Delete “${modal.faculty.name}”? Batch assignments will be removed.`} onClose={closeModal}>
          <ConfirmDeleteForm id={modal.faculty.id} action={deleteFacultyAction} onClose={closeModal} />
        </AdminModal>
      ) : null}
    </>
  );
}
