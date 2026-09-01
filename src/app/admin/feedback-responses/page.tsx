import { requireAdminSession } from "@/lib/admin-auth";
import { parsePage, redirectIfStalePage } from "@/lib/admin-pagination";
import { getFeedbackResponseMetrics, listFeedbackResponsesPage, listFeedbackTableQuestions } from "@/lib/admin-store";
import { buildGroupedFeedbackResponseTable, getAnswerValue } from "@/lib/feedback-response-table";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { AdminPagination, ShowingCount } from "@/components/admin-list-ui";
import { FeedbackResponseBulkDeleteButton, FeedbackResponseDeleteButton } from "@/components/feedback-response-deletes";
import { FeedbackResponseSelectAll } from "@/components/feedback-response-select-all";

export default async function FeedbackResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireAdminSession();
  const requestedPage = parsePage((await searchParams).page);
  const [result, metrics, questions] = await Promise.all([
    listFeedbackResponsesPage(requestedPage),
    getFeedbackResponseMetrics(),
    listFeedbackTableQuestions(),
  ]);
  redirectIfStalePage("/admin/feedback-responses", requestedPage, result.page);

  const { facultyQuestionTexts, generalQuestionTexts, groupedTableRows } = buildGroupedFeedbackResponseTable({
    feedbackResponses: result.items,
    questions,
  });

  return (
    <AdminShell
      current="/admin/feedback-responses"
      title="Feedback Responses"
      description="Submitted student feedback captured from the public form."
      metrics={[
        { label: "Responses", value: metrics.responses },
        { label: "Rows", value: metrics.rows },
        { label: "Students", value: metrics.students },
      ]}
    >
      <SectionCard title="Response Table" description="Download responses in Excel-friendly CSV format and delete them in single or bulk mode.">
        {metrics.responses === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
            No feedback responses captured yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700" href="/admin/feedback-responses/export">
                Download Excel
              </a>
              <FeedbackResponseBulkDeleteButton />
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
                  {groupedTableRows.map(({ response, facultyResponse, isFirstRowForResponse, responseRowSpan }, index) => (
                    <tr key={`${response.responseId ?? response.email}-${facultyResponse?.facultyId ?? "none"}-${index}`}>
                      {isFirstRowForResponse ? (
                        <>
                          <td rowSpan={responseRowSpan} className="px-4 py-3 text-slate-700 align-top"><input type="checkbox" name="responseIds" value={response.responseId ?? ""} /></td>
                          <td rowSpan={responseRowSpan} className="whitespace-pre-wrap px-4 py-3 text-slate-700 align-top">{response.submittedAt}</td>
                          <td rowSpan={responseRowSpan} className="whitespace-pre-wrap px-4 py-3 text-slate-700 align-top">{response.email}</td>
                          <td rowSpan={responseRowSpan} className="whitespace-pre-wrap px-4 py-3 font-medium text-slate-950 align-top">{response.studentName}</td>
                          <td rowSpan={responseRowSpan} className="whitespace-pre-wrap px-4 py-3 text-slate-700 align-top">{response.branch}</td>
                          <td rowSpan={responseRowSpan} className="whitespace-pre-wrap px-4 py-3 text-slate-700 align-top">{response.batchName}</td>
                        </>
                      ) : null}
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">{facultyResponse?.facultyName || "-"}</td>
                      {facultyQuestionTexts.map((questionText) => (
                        <td key={questionText} className="whitespace-pre-wrap px-4 py-3 text-slate-700">{facultyResponse ? getAnswerValue(facultyResponse.answers, questionText) : "-"}</td>
                      ))}
                      <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">{facultyResponse?.comment || "-"}</td>
                      {isFirstRowForResponse ? (
                        <>
                          {generalQuestionTexts.map((questionText) => (
                            <td key={questionText} rowSpan={responseRowSpan} className="whitespace-pre-wrap px-4 py-3 text-slate-700 align-top">{getAnswerValue(response.generalResponse.answers, questionText)}</td>
                          ))}
                          <td rowSpan={responseRowSpan} className="px-4 py-3 align-top">
                            <FeedbackResponseDeleteButton responseId={response.responseId ?? ""} studentName={response.studentName} />
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FeedbackResponseSelectAll page={result.page} />
            <ShowingCount result={result} />
            <AdminPagination basePath="/admin/feedback-responses" page={result.page} totalPages={result.totalPages} />
          </div>
        )}
      </SectionCard>
    </AdminShell>
  );
}
