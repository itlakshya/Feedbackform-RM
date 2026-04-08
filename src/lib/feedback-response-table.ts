import type { AdminStore } from "@/lib/admin-types";
import type { FacultyFeedbackResponse, FeedbackSubmission } from "@/lib/feedback-types";

export function getAnswerValue(answers: Array<{ questionText: string; value: string }>, questionText: string) {
  return answers.find((answer) => answer.questionText === questionText)?.value || "-";
}

export function buildFeedbackResponseTable(store: AdminStore) {
  const responses = store.feedbackResponses;
  const facultyQuestionTexts = store.questions.filter((question) => question.category === "faculty").map((question) => question.text);
  const generalQuestionTexts = store.questions.filter((question) => question.category === "general").map((question) => question.text);
  const tableRows: Array<{ response: FeedbackSubmission; facultyResponse: FacultyFeedbackResponse | null }> = responses.reduce((rows, response) => {
    if (response.facultyResponses.length === 0) {
      rows.push({ response, facultyResponse: null });
      return rows;
    }
    response.facultyResponses.forEach((facultyResponse) => {
      rows.push({ response, facultyResponse });
    });
    return rows;
  }, [] as Array<{ response: FeedbackSubmission; facultyResponse: FacultyFeedbackResponse | null }>);

  return { responses, facultyQuestionTexts, generalQuestionTexts, tableRows };
}

export function buildGroupedFeedbackResponseTable(store: AdminStore) {
  const { responses, facultyQuestionTexts, generalQuestionTexts, tableRows } = buildFeedbackResponseTable(store);
  const groupedTableRows = tableRows.map((row, index) => {
    const isFirstRowForResponse = index === 0 || tableRows[index - 1]?.response !== row.response;
    if (!isFirstRowForResponse) {
      return { ...row, isFirstRowForResponse, responseRowSpan: 0 };
    }

    const responseRowSpan = tableRows.slice(index).findIndex((candidate) => candidate.response !== row.response);
    return {
      ...row,
      isFirstRowForResponse,
      responseRowSpan: responseRowSpan === -1 ? tableRows.length - index : responseRowSpan,
    };
  });

  return { responses, facultyQuestionTexts, generalQuestionTexts, tableRows, groupedTableRows };
}

function escapeCsvValue(value: string) {
  const normalized = value.split(String.fromCharCode(13, 10)).join(" ").split(String.fromCharCode(10)).join(" ").trim();
  if (normalized.includes('"') || normalized.includes(",")) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

export function buildFeedbackResponseCsv(store: AdminStore) {
  const { facultyQuestionTexts, generalQuestionTexts, tableRows } = buildFeedbackResponseTable(store);
  const headers = [
    "Timestamp",
    "Email Address",
    "Name",
    "Branch",
    "Batch",
    "Faculty Name",
    ...facultyQuestionTexts,
    "Any other comments or suggestions?",
    ...generalQuestionTexts,
  ];

  const rows = tableRows.map(({ response, facultyResponse }) => [
    response.submittedAt,
    response.email,
    response.studentName,
    response.branch,
    response.batchName,
    facultyResponse?.facultyName || "-",
    ...facultyQuestionTexts.map((questionText) => (facultyResponse ? getAnswerValue(facultyResponse.answers, questionText) : "-")),
    facultyResponse?.comment || "-",
    ...generalQuestionTexts.map((questionText) => getAnswerValue(response.generalResponse.answers, questionText)),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(String(value ?? ""))).join(","))
    .join(String.fromCharCode(13, 10));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildFeedbackResponseExcelHtml(store: AdminStore) {
  const { facultyQuestionTexts, generalQuestionTexts, groupedTableRows } = buildGroupedFeedbackResponseTable(store);
  const headers = [
    "Timestamp",
    "Email Address",
    "Name",
    "Branch",
    "Batch",
    "Faculty Name",
    ...facultyQuestionTexts,
    "Any other comments or suggestions?",
    ...generalQuestionTexts,
  ];

  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = groupedTableRows
    .map(({ response, facultyResponse, isFirstRowForResponse, responseRowSpan }) => {
      const sharedCells = isFirstRowForResponse
        ? [
            `<td rowspan="${responseRowSpan}">${escapeHtml(response.submittedAt)}</td>`,
            `<td rowspan="${responseRowSpan}">${escapeHtml(response.email)}</td>`,
            `<td rowspan="${responseRowSpan}">${escapeHtml(response.studentName)}</td>`,
            `<td rowspan="${responseRowSpan}">${escapeHtml(response.branch)}</td>`,
            `<td rowspan="${responseRowSpan}">${escapeHtml(response.batchName)}</td>`,
          ].join("")
        : "";

      const facultyCells = [
        `<td>${escapeHtml(facultyResponse?.facultyName || "-")}</td>`,
        ...facultyQuestionTexts.map((questionText) => `<td>${escapeHtml(facultyResponse ? getAnswerValue(facultyResponse.answers, questionText) : "-")}</td>`),
        `<td>${escapeHtml(facultyResponse?.comment || "-")}</td>`,
      ].join("");

      const generalCells = isFirstRowForResponse
        ? generalQuestionTexts
            .map((questionText) => `<td rowspan="${responseRowSpan}">${escapeHtml(getAnswerValue(response.generalResponse.answers, questionText))}</td>`)
            .join("")
        : "";

      return `<tr>${sharedCells}${facultyCells}${generalCells}</tr>`;
    })
    .join("");

  return [
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    "<style>",
    "table { border-collapse: collapse; }",
    "th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; text-align: left; }",
    "th { background: #f8fafc; font-weight: 600; }",
    "</style>",
    "</head>",
    "<body>",
    `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`,
    "</body>",
    "</html>",
  ].join("");
}
