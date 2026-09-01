"use client";

import { useState } from "react";
import { deleteBulkFeedbackResponsesAction, deleteFeedbackResponseAction } from "@/app/admin/actions";
import { AdminModal, DeleteButton } from "@/components/admin-list-ui";

function ConfirmActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <button className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50" type="button" onClick={onClose}>
        Cancel
      </button>
      <DeleteButton />
    </div>
  );
}

export function FeedbackResponseDeleteButton({ responseId, studentName }: { responseId: string; studentName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="rounded-full bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-700" type="button" onClick={() => setOpen(true)}>
        Delete
      </button>
      {open ? (
        <AdminModal
          title="Delete Response"
          description={`Delete the feedback submitted by “${studentName}”? This cannot be undone.`}
          onClose={() => setOpen(false)}
        >
          <form
            action={async (formData) => {
              await deleteFeedbackResponseAction(formData);
              setOpen(false);
            }}
          >
            <input type="hidden" name="responseId" value={responseId} />
            <ConfirmActions onClose={() => setOpen(false)} />
          </form>
        </AdminModal>
      ) : null}
    </>
  );
}

export function FeedbackResponseBulkDeleteButton() {
  const [ids, setIds] = useState<string[] | null>(null);

  return (
    <>
      <button
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-rose-600 px-6 font-semibold text-white transition hover:bg-rose-700"
        type="button"
        onClick={() => {
          const selected = Array.from(document.querySelectorAll('input[name="responseIds"]'))
            .filter((node): node is HTMLInputElement => node instanceof HTMLInputElement && node.checked)
            .map((box) => box.value)
            .filter(Boolean);
          setIds(selected);
        }}
      >
        Delete Selected Responses
      </button>
      {ids && ids.length === 0 ? (
        <AdminModal title="Delete Selected Responses" description="Select at least one response before deleting." onClose={() => setIds(null)}>
          <div className="flex justify-end">
            <button className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50" type="button" onClick={() => setIds(null)}>
              Close
            </button>
          </div>
        </AdminModal>
      ) : null}
      {ids && ids.length > 0 ? (
        <AdminModal
          title="Delete Selected Responses"
          description={`Delete ${ids.length} selected feedback ${ids.length === 1 ? "response" : "responses"}? This cannot be undone.`}
          onClose={() => setIds(null)}
        >
          <form
            action={async (formData) => {
              await deleteBulkFeedbackResponsesAction(formData);
              setIds(null);
            }}
          >
            {ids.map((id) => (
              <input key={id} type="hidden" name="responseIds" value={id} />
            ))}
            <ConfirmActions onClose={() => setIds(null)} />
          </form>
        </AdminModal>
      ) : null}
    </>
  );
}
