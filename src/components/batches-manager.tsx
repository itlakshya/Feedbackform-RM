"use client";

import { useState } from "react";
import { createBatchAction, deleteBatchAction, updateBatchAction } from "@/app/admin/actions";
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
import type { BatchListItem, BatchListPage, NamedOption } from "@/lib/admin-types";

type ModalKind = { type: "add" } | { type: "edit"; batch: BatchListItem } | { type: "delete"; batch: BatchListItem } | null;

function BatchForm({
  action,
  batch,
  branches,
  courses,
  submitLabel,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  batch?: BatchListItem;
  branches: NamedOption[];
  courses: NamedOption[];
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
      {batch ? <input type="hidden" name="id" value={batch.id} /> : null}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input className={fieldClassName} name="name" defaultValue={batch?.name} placeholder="Batch name" required autoFocus />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Branch</span>
        <select className={fieldClassName} name="branchId" defaultValue={batch?.branchId ?? ""} required>
          <option value="" disabled>Select branch</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Course</span>
        <select className={fieldClassName} name="courseId" defaultValue={batch?.courseId ?? ""} required>
          <option value="" disabled>Select course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </select>
      </label>
      {batch ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select className={fieldClassName} name="status" defaultValue={batch.status}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      ) : null}
      <FormActions onClose={onClose} submitLabel={submitLabel} />
    </form>
  );
}

export function BatchesManager({
  result,
  branches,
  courses,
}: {
  result: BatchListPage;
  branches: NamedOption[];
  courses: NamedOption[];
}) {
  const [modal, setModal] = useState<ModalKind>(null);
  const closeModal = () => setModal(null);

  return (
    <>
      <AddButton onClick={() => setModal({ type: "add" })}>Add Batch</AddButton>

      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">No batches yet. Use Add Batch to create one.</div>
      ) : (
        <div className="space-y-3">
          {result.items.map((batch) => (
            <div key={batch.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="font-medium text-slate-950">{batch.name}</p>
                <p className="mt-1 text-sm text-slate-600">{batch.branchName || "-"} · {batch.courseName || "-"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${batch.status === "active" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>
                  {batch.status}
                </span>
                <EditIconButton label={`Edit ${batch.name}`} onClick={() => setModal({ type: "edit", batch })} />
                <DeleteIconButton label={`Delete ${batch.name}`} onClick={() => setModal({ type: "delete", batch })} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ShowingCount result={result} />
      <AdminPagination basePath="/admin/batches" page={result.page} totalPages={result.totalPages} />

      {modal?.type === "add" ? (
        <AdminModal title="Add Batch" description="New batches start in active status." onClose={closeModal}>
          <BatchForm action={createBatchAction} branches={branches} courses={courses} submitLabel="Save" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "edit" ? (
        <AdminModal key={modal.batch.id} title="Edit Batch" description="Update the batch name, branch, course, or status." onClose={closeModal}>
          <BatchForm action={updateBatchAction} batch={modal.batch} branches={branches} courses={courses} submitLabel="Save changes" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "delete" ? (
        <AdminModal key={modal.batch.id} title="Delete Batch" description={`Delete “${modal.batch.name}”? This cannot be undone.`} onClose={closeModal}>
          <ConfirmDeleteForm id={modal.batch.id} action={deleteBatchAction} onClose={closeModal} />
        </AdminModal>
      ) : null}
    </>
  );
}
