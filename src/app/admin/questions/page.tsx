import { createQuestionAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { AdminShell, QuestionRow, SectionCard } from "@/components/admin-shell";

export default async function QuestionsPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  return (
    <AdminShell current="/admin/questions" title="Questions" description="Manage common question sets on a dedicated page." metrics={[{ label: "Faculty", value: store.questions.filter((q) => q.category === "faculty").length }, { label: "General", value: store.questions.filter((q) => q.category === "general").length }, { label: "Total", value: store.questions.length }]}>
      <SectionCard title="Add Question" description="Questions are common and reused across all batches.">
        <form action={createQuestionAction} className="grid max-w-3xl gap-3"><select name="category" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" defaultValue="faculty"><option value="faculty">Faculty set</option><option value="general">General set</option></select><select name="inputType" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" defaultValue="rating"><option value="rating">Rating (1-5)</option><option value="text">Short text</option><option value="textarea">Long text</option><option value="single_choice">Single choice</option></select><input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="text" placeholder="Question text" required /><input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="helper" placeholder="Helper text (optional)" /><textarea className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-400" name="options" placeholder="Choice options, one per line. Use only for single choice questions." /><label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" name="mandatory" />Mandatory if category is general</label><button className="rounded-full bg-slate-950 px-6 py-3 font-semibold text-white" type="submit">Save</button></form>
      </SectionCard>
      <SectionCard title="Question List" description="Existing common questions.">
        <div className="space-y-3">{store.questions.filter((question) => question.category === "faculty" || question.category === "general").map((question) => <QuestionRow key={question.id} question={question} />)}</div>
      </SectionCard>
    </AdminShell>
  );
}
