import Script from "next/script";
import { deleteBulkFeedbackResponsesAction, deleteFeedbackResponseAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { buildFeedbackResponseTable, getAnswerValue } from "@/lib/feedback-response-table";
import { AdminShell, SectionCard } from "@/components/admin-shell";

const selectAllScript = `
  (() => {
    const master = document.getElementById("select-all-responses");
    if (!(master instanceof HTMLInputElement)) return;

    const getBoxes = () => Array.from(document.querySelectorAll('input[name="responseIds"]')).filter((node) => node instanceof HTMLInputElement);

    const sync = () => {
      const boxes = getBoxes();
      const checked = boxes.filter((box) => box.checked).length;
      master.checked = boxes.length > 0 && checked === boxes.length;
      master.indeterminate = checked > 0 && checked < boxes.length;
    };

    master.addEventListener("change", () => {
      const boxes = getBoxes();
      boxes.forEach((box) => {
        box.checked = master.checked;
      });
      master.indeterminate = false;
    });

    getBoxes().forEach((box) => {
      box.addEventListener("change", sync);
    });

    sync();
  })();
`;

export default async function FeedbackResponsesPage() {
  await requireAdminSession();
  const store = await readAdminStore();
  const { responses, facultyQuestionTexts, generalQuestionTexts, tableRows } = buildFeedbackResponseTable(store);

  return (
    <AdminShell current="/admin/feedback-responses" title="Feedback Responses" description="Submitted student feedback captured from the public form." metrics={[{ label: "Responses", value: responses.length }, { label: "Rows", value: tableRows.length }, { label: "Students", value: new Set(responses.map((response) => response.email)).size }]}>
      <SectionCard title="Response Table" description="Download responses in Excel-friendly CSV format and delete them in single or bulk mode.">
        {tableRows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
            No feedback responses captured yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700" href="/admin/feedback-responses/export">
                Download Excel CSV
              </a>
              <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-rose-600 px-6 font-semibold text-white transition hover:bg-rose-700" type="submit" form="bulk-delete-form">
                Delete Selected Responses
              </button>
            </div>
            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200">
              <table className="min-w-[2350px] divide-y divide-slate-200 bg-white text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      <label className="flex items-center gap-2">
                        <input id="select-all-responses" type="checkbox" />
                        <span>Select all</span>
                      </label>
                    </th>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Email Address</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Branch</th>
                    <th className="px-4 py-3 font-semibold">Batch</th>
                    <th className="px-4 py-3 font-semibold">Faculty Name</th>
                    {facultyQuestionTexts.map((questionText) => (
                      <th key={questionText} className="px-4 py-3 font-semibold">{questionText}</th>
                    ))}
                    <th className="px-4 py-3 font-semibold">Any other comments or suggestions?</th>
                    {generalQuestionTexts.map((questionText) => (
                      <th key={questionText} className="px-4 py-3 font-semibold">{questionText}</th>
                    ))}
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 align-top">
                  {tableRows.map(({ response, facultyResponse }, index) => (
                    <tr key={`${response.responseId ?? response.email}-${facultyResponse?.facultyId ?? "none"}-${index}`}>
                      <td className="px-4 py-3 text-slate-700"><input type="checkbox" name="responseIds" value={response.responseId ?? ""} form="bulk-delete-form" /></td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">{response.submittedAt}</td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">{response.email}</td>
                      <td className="whitespace-pre-wrap px-4 py-3 font-medium text-slate-950">{response.studentName}</td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">{response.branch}</td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">{response.batchName}</td>
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">{facultyResponse?.facultyName || "-"}</td>
                      {facultyQuestionTexts.map((questionText) => (
                        <td key={questionText} className="whitespace-pre-wrap px-4 py-3 text-slate-700">{facultyResponse ? getAnswerValue(facultyResponse.answers, questionText) : "-"}</td>
                      ))}
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">{facultyResponse?.comment || "-"}</td>
                      {generalQuestionTexts.map((questionText) => (
                        <td key={questionText} className="whitespace-pre-wrap px-4 py-3 text-slate-700">{getAnswerValue(response.generalResponse.answers, questionText)}</td>
                      ))}
                      <td className="px-4 py-3">
                        <form action={deleteFeedbackResponseAction}>
                          <input type="hidden" name="responseId" value={response.responseId ?? ""} />
                          <button className="rounded-full bg-rose-600 px-4 py-2 font-semibold text-white transition hover:bg-rose-700" type="submit">
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form id="bulk-delete-form" action={deleteBulkFeedbackResponsesAction} />
            <Script id="feedback-response-select-all" strategy="afterInteractive">{selectAllScript}</Script>
          </div>
        )}
      </SectionCard>
    </AdminShell>
  );
}
