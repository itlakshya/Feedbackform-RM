"use client";

import Link from "next/link";
import { useState } from "react";
import { createQuestionAction, deleteQuestionAction, updateQuestionAction } from "@/app/admin/actions";
import {
  AdminModal,
  AdminPagination,
  ConfirmDeleteForm,
  DeleteIconButton,
  EditIconButton,
  fieldClassName,
  FormActions,
  ShowingCount,
} from "@/components/admin-list-ui";
import type { QuestionCategoryFilter } from "@/lib/admin-pagination";
import type { AdminQuestion, QuestionListPage } from "@/lib/admin-types";

type ModalKind = { type: "add" } | { type: "edit"; question: AdminQuestion } | { type: "delete"; question: AdminQuestion } | null;

const inputTypeLabels = {
  rating: "Rating (1-5)",
  text: "Short text",
  textarea: "Long text",
  single_choice: "Single choice",
} as const;

function QuestionForm({
  action,
  question,
  submitLabel,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  question?: AdminQuestion;
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
      {question ? <input type="hidden" name="id" value={question.id} /> : null}
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Category</span>
        <select className={fieldClassName} name="category" defaultValue={question?.category === "general" ? "general" : "faculty"}>
          <option value="faculty">Faculty set</option>
          <option value="general">General set</option>
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Input type</span>
        <select className={fieldClassName} name="inputType" defaultValue={question?.inputType ?? "rating"}>
          <option value="rating">Rating (1-5)</option>
          <option value="text">Short text</option>
          <option value="textarea">Long text</option>
          <option value="single_choice">Single choice</option>
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Question</span>
        <input className={fieldClassName} name="text" defaultValue={question?.text} placeholder="Question text" required autoFocus />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Helper</span>
        <input className={fieldClassName} name="helper" defaultValue={question?.helper} placeholder="Helper text (optional)" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Choice options</span>
        <textarea className={`min-h-28 ${fieldClassName}`} name="options" defaultValue={question?.options.join("\n")} placeholder="One option per line. Use only for single choice questions." />
      </label>
      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input type="checkbox" name="mandatory" defaultChecked={question?.mandatory} />
        Mandatory if category is general
      </label>
      <FormActions onClose={onClose} submitLabel={submitLabel} />
    </form>
  );
}

export function QuestionsManager({ result, category }: { result: QuestionListPage; category: QuestionCategoryFilter }) {
  const [modal, setModal] = useState<ModalKind>(null);
  const closeModal = () => setModal(null);
  const categoryQuery = category === "all" ? undefined : { category };
  const filters = [
    { value: "all" as const, label: "All", href: "/admin/questions" },
    { value: "faculty" as const, label: "Faculty", href: "/admin/questions?category=faculty" },
    { value: "general" as const, label: "General", href: "/admin/questions?category=general" },
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-slate-700">Category</p>
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {filters.map((filter) => (
              <Link
                key={filter.value}
                href={filter.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${category === filter.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>
        <button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800" type="button" onClick={() => setModal({ type: "add" })}>
          Add Question
        </button>
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
          {category === "all" ? "No questions yet. Use Add Question to create one." : `No ${category} questions yet.`}
        </div>
      ) : (
        <div className="space-y-3">
          {result.items.map((question) => (
            <div key={question.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-950">{question.text}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {question.category === "general" ? "General" : "Faculty"} · {inputTypeLabels[question.inputType]}
                  {question.category === "general" ? ` · ${question.mandatory ? "Mandatory" : "Optional"}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <EditIconButton label={`Edit ${question.text}`} onClick={() => setModal({ type: "edit", question })} />
                <DeleteIconButton label={`Delete ${question.text}`} onClick={() => setModal({ type: "delete", question })} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ShowingCount result={result} />
      <AdminPagination basePath="/admin/questions" page={result.page} totalPages={result.totalPages} query={categoryQuery} />

      {modal?.type === "add" ? (
        <AdminModal title="Add Question" description="Questions are common and reused across all batches." size="lg" onClose={closeModal}>
          <QuestionForm action={createQuestionAction} submitLabel="Save" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "edit" ? (
        <AdminModal key={modal.question.id} title="Edit Question" description="Update the question text, type, and options." size="lg" onClose={closeModal}>
          <QuestionForm action={updateQuestionAction} question={modal.question} submitLabel="Save changes" onClose={closeModal} />
        </AdminModal>
      ) : null}

      {modal?.type === "delete" ? (
        <AdminModal key={modal.question.id} title="Delete Question" description={`Delete “${modal.question.text}”? This cannot be undone.`} onClose={closeModal}>
          <ConfirmDeleteForm id={modal.question.id} action={deleteQuestionAction} onClose={closeModal} />
        </AdminModal>
      ) : null}
    </>
  );
}
