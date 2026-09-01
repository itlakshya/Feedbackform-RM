"use client";

import { useActionState } from "react";
import { importMasterCsvWithStateAction } from "@/app/admin/actions";

const initialState = {} as { success?: string; error?: string };

export function BulkUploadForm() {
  const [state, action, pending] = useActionState(importMasterCsvWithStateAction, initialState);

  return (
    <form action={action} className="max-w-4xl space-y-4">
      <div className="flex flex-wrap gap-3">
        <a className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 px-6 font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950" href="/admin/bulk-upload/template">
          Download Sample Template
        </a>
      </div>
      <input type="file" name="csvFile" accept=".csv,text/csv" className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" required />
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
        Missing branch, course, batch, or faculty values are created automatically during import. If a branch, course, or batch already exists, the import maps to the existing record and does not create a duplicate. Add as many Faculty columns as needed (Faculty1, Faculty2, Faculty3, ...). Leave unused faculty cells blank.
      </div>
      {state.success ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{state.success}</p> : null}
      {state.error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white disabled:opacity-60" type="submit" disabled={pending}>{pending ? "Uploading..." : "Upload CSV"}</button>
    </form>
  );
}
