import Link from "next/link";
import type { AdminBatch, AdminQuestion, AdminSimplePerson } from "@/lib/admin-types";
import { QuestionRowClient } from "@/components/question-row-client";
import type { FacultyMember } from "@/lib/feedback-types";
import {
  deleteBatchAction,
  deleteFacultyAction,
  logoutAdmin,
  updateBatchAction,
  updateBatchStatusAction,
  updateFacultyAction,
} from "@/app/admin/actions";

export function AdminShell({
  current,
  title,
  description,
  metrics,
  children,
}: {
  current: string;
  title: string;
  description: string;
  metrics?: Array<{ label: string; value: number | string }>;
  children: React.ReactNode;
}) {
  const links = [
    ["/admin", "Dashboard"],
    ["/admin/branches", "Branches"],
    ["/admin/courses", "Courses"],
    ["/admin/batches", "Batches"],
    ["/admin/faculty", "Faculty"],
    ["/admin/bulk-upload", "Bulk Upload"],
    ["/admin/questions", "Questions"],
    ["/admin/feedback-responses", "Feedback Responses"],
  ] as const;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_100%)]">
      <div className="mx-auto grid max-w-[1800px] gap-6 px-3 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-3 shadow-[0_16px_50px_rgba(15,23,42,0.08)] lg:sticky lg:top-4 lg:h-fit">
          <Link href="/" className="flex h-14 items-center rounded-2xl border border-slate-200 px-4 text-slate-900">Home</Link>
          <div className="space-y-3">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-2xl border px-4 py-4 text-base font-semibold transition ${current === href ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50"}`}
              >
                {label}
              </Link>
            ))}
          </div>
          <form action={logoutAdmin}>
            <button className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 px-5 font-semibold text-white transition hover:bg-red-500 hover:text-white bg-red-400" type="submit">Logout</button>
          </form>
        </aside>
        <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <section className="grid gap-6 rounded-[1.75rem] bg-slate-50 p-6 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Admin Panel</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{title}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
            </div>
            <div className="grid gap-3">
              {metrics ? (
                <div className={`grid gap-3 ${metrics.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl bg-white p-4 text-center">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
          {children}
        </div>
      </div>
    </main>
  );
}

export function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]"><div className="mb-4"><h2 className="text-2xl font-semibold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>{children}</section>;
}

export function NameRow({ item, updateAction, deleteAction }: { item: AdminSimplePerson; updateAction: (formData: FormData) => void; deleteAction: (formData: FormData) => void; }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="grid gap-3 lg:grid-cols-[1fr_auto]"><form action={updateAction} className="flex gap-3"><input type="hidden" name="id" value={item.id} /><input className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 outline-none focus:border-blue-400" name="name" defaultValue={item.name} required /><button className="rounded-full bg-slate-950 px-4 font-semibold text-white" type="submit">Save</button></form><form action={deleteAction}><input type="hidden" name="id" value={item.id} /><button className="rounded-full bg-rose-600 px-4 font-semibold text-white" type="submit">Delete</button></form></div></div>;
}

export function FacultyRow({ faculty, batches, branches, courses }: { faculty: FacultyMember; batches: AdminBatch[]; branches: AdminSimplePerson[]; courses: AdminSimplePerson[]; }) { const assignedBatches = batches.filter((batch) => batch.facultyIds.includes(faculty.id)); const assignedBranchNames = Array.from(new Set(assignedBatches.map((batch) => branches.find((item) => item.id === batch.branchId)?.name).filter(Boolean))); const assignedCourseNames = Array.from(new Set(assignedBatches.map((batch) => courses.find((item) => item.id === batch.courseId)?.name).filter(Boolean))); return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="grid gap-3 xl:grid-cols-[1fr_auto]"><form action={updateFacultyAction} className="grid gap-3"><input type="hidden" name="id" value={faculty.id} /><input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400" name="name" defaultValue={faculty.name} required /><div className="rounded-[1.25rem] border border-slate-200 bg-white p-4"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned batches</p><div className="mt-3 grid gap-3 md:grid-cols-2">{batches.map((batch) => <label key={batch.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"><input type="checkbox" name="batchIds" value={batch.id} defaultChecked={assignedBatches.some((item) => item.id === batch.id)} />{batch.name}</label>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Branches: {assignedBranchNames.length > 0 ? assignedBranchNames.join(", ") : "-"} | Courses: {assignedCourseNames.length > 0 ? assignedCourseNames.join(", ") : "-"}</div><div><button className="rounded-full bg-slate-950 px-4 py-2 font-semibold text-white" type="submit">Save faculty</button></div></form><form action={deleteFacultyAction} className="xl:self-start"><input type="hidden" name="id" value={faculty.id} /><button className="rounded-full bg-rose-600 px-4 py-2 font-semibold text-white" type="submit">Delete</button></form></div></div>; }

export function QuestionRow({ question }: { question: AdminQuestion }) { return <QuestionRowClient question={question} />; }

export function BatchRow({ batch, branches, courses }: { batch: AdminBatch; branches: AdminSimplePerson[]; courses: AdminSimplePerson[]; }) { return <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><div className="grid gap-3 xl:grid-cols-[1fr_auto]"><div className="space-y-3"><form action={updateBatchAction} className="grid gap-3 lg:grid-cols-2"><input type="hidden" name="id" value={batch.id} /><input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400" name="name" defaultValue={batch.name} required /><select name="branchId" defaultValue={batch.branchId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400" required>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><select name="courseId" defaultValue={batch.courseId} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400" required>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><div className="lg:col-span-2 flex items-center gap-3"><button className="rounded-full bg-slate-950 px-4 py-2 font-semibold text-white" type="submit">Save batch</button><span className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${batch.status === "active" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>{batch.status}</span></div></form><div className="flex flex-wrap gap-3"><form action={updateBatchStatusAction}><input type="hidden" name="id" value={batch.id} /><input type="hidden" name="status" value={batch.status === "active" ? "inactive" : "active"} /><button className="rounded-full bg-amber-500 px-4 py-2 font-semibold text-white" type="submit">Set {batch.status === "active" ? "Inactive" : "Active"}</button></form><form action={deleteBatchAction}><input type="hidden" name="id" value={batch.id} /><button className="rounded-full bg-rose-600 px-4 py-2 font-semibold text-white" type="submit">Delete</button></form></div></div></div></div>; }
