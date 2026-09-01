"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import type { PaginatedList, QueryMap } from "@/lib/admin-pagination";

function pageHref(basePath: string, page: number, query?: QueryMap) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export const fieldClassName = "min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400";

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}

export function AdminModal({
  title,
  description,
  children,
  onClose,
  size = "md",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={`w-full ${size === "lg" ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.18)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-modal-title" className="text-2xl font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white disabled:opacity-60" type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </button>
  );
}

export function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white disabled:opacity-60" type="submit" disabled={pending}>
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}

export function AddButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-end">
      <button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800" type="button" onClick={onClick}>
        {children}
      </button>
    </div>
  );
}

export function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      <PencilIcon />
    </button>
  );
}

export function DeleteIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      <TrashIcon />
    </button>
  );
}

export function FormActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <button className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50" type="button" onClick={onClose}>
        Cancel
      </button>
      <SaveButton label={submitLabel} />
    </div>
  );
}

export function ConfirmDeleteForm({
  id,
  action,
  onClose,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        await action(formData);
        onClose();
      }}
      className="flex flex-wrap justify-end gap-3"
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50" type="button" onClick={onClose}>
        Cancel
      </button>
      <DeleteButton />
    </form>
  );
}

export function AdminPagination({
  basePath,
  page,
  totalPages,
  query,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  query?: QueryMap;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
      <Link
        href={pageHref(basePath, page - 1, query)}
        aria-disabled={page <= 1}
        className={`rounded-full border px-5 py-2 font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-400" : "border-slate-200 text-slate-900 hover:bg-slate-50"}`}
      >
        Previous
      </Link>
      <p className="text-sm font-medium text-slate-600">
        Page {page} of {totalPages}
      </p>
      <Link
        href={pageHref(basePath, page + 1, query)}
        aria-disabled={page >= totalPages}
        className={`rounded-full border px-5 py-2 font-semibold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-400" : "border-slate-200 text-slate-900 hover:bg-slate-50"}`}
      >
        Next
      </Link>
    </div>
  );
}

export function ShowingCount({ result }: { result: PaginatedList<unknown> }) {
  if (result.total === 0) return null;
  return (
    <p className="mt-4 text-sm text-slate-500">
      Showing {(result.page - 1) * result.pageSize + 1}-{Math.min(result.page * result.pageSize, result.total)} of {result.total}
    </p>
  );
}
