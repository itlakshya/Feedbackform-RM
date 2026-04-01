"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AdminQuestion } from "@/lib/admin-types";
import { deleteQuestionAction, updateQuestionWithStateAction } from "@/app/admin/actions";

type QuestionActionState = {
  success?: string;
  error?: string;
};

const initialState: QuestionActionState = {};

export function QuestionRowClient({ question }: { question: AdminQuestion }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateQuestionWithStateAction, initialState);
  const lastSuccessRef = useRef("");

  useEffect(() => {
    if (!state.success || state.success === lastSuccessRef.current) return;
    lastSuccessRef.current = state.success;
    router.refresh();
  }, [router, state.success]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          {state.success ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{state.success}</p> : null}
          {state.error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.error}</p> : null}
          <form action={action} className="grid gap-3">
            <input type="hidden" name="id" value={question.id} />
            <select name="category" defaultValue={question.category === "general" ? "general" : "faculty"} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400">
              <option value="faculty">Faculty</option>
              <option value="general">General</option>
            </select>
            <select name="inputType" defaultValue={question.inputType} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400">
              <option value="rating">Rating (1-5)</option>
              <option value="text">Short text</option>
              <option value="textarea">Long text</option>
              <option value="single_choice">Single choice</option>
            </select>
            <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400" name="text" defaultValue={question.text} required />
            <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400" name="helper" defaultValue={question.helper} placeholder="Helper text (optional)" />
            <textarea className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400" name="options" defaultValue={question.options.join("\n")} placeholder="Choice options, one per line. Use only for single choice questions." />
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" name="mandatory" defaultChecked={question.mandatory} />Mandatory for general
            </label>
            <div>
              <button className="rounded-full bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-60" type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save question"}
              </button>
            </div>
          </form>
        </div>
        <form action={deleteQuestionAction} className="xl:self-start">
          <input type="hidden" name="id" value={question.id} />
          <button className="rounded-full bg-rose-600 px-4 py-2 font-semibold text-white" type="submit">Delete</button>
        </form>
      </div>
    </div>
  );
}
