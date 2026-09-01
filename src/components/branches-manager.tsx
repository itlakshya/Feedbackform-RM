"use client";

import { useState } from "react";
import { createBranchAction, deleteBranchAction, updateBranchAction } from "@/app/admin/actions";
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
import type { AdminBranch, BranchListPage } from "@/lib/admin-types";

type ModalKind = { type: "add" } | { type: "edit"; branch: AdminBranch } | { type: "delete"; branch: AdminBranch } | null;

function BranchForm({
  action,
  branch,
  submitLabel,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  branch?: AdminBranch;
  submitLabel: string;
  onClose: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        await action(formData);
        onClose();
      }}
      className="space-y-4"
    >
      {branch ? <input type="hidden" name="id" value={branch.id} /> : null}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input className={fieldClassName} name="name" defaultValue={branch?.name} placeholder="e.g. Commerce" required autoFocus />
      </label>
      <FormActions onClose={onClose} submitLabel={submitLabel} />
    </form>
  );
}

export function BranchesManager({ result }: { result: BranchListPage }) {
  const [modal, setModal] = useState<ModalKind>(null);
  const closeModal = () => setModal(null);

  return (
    <>
      <AddButton onClick={() => setModal({ type: "add" })}>Add Branch</AddButton>

      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">No branches yet. Use Add Branch to create one.</div>
      ) : (
        <div className="space-y-3">
          {result.items.map((branch) => (
            <div key={branch.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-medium text-slate-950">{branch.name}</p>
              <div className="flex items-center gap-2">
                <EditIconButton label={`Edit ${branch.name}`} onClick={() => setModal({ type: "edit", branch })} />
                <DeleteIconButton label={`Delete ${branch.name}`} onClick={() => setModal({ type: "delete", branch })} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ShowingCount result={result} />
      <AdminPagination basePath="/admin/branches" page={result.page} totalPages={result.totalPages} />

      {modal?.type === "add" ? (
        <AdminModal title="Add Branch" description="Create one branch at a time." onClose={closeModal}>
          <BranchForm action={createBranchAction} submitLabel="Save" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "edit" ? (
        <AdminModal key={modal.branch.id} title="Edit Branch" description="Update the branch name." onClose={closeModal}>
          <BranchForm action={updateBranchAction} branch={modal.branch} submitLabel="Save changes" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "delete" ? (
        <AdminModal key={modal.branch.id} title="Delete Branch" description={`Delete “${modal.branch.name}”? Batches under this branch will also be removed.`} onClose={closeModal}>
          <ConfirmDeleteForm id={modal.branch.id} action={deleteBranchAction} onClose={closeModal} />
        </AdminModal>
      ) : null}
    </>
  );
}
