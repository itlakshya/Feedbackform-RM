"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addBatch,
  addBranch,
  addCoordinator,
  addCourse,
  addFaculty,
  addMentor,
  addQuestion,
  deleteBatch,
  deleteBranch,
  deleteCoordinator,
  deleteCourse,
  deleteFaculty,
  deleteFeedbackResponse,
  deleteFeedbackResponses,
  deleteMentor,
  deleteQuestion,
  importMasterCsv,
  updateBatch,
  updateBatchStatus,
  updateBranch,
  updateCoordinator,
  updateCourse,
  updateFaculty,
  updateMentor,
  updateQuestion,
  readAdminStore,
  saveFeedbackSubmission,
} from "@/lib/admin-store";
import { clearAdminSession, createAdminSession, requireAdminSession, verifyAdminCredentials } from "@/lib/admin-auth";
import type { FeedbackSubmission } from "@/lib/feedback-types";

const categories = ["faculty", "general"] as const;

type LoginState = { error?: string };
type QuestionActionState = { success?: string; error?: string };
type BulkUploadState = { success?: string; error?: string };

function revalidateAdminViews() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/branches");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/batches");
  revalidatePath("/admin/faculty");
  revalidatePath("/admin/bulk-upload");
  revalidatePath("/admin/questions");
}

function getMandatoryFlag(formData: FormData) {
  return String(formData.get("mandatory") ?? "") === "on";
}

function getQuestionInputType(formData: FormData) {
  const inputType = String(formData.get("inputType") ?? "rating").trim();
  return ["rating", "text", "textarea", "single_choice"].includes(inputType) ? (inputType as "rating" | "text" | "textarea" | "single_choice") : "rating";
}

function getQuestionOptions(formData: FormData) {
  return String(formData.get("options") ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function loginAdmin(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter admin email and password." };
  if (!(await verifyAdminCredentials(email, password))) return { error: "Invalid admin credentials." };
  await createAdminSession(email.toLowerCase());
  redirect("/admin");
}

export async function logoutAdmin() { await clearAdminSession(); redirect("/admin/login"); }

export async function importMasterCsvAction(formData: FormData) {
  await requireAdminSession();
  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) return;
  const text = await file.text();
  await importMasterCsv(text);
  revalidateAdminViews();
}

export async function importMasterCsvWithStateAction(_: BulkUploadState, formData: FormData): Promise<BulkUploadState> {
  await requireAdminSession();
  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to upload." };
  const text = await file.text();
  const summary = await importMasterCsv(text);
  revalidateAdminViews();
  return { success: `Upload completed. Rows: ${summary.processedRows}, branches created: ${summary.createdBranches}, courses created: ${summary.createdCourses}, batches created: ${summary.createdBatches}, faculties created: ${summary.createdFaculties}, faculty links added: ${summary.linkedFaculties}.` };
}

export async function createBranchAction(formData: FormData) { await requireAdminSession(); const name = String(formData.get("name") ?? "").trim(); if (!name) return; await addBranch(name); revalidateAdminViews(); }
export async function updateBranchAction(formData: FormData) { await requireAdminSession(); await updateBranch(String(formData.get("id") ?? ""), String(formData.get("name") ?? "").trim()); revalidateAdminViews(); }
export async function deleteBranchAction(formData: FormData) { await requireAdminSession(); await deleteBranch(String(formData.get("id") ?? "")); revalidateAdminViews(); }
export async function createCourseAction(formData: FormData) { await requireAdminSession(); const name = String(formData.get("name") ?? "").trim(); if (!name) return; await addCourse(name); revalidateAdminViews(); }
export async function updateCourseAction(formData: FormData) { await requireAdminSession(); await updateCourse(String(formData.get("id") ?? ""), String(formData.get("name") ?? "").trim()); revalidateAdminViews(); }
export async function deleteCourseAction(formData: FormData) { await requireAdminSession(); await deleteCourse(String(formData.get("id") ?? "")); revalidateAdminViews(); }
export async function createFacultyAction(formData: FormData) { await requireAdminSession(); const batchIds = formData.getAll("batchIds").map((value) => String(value)).filter(Boolean); if (batchIds.length === 0) return; await addFaculty({ name: String(formData.get("name") ?? "").trim(), subject: "General", designation: "Faculty", sessionsHandled: 1 }, batchIds); revalidateAdminViews(); }
export async function updateFacultyAction(formData: FormData) { await requireAdminSession(); const batchIds = formData.getAll("batchIds").map((value) => String(value)).filter(Boolean); if (batchIds.length === 0) return; await updateFaculty(String(formData.get("id") ?? ""), { name: String(formData.get("name") ?? "").trim(), subject: "General", designation: "Faculty", sessionsHandled: 1 }, batchIds); revalidateAdminViews(); }
export async function deleteFacultyAction(formData: FormData) { await requireAdminSession(); await deleteFaculty(String(formData.get("id") ?? "")); revalidateAdminViews(); }
export async function createCoordinatorAction(formData: FormData) { await requireAdminSession(); const name = String(formData.get("name") ?? "").trim(); if (!name) return; await addCoordinator(name); revalidateAdminViews(); }
export async function updateCoordinatorAction(formData: FormData) { await requireAdminSession(); await updateCoordinator(String(formData.get("id") ?? ""), String(formData.get("name") ?? "").trim()); revalidateAdminViews(); }
export async function deleteCoordinatorAction(formData: FormData) { await requireAdminSession(); await deleteCoordinator(String(formData.get("id") ?? "")); revalidateAdminViews(); }
export async function createMentorAction(formData: FormData) { await requireAdminSession(); const name = String(formData.get("name") ?? "").trim(); if (!name) return; await addMentor(name); revalidateAdminViews(); }
export async function updateMentorAction(formData: FormData) { await requireAdminSession(); await updateMentor(String(formData.get("id") ?? ""), String(formData.get("name") ?? "").trim()); revalidateAdminViews(); }
export async function deleteMentorAction(formData: FormData) { await requireAdminSession(); await deleteMentor(String(formData.get("id") ?? "")); revalidateAdminViews(); }
export async function createQuestionAction(formData: FormData) { await requireAdminSession(); const category = String(formData.get("category") ?? "").trim(); if (!categories.includes(category as (typeof categories)[number])) return; const inputType = getQuestionInputType(formData); await addQuestion({ category: category as (typeof categories)[number], text: String(formData.get("text") ?? "").trim(), helper: String(formData.get("helper") ?? "").trim(), inputType, options: inputType === "single_choice" ? getQuestionOptions(formData) : [], mandatory: category === "general" ? getMandatoryFlag(formData) : false }); revalidateAdminViews(); }
export async function updateQuestionAction(formData: FormData) { await requireAdminSession(); const category = String(formData.get("category") ?? "").trim(); if (!categories.includes(category as (typeof categories)[number])) return; const inputType = getQuestionInputType(formData); await updateQuestion(String(formData.get("id") ?? ""), { category: category as (typeof categories)[number], text: String(formData.get("text") ?? "").trim(), helper: String(formData.get("helper") ?? "").trim(), inputType, options: inputType === "single_choice" ? getQuestionOptions(formData) : [], mandatory: category === "general" ? getMandatoryFlag(formData) : false }); revalidateAdminViews(); }
export async function updateQuestionWithStateAction(_: QuestionActionState, formData: FormData): Promise<QuestionActionState> { await requireAdminSession(); const category = String(formData.get("category") ?? "").trim(); if (!categories.includes(category as (typeof categories)[number])) return { error: "Invalid question category." }; const text = String(formData.get("text") ?? "").trim(); if (!text) return { error: "Question text is required." }; const inputType = getQuestionInputType(formData); await updateQuestion(String(formData.get("id") ?? ""), { category: category as (typeof categories)[number], text, helper: String(formData.get("helper") ?? "").trim(), inputType, options: inputType === "single_choice" ? getQuestionOptions(formData) : [], mandatory: category === "general" ? getMandatoryFlag(formData) : false }); revalidateAdminViews(); return { success: "Question updated successfully." }; }
export async function deleteQuestionAction(formData: FormData) { await requireAdminSession(); await deleteQuestion(String(formData.get("id") ?? "")); revalidateAdminViews(); }
export async function createBatchAction(formData: FormData) { await requireAdminSession(); await addBatch({ name: String(formData.get("name") ?? "").trim(), branchId: String(formData.get("branchId") ?? ""), courseId: String(formData.get("courseId") ?? ""), semester: "Semester 1", strength: 0, facultyIds: [], coordinatorId: null, mentorId: null, status: "active" }); revalidateAdminViews(); }
export async function updateBatchAction(formData: FormData) { await requireAdminSession(); const id = String(formData.get("id") ?? ""); const store = await readAdminStore(); const currentBatch = store.batches.find((batch) => batch.id === id); if (!currentBatch) return; const status = String(formData.get("status") ?? currentBatch.status) === "inactive" ? "inactive" : "active"; await updateBatch(id, { name: String(formData.get("name") ?? "").trim(), branchId: String(formData.get("branchId") ?? ""), courseId: String(formData.get("courseId") ?? ""), semester: currentBatch.semester, strength: currentBatch.strength, facultyIds: currentBatch.facultyIds, coordinatorId: currentBatch.coordinatorId, mentorId: currentBatch.mentorId, status }); revalidateAdminViews(); }
export async function deleteBatchAction(formData: FormData) { await requireAdminSession(); await deleteBatch(String(formData.get("id") ?? "")); revalidateAdminViews(); }
export async function updateBatchStatusAction(formData: FormData) { await requireAdminSession(); const id = String(formData.get("id") ?? ""); const status = String(formData.get("status") ?? "inactive") === "inactive" ? "inactive" : "active"; await updateBatchStatus(id, status); revalidateAdminViews(); }

export async function deleteFeedbackResponseAction(formData: FormData) { await requireAdminSession(); await deleteFeedbackResponse(String(formData.get("responseId") ?? "")); revalidatePath("/admin/feedback-responses"); }
export async function deleteBulkFeedbackResponsesAction(formData: FormData) { await requireAdminSession(); await deleteFeedbackResponses(formData.getAll("responseIds").map((value) => String(value))); revalidatePath("/admin/feedback-responses"); }

export async function saveFeedbackSubmissionAction(submission: FeedbackSubmission) { await saveFeedbackSubmission(submission); revalidatePath("/admin/feedback-responses"); }
