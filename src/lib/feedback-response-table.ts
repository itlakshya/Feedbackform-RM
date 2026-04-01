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
