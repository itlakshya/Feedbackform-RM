"use client";

import { useState } from "react";
import { createCourseAction, deleteCourseAction, updateCourseAction } from "@/app/admin/actions";
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
import type { AdminCourse, CourseListPage } from "@/lib/admin-types";

type ModalKind = { type: "add" } | { type: "edit"; course: AdminCourse } | { type: "delete"; course: AdminCourse } | null;

function CourseForm({
  action,
  course,
  submitLabel,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  course?: AdminCourse;
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
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input className={fieldClassName} name="name" defaultValue={course?.name} placeholder="e.g. BCA" required autoFocus />
      </label>
      <FormActions onClose={onClose} submitLabel={submitLabel} />
    </form>
  );
}

export function CoursesManager({ result }: { result: CourseListPage }) {
  const [modal, setModal] = useState<ModalKind>(null);
  const closeModal = () => setModal(null);

  return (
    <>
      <AddButton onClick={() => setModal({ type: "add" })}>Add Course</AddButton>

      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">No courses yet. Use Add Course to create one.</div>
      ) : (
        <div className="space-y-3">
          {result.items.map((course) => (
            <div key={course.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-medium text-slate-950">{course.name}</p>
              <div className="flex items-center gap-2">
                <EditIconButton label={`Edit ${course.name}`} onClick={() => setModal({ type: "edit", course })} />
                <DeleteIconButton label={`Delete ${course.name}`} onClick={() => setModal({ type: "delete", course })} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ShowingCount result={result} />
      <AdminPagination basePath="/admin/courses" page={result.page} totalPages={result.totalPages} />

      {modal?.type === "add" ? (
        <AdminModal title="Add Course" description="Create one course at a time." onClose={closeModal}>
          <CourseForm action={createCourseAction} submitLabel="Save" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "edit" ? (
        <AdminModal key={modal.course.id} title="Edit Course" description="Update the course name." onClose={closeModal}>
          <CourseForm action={updateCourseAction} course={modal.course} submitLabel="Save changes" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "delete" ? (
        <AdminModal key={modal.course.id} title="Delete Course" description={`Delete “${modal.course.name}”? Batches under this course will also be removed.`} onClose={closeModal}>
          <ConfirmDeleteForm id={modal.course.id} action={deleteCourseAction} onClose={closeModal} />
        </AdminModal>
      ) : null}
    </>
  );
}
