
import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pgPool } from "@/lib/postgres";
import type { AdminBatch, AdminIdentity, AdminQuestionCategory, AdminSimplePerson, AdminStore } from "@/lib/admin-types";
import type { BatchFeedbackConfig, FeedbackSubmission, GeneralFeedbackResponse } from "@/lib/feedback-types";

const seedStorePath = path.join(process.cwd(), "data", "admin-store.json");
let bootstrapPromise: Promise<void> | null = null;
type Queryable = Pick<PoolClient, "query"> | typeof pgPool;

function createDefaultAdminIdentity(): AdminIdentity {
  return { name: "System Admin", email: process.env.ADMIN_EMAIL ?? "admin@feedback.local", passwordSalt: "", passwordHash: "" };
}

function normalizeStore(raw: Partial<AdminStore> & Record<string, unknown>): AdminStore {
  return {
    admin: (raw.admin as AdminStore["admin"]) ?? createDefaultAdminIdentity(),
    activeBatchId: (raw.activeBatchId as string | null | undefined) ?? null,
    branches: Array.isArray(raw.branches) ? (raw.branches as AdminStore["branches"]) : [],
    courses: Array.isArray(raw.courses) ? (raw.courses as AdminStore["courses"]) : [],
    faculties: Array.isArray(raw.faculties) ? (raw.faculties as AdminStore["faculties"]) : [],
    coordinators: Array.isArray(raw.coordinators) ? (raw.coordinators as AdminStore["coordinators"]) : [],
    mentors: Array.isArray(raw.mentors) ? (raw.mentors as AdminStore["mentors"]) : [],
    questions: Array.isArray(raw.questions)
      ? (raw.questions as AdminStore["questions"]).map((question) => ({ ...question, inputType: question.inputType ?? "rating", options: Array.isArray(question.options) ? question.options.filter(Boolean) : [], mandatory: question.category === "general" ? Boolean(question.mandatory) : false }))
      : [],
    batches: Array.isArray(raw.batches)
      ? (raw.batches as AdminBatch[]).map((batch) => ({ ...batch, coordinatorId: batch.coordinatorId ?? null, mentorId: batch.mentorId ?? null, status: batch.status ?? "active" }))
      : [],
    feedbackResponses: Array.isArray(raw.feedbackResponses)
      ? (raw.feedbackResponses as FeedbackSubmission[]).map((response) => ({ ...response, responseId: response.responseId ?? createId("response"), supportResponses: Array.isArray(response.supportResponses) ? response.supportResponses : [], generalResponse: response.generalResponse ?? { averageScore: 0, answers: [], comment: "" } }))
      : [],
  };
}

async function readSeedStore() {
  const raw = await fs.readFile(seedStorePath, "utf8");
  return normalizeStore(JSON.parse(raw.replace(/^\uFEFF/, "")) as Partial<AdminStore>);
}

async function ensureDatabaseSchema() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS app_config (config_key TEXT PRIMARY KEY, config_value TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS branches (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS faculties (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, subject TEXT NOT NULL, designation TEXT NOT NULL, sessions_handled INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS coordinators (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS mentors (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, text TEXT NOT NULL, helper TEXT NOT NULL DEFAULT '', category TEXT NOT NULL, input_type TEXT NOT NULL, options JSONB NOT NULL DEFAULT '[]'::jsonb, mandatory BOOLEAN NOT NULL DEFAULT FALSE);
    CREATE TABLE IF NOT EXISTS batches (id TEXT PRIMARY KEY, name TEXT NOT NULL, branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE, course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE, semester TEXT NOT NULL DEFAULT '', strength INTEGER NOT NULL DEFAULT 0, coordinator_id TEXT REFERENCES coordinators(id) ON DELETE SET NULL, mentor_id TEXT REFERENCES mentors(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'active');
    CREATE TABLE IF NOT EXISTS batch_faculties (batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE, faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE, PRIMARY KEY (batch_id, faculty_id));
    CREATE TABLE IF NOT EXISTS feedback_responses (response_id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, batch_name TEXT NOT NULL, branch TEXT NOT NULL, course TEXT NOT NULL, semester TEXT NOT NULL DEFAULT '', student_name TEXT NOT NULL, mobile_number TEXT NOT NULL, email TEXT NOT NULL, submitted_at TIMESTAMPTZ NOT NULL, faculty_responses JSONB NOT NULL DEFAULT '[]'::jsonb, support_responses JSONB NOT NULL DEFAULT '[]'::jsonb, general_response JSONB NOT NULL DEFAULT '{}'::jsonb, overall_comment TEXT NOT NULL DEFAULT '');
  `);
}

async function readLegacyStore() {
  const tableCheck = await pgPool.query<{ table_name: string | null }>("SELECT to_regclass('public.app_store') AS table_name");
  if (!tableCheck.rows[0]?.table_name) return null;
  const result = await pgPool.query<{ payload: Partial<AdminStore> }>("SELECT payload FROM app_store WHERE store_key = $1", ["admin-store"]);
  if (!result.rowCount || !result.rows[0]) return null;
  return normalizeStore(result.rows[0].payload as Partial<AdminStore>);
}

async function readStoreCounts(db: Queryable) {
  const result = await db.query(`SELECT (SELECT COUNT(*)::int FROM branches) AS branches_count, (SELECT COUNT(*)::int FROM courses) AS courses_count, (SELECT COUNT(*)::int FROM faculties) AS faculties_count, (SELECT COUNT(*)::int FROM coordinators) AS coordinators_count, (SELECT COUNT(*)::int FROM mentors) AS mentors_count, (SELECT COUNT(*)::int FROM questions) AS questions_count, (SELECT COUNT(*)::int FROM batches) AS batches_count, (SELECT COUNT(*)::int FROM feedback_responses) AS feedback_responses_count`);
  return result.rows[0] as Record<string, number>;
}

async function persistStore(db: Queryable, store: AdminStore) {
  await db.query("BEGIN");
  try {
    await db.query("DELETE FROM batch_faculties");
    await db.query("DELETE FROM feedback_responses");
    await db.query("DELETE FROM batches");
    await db.query("DELETE FROM questions");
    await db.query("DELETE FROM coordinators");
    await db.query("DELETE FROM mentors");
    await db.query("DELETE FROM faculties");
    await db.query("DELETE FROM courses");
    await db.query("DELETE FROM branches");
    await db.query("DELETE FROM app_config");
    for (const branch of store.branches) await db.query("INSERT INTO branches (id, name) VALUES ($1, $2)", [branch.id, branch.name]);
    for (const course of store.courses) await db.query("INSERT INTO courses (id, name) VALUES ($1, $2)", [course.id, course.name]);
    for (const faculty of store.faculties) await db.query("INSERT INTO faculties (id, name, subject, designation, sessions_handled) VALUES ($1, $2, $3, $4, $5)", [faculty.id, faculty.name, faculty.subject, faculty.designation, faculty.sessionsHandled]);
    for (const coordinator of store.coordinators) await db.query("INSERT INTO coordinators (id, name) VALUES ($1, $2)", [coordinator.id, coordinator.name]);
    for (const mentor of store.mentors) await db.query("INSERT INTO mentors (id, name) VALUES ($1, $2)", [mentor.id, mentor.name]);
    for (const question of store.questions) await db.query("INSERT INTO questions (id, text, helper, category, input_type, options, mandatory) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)", [question.id, question.text, question.helper, question.category, question.inputType, JSON.stringify(question.options), question.mandatory]);
    for (const batch of store.batches) {
      await db.query("INSERT INTO batches (id, name, branch_id, course_id, semester, strength, coordinator_id, mentor_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [batch.id, batch.name, batch.branchId, batch.courseId, batch.semester, batch.strength, batch.coordinatorId, batch.mentorId, batch.status]);
      for (const facultyId of batch.facultyIds) await db.query("INSERT INTO batch_faculties (batch_id, faculty_id) VALUES ($1, $2)", [batch.id, facultyId]);
    }
    for (const response of store.feedbackResponses) {
      await db.query(`INSERT INTO feedback_responses (response_id, batch_id, batch_name, branch, course, semester, student_name, mobile_number, email, submitted_at, faculty_responses, support_responses, general_response, overall_comment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14)`, [response.responseId ?? createId("response"), response.batchId, response.batchName, response.branch, response.course, response.semester, response.studentName, response.mobileNumber, response.email, response.submittedAt, JSON.stringify(response.facultyResponses), JSON.stringify(response.supportResponses ?? []), JSON.stringify(response.generalResponse ?? { averageScore: 0, answers: [], comment: "" }), response.overallComment]);
    }
    await db.query("INSERT INTO app_config (config_key, config_value, updated_at) VALUES ($1, $2, NOW())", ["activeBatchId", store.activeBatchId]);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

async function ensureDatabaseStore() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await ensureDatabaseSchema();
      const counts = await readStoreCounts(pgPool);
      if (Object.values(counts).some((value) => value > 0)) return;
      const legacyStore = (await readLegacyStore()) ?? (await readSeedStore());
      const client = await pgPool.connect();
      try {
        await persistStore(client, legacyStore);
      } finally {
        client.release();
      }
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  await bootstrapPromise;
}

export function createId(prefix: string) { return `${prefix}-${randomUUID().slice(0, 8)}`; }
function uniqueByName<T extends { name: string }>(items: T[]) { const seen = new Set<string>(); return items.filter((item) => { const key = item.name.trim().toLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
function parseLines(value: string) { return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }

function parseCsv(text: string) {
  const rows: string[][] = []; let current = ""; let row: string[] = []; let insideQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]; const next = text[index + 1];
    if (char === '"') { if (insideQuotes && next === '"') { current += '"'; index += 1; } else insideQuotes = !insideQuotes; continue; }
    if (char === "," && !insideQuotes) { row.push(current.trim()); current = ""; continue; }
    if ((char === "\n" || char === "\r") && !insideQuotes) { if (char === "\r" && next === "\n") index += 1; row.push(current.trim()); if (row.some(Boolean)) rows.push(row); row = []; current = ""; continue; }
    current += char;
  }
  if (current.length > 0 || row.length > 0) { row.push(current.trim()); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

function parseQuestionOptions(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []; }
function parseGeneralResponse(value: unknown): GeneralFeedbackResponse { if (value && typeof value === "object") { const parsed = value as GeneralFeedbackResponse; return { averageScore: Number(parsed.averageScore ?? 0), answers: Array.isArray(parsed.answers) ? parsed.answers : [], comment: typeof parsed.comment === "string" ? parsed.comment : "" }; } return { averageScore: 0, answers: [], comment: "" }; }
function getActiveBatchDependencies(store: AdminStore, batch: AdminBatch) { return { branch: store.branches.find((item) => item.id === batch.branchId) ?? null, course: store.courses.find((item) => item.id === batch.courseId) ?? null, coordinator: store.coordinators.find((item) => item.id === batch.coordinatorId) ?? null, mentor: store.mentors.find((item) => item.id === batch.mentorId) ?? null }; }
function resetActiveBatchIfMissing(store: AdminStore) { if (!store.batches.some((batch) => batch.id === store.activeBatchId)) store.activeBatchId = store.batches.find((batch) => batch.status === "active")?.id ?? null; }
function findOrCreateByName<T extends { id: string; name: string }>(list: T[], name: string, prefix: string) { const normalized = name.trim().toLowerCase(); const existing = list.find((item) => item.name.trim().toLowerCase() === normalized); if (existing) return existing; const created = { id: createId(prefix), name: name.trim() } as T; list.push(created); return created; }

export async function readAdminStore(): Promise<AdminStore> {
  await ensureDatabaseStore();
  const [configResult, branchResult, courseResult, facultyResult, coordinatorResult, mentorResult, questionResult, batchResult, batchFacultyResult, feedbackResult] = await Promise.all([
    pgPool.query("SELECT config_key, config_value FROM app_config"), pgPool.query("SELECT id, name FROM branches ORDER BY LOWER(name), id"), pgPool.query("SELECT id, name FROM courses ORDER BY LOWER(name), id"), pgPool.query("SELECT id, name, subject, designation, sessions_handled FROM faculties ORDER BY LOWER(name), id"), pgPool.query("SELECT id, name FROM coordinators ORDER BY LOWER(name), id"), pgPool.query("SELECT id, name FROM mentors ORDER BY LOWER(name), id"), pgPool.query("SELECT id, text, helper, category, input_type, options, mandatory FROM questions ORDER BY id"), pgPool.query("SELECT id, name, branch_id, course_id, semester, strength, coordinator_id, mentor_id, status FROM batches ORDER BY LOWER(name), id"), pgPool.query("SELECT batch_id, faculty_id FROM batch_faculties ORDER BY batch_id, faculty_id"), pgPool.query("SELECT response_id, batch_id, batch_name, branch, course, semester, student_name, mobile_number, email, submitted_at, faculty_responses, support_responses, general_response, overall_comment FROM feedback_responses ORDER BY submitted_at DESC, response_id DESC")
  ]);
  const batchFacultyMap = new Map<string, string[]>();
  for (const item of batchFacultyResult.rows as Array<{ batch_id: string; faculty_id: string }>) { const facultyIds = batchFacultyMap.get(item.batch_id) ?? []; facultyIds.push(item.faculty_id); batchFacultyMap.set(item.batch_id, facultyIds); }
  const configMap = new Map((configResult.rows as Array<{ config_key: string; config_value: string | null }>).map((row) => [row.config_key, row.config_value]));
  return {
    admin: createDefaultAdminIdentity(),
    activeBatchId: configMap.get("activeBatchId") ?? null,
    branches: (branchResult.rows as Array<{ id: string; name: string }>).map((row) => ({ id: row.id, name: row.name })),
    courses: (courseResult.rows as Array<{ id: string; name: string }>).map((row) => ({ id: row.id, name: row.name })),
    faculties: (facultyResult.rows as Array<{ id: string; name: string; subject: string; designation: string; sessions_handled: number }>).map((row) => ({ id: row.id, name: row.name, subject: row.subject, designation: row.designation, sessionsHandled: Number(row.sessions_handled ?? 1) })),
    coordinators: (coordinatorResult.rows as Array<{ id: string; name: string }>).map((row) => ({ id: row.id, name: row.name })),
    mentors: (mentorResult.rows as Array<{ id: string; name: string }>).map((row) => ({ id: row.id, name: row.name })),
    questions: (questionResult.rows as Array<{ id: string; text: string; helper: string; category: AdminQuestionCategory; input_type: "rating" | "text" | "textarea" | "single_choice"; options: unknown; mandatory: boolean }>).map((row) => ({ id: row.id, text: row.text, helper: row.helper, category: row.category, inputType: row.input_type, options: parseQuestionOptions(row.options), mandatory: row.category === "general" ? Boolean(row.mandatory) : false })),
    batches: (batchResult.rows as Array<{ id: string; name: string; branch_id: string; course_id: string; semester: string; strength: number; coordinator_id: string | null; mentor_id: string | null; status: "active" | "inactive" }>).map((row) => ({ id: row.id, name: row.name, branchId: row.branch_id, courseId: row.course_id, semester: row.semester, strength: Number(row.strength ?? 0), facultyIds: batchFacultyMap.get(row.id) ?? [], coordinatorId: row.coordinator_id, mentorId: row.mentor_id, status: row.status ?? "active" })),
    feedbackResponses: (feedbackResult.rows as Array<{ response_id: string; batch_id: string; batch_name: string; branch: string; course: string; semester: string; student_name: string; mobile_number: string; email: string; submitted_at: Date | string; faculty_responses: unknown; support_responses: unknown; general_response: unknown; overall_comment: string }>).map((row) => ({ responseId: row.response_id, batchId: row.batch_id, batchName: row.batch_name, branch: row.branch, course: row.course, semester: row.semester, studentName: row.student_name, mobileNumber: row.mobile_number, email: row.email, submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : row.submitted_at.toISOString(), facultyResponses: Array.isArray(row.faculty_responses) ? row.faculty_responses : [], supportResponses: Array.isArray(row.support_responses) ? row.support_responses : [], generalResponse: parseGeneralResponse(row.general_response), overallComment: row.overall_comment })),
  };
}

export async function writeAdminStore(store: AdminStore) { await ensureDatabaseStore(); const client = await pgPool.connect(); try { await persistStore(client, store); } finally { client.release(); } }
export async function saveFeedbackSubmission(submission: FeedbackSubmission) { const store = await readAdminStore(); store.feedbackResponses = [{ ...submission, responseId: submission.responseId ?? createId("response") }, ...store.feedbackResponses]; await writeAdminStore(store); }
export async function deleteFeedbackResponse(responseId: string) { const store = await readAdminStore(); store.feedbackResponses = store.feedbackResponses.filter((response) => response.responseId !== responseId); await writeAdminStore(store); }
export async function deleteFeedbackResponses(responseIds: string[]) { const ids = new Set(responseIds.filter(Boolean)); if (ids.size === 0) return; const store = await readAdminStore(); store.feedbackResponses = store.feedbackResponses.filter((response) => !response.responseId || !ids.has(response.responseId)); await writeAdminStore(store); }

export async function getActiveFeedbackConfig(): Promise<BatchFeedbackConfig | null> {
  const store = await readAdminStore();
  const batches = store.batches.filter((batch) => batch.status === "active").map((batch) => { const { branch, course } = getActiveBatchDependencies(store, batch); if (!branch || !course) return null; return { id: batch.id, name: batch.name, branch: branch.name, course: course.name, semester: batch.semester, strength: batch.strength, faculties: store.faculties.filter((faculty) => batch.facultyIds.includes(faculty.id)) }; }).filter(Boolean) as BatchFeedbackConfig["batches"];
  if (batches.length === 0) return null;
  return { defaultBatchId: batches[0].id, batches, facultyQuestions: store.questions.filter((question) => question.category === "faculty"), supportSections: [], generalQuestions: store.questions.filter((question) => question.category === "general") };
}

export async function addBranch(name: string) { const store = await readAdminStore(); store.branches = uniqueByName([...store.branches, { id: createId("branch"), name }]); await writeAdminStore(store); }
export async function bulkAddBranches(names: string[]) { const store = await readAdminStore(); store.branches = uniqueByName([...store.branches, ...names.map((name) => ({ id: createId("branch"), name }))]); await writeAdminStore(store); }
export async function updateBranch(id: string, name: string) { const store = await readAdminStore(); store.branches = store.branches.map((branch) => (branch.id === id ? { ...branch, name } : branch)); await writeAdminStore(store); }
export async function deleteBranch(id: string) { const store = await readAdminStore(); store.branches = store.branches.filter((branch) => branch.id !== id); store.batches = store.batches.filter((batch) => batch.branchId !== id); resetActiveBatchIfMissing(store); await writeAdminStore(store); }
export async function addCourse(name: string) { const store = await readAdminStore(); store.courses = uniqueByName([...store.courses, { id: createId("course"), name }]); await writeAdminStore(store); }
export async function bulkAddCourses(names: string[]) { const store = await readAdminStore(); store.courses = uniqueByName([...store.courses, ...names.map((name) => ({ id: createId("course"), name }))]); await writeAdminStore(store); }
export async function updateCourse(id: string, name: string) { const store = await readAdminStore(); store.courses = store.courses.map((course) => (course.id === id ? { ...course, name } : course)); await writeAdminStore(store); }
export async function deleteCourse(id: string) { const store = await readAdminStore(); store.courses = store.courses.filter((course) => course.id !== id); store.batches = store.batches.filter((batch) => batch.courseId !== id); resetActiveBatchIfMissing(store); await writeAdminStore(store); }
export async function addFaculty(payload: Omit<AdminStore["faculties"][number], "id">, batchIds: string[]) { const store = await readAdminStore(); const createdFaculty = { id: createId("faculty"), ...payload }; store.faculties = uniqueByName([...store.faculties, createdFaculty]); const savedFaculty = store.faculties.find((faculty) => faculty.name.trim().toLowerCase() === payload.name.trim().toLowerCase()); if (savedFaculty) { const targetBatchIds = new Set(batchIds); store.batches = store.batches.map((batch) => ({ ...batch, facultyIds: targetBatchIds.has(batch.id) ? Array.from(new Set([...batch.facultyIds, savedFaculty.id])) : batch.facultyIds })); } await writeAdminStore(store); }
export async function updateFaculty(id: string, payload: Omit<AdminStore["faculties"][number], "id">, batchIds: string[]) { const store = await readAdminStore(); const targetBatchIds = new Set(batchIds); store.faculties = store.faculties.map((faculty) => (faculty.id === id ? { id, ...payload } : faculty)); store.batches = store.batches.map((batch) => ({ ...batch, facultyIds: targetBatchIds.has(batch.id) ? Array.from(new Set([...batch.facultyIds.filter((facultyId) => facultyId !== id), id])) : batch.facultyIds.filter((facultyId) => facultyId !== id) })); await writeAdminStore(store); }
export async function deleteFaculty(id: string) { const store = await readAdminStore(); store.faculties = store.faculties.filter((faculty) => faculty.id !== id); store.batches = store.batches.map((batch) => ({ ...batch, facultyIds: batch.facultyIds.filter((facultyId) => facultyId !== id) })); await writeAdminStore(store); }
async function addSimplePeople(kind: "coordinators" | "mentors", names: string[]) { const store = await readAdminStore(); const next = names.map((name) => ({ id: createId(kind === "coordinators" ? "coord" : "mentor"), name })); store[kind] = uniqueByName([...(store[kind] as AdminSimplePerson[]), ...next]) as never; await writeAdminStore(store); }
export async function addCoordinator(name: string) { await addSimplePeople("coordinators", [name]); }
export async function updateCoordinator(id: string, name: string) { const store = await readAdminStore(); store.coordinators = store.coordinators.map((item) => (item.id === id ? { ...item, name } : item)); await writeAdminStore(store); }
export async function deleteCoordinator(id: string) { const store = await readAdminStore(); store.coordinators = store.coordinators.filter((item) => item.id !== id); store.batches = store.batches.map((batch) => ({ ...batch, coordinatorId: batch.coordinatorId === id ? null : batch.coordinatorId })); await writeAdminStore(store); }
export async function addMentor(name: string) { await addSimplePeople("mentors", [name]); }
export async function updateMentor(id: string, name: string) { const store = await readAdminStore(); store.mentors = store.mentors.map((item) => (item.id === id ? { ...item, name } : item)); await writeAdminStore(store); }
export async function deleteMentor(id: string) { const store = await readAdminStore(); store.mentors = store.mentors.filter((item) => item.id !== id); store.batches = store.batches.map((batch) => ({ ...batch, mentorId: batch.mentorId === id ? null : batch.mentorId })); await writeAdminStore(store); }
export async function addQuestion(payload: { text: string; helper: string; category: AdminQuestionCategory; inputType: "rating" | "text" | "textarea" | "single_choice"; options: string[]; mandatory: boolean; }) { const store = await readAdminStore(); store.questions.push({ id: createId("question"), ...payload }); await writeAdminStore(store); }
export async function updateQuestion(id: string, payload: { text: string; helper: string; category: AdminQuestionCategory; inputType: "rating" | "text" | "textarea" | "single_choice"; options: string[]; mandatory: boolean; }) { const store = await readAdminStore(); store.questions = store.questions.map((question) => (question.id === id ? { id, ...payload } : question)); await writeAdminStore(store); }
export async function deleteQuestion(id: string) { const store = await readAdminStore(); store.questions = store.questions.filter((question) => question.id !== id); await writeAdminStore(store); }
export async function addBatch(payload: Omit<AdminBatch, "id">) { const store = await readAdminStore(); store.batches.push({ id: createId("batch"), ...payload, status: payload.status ?? "active" }); if (!store.activeBatchId) store.activeBatchId = store.batches.find((batch) => batch.status === "active")?.id ?? null; await writeAdminStore(store); }
export async function updateBatch(id: string, payload: Omit<AdminBatch, "id">) { const store = await readAdminStore(); store.batches = store.batches.map((batch) => (batch.id === id ? { id, ...payload } : batch)); await writeAdminStore(store); }
export async function deleteBatch(id: string) { const store = await readAdminStore(); store.batches = store.batches.filter((batch) => batch.id !== id); resetActiveBatchIfMissing(store); await writeAdminStore(store); }
export async function updateBatchStatus(id: string, status: "active" | "inactive") { const store = await readAdminStore(); store.batches = store.batches.map((batch) => (batch.id === id ? { ...batch, status } : batch)); resetActiveBatchIfMissing(store); await writeAdminStore(store); }

export async function importMasterCsv(csvText: string) {
  const store = await readAdminStore(); const rows = parseCsv(csvText.replace(/^\uFEFF/, ""));
  const summary = { processedRows: 0, createdBranches: 0, createdCourses: 0, createdBatches: 0, createdFaculties: 0, linkedFaculties: 0 };
  if (rows.length < 2) return summary;
  const headers = rows[0].map((header) => header.trim().toLowerCase()); const indexOf = (name: string) => headers.indexOf(name);
  for (const row of rows.slice(1)) {
    const branchName = row[indexOf("branch")]?.trim() ?? ""; const courseName = row[indexOf("course")]?.trim() ?? ""; const batchName = row[indexOf("batch")]?.trim() ?? ""; const facultyName = row[indexOf("faculty_name")]?.trim() ?? "";
    if (!branchName || !courseName || !batchName) continue; summary.processedRows += 1;
    const previousBranchCount = store.branches.length; const branch = findOrCreateByName(store.branches, branchName, "branch"); if (store.branches.length > previousBranchCount) summary.createdBranches += 1;
    const previousCourseCount = store.courses.length; const course = findOrCreateByName(store.courses, courseName, "course"); if (store.courses.length > previousCourseCount) summary.createdCourses += 1;
    let facultyId: string | null = null;
    if (facultyName) {
      const existingFaculty = store.faculties.find((item) => item.name.trim().toLowerCase() === facultyName.toLowerCase());
      if (existingFaculty) facultyId = existingFaculty.id;
      else { const createdFaculty = { id: createId("faculty"), name: facultyName, subject: "General", designation: "Faculty", sessionsHandled: 1 }; store.faculties.push(createdFaculty); summary.createdFaculties += 1; facultyId = createdFaculty.id; }
    }
    const existingBatch = store.batches.find((item) => item.name.trim().toLowerCase() === batchName.toLowerCase() && item.branchId === branch.id && item.courseId === course.id);
    if (existingBatch) { if (facultyId && !existingBatch.facultyIds.includes(facultyId)) { existingBatch.facultyIds.push(facultyId); summary.linkedFaculties += 1; } continue; }
    store.batches.push({ id: createId("batch"), name: batchName, branchId: branch.id, courseId: course.id, semester: "Semester 1", strength: 0, facultyIds: facultyId ? [facultyId] : [], coordinatorId: null, mentorId: null, status: "active" });
    summary.createdBatches += 1; if (facultyId) summary.linkedFaculties += 1;
  }
  resetActiveBatchIfMissing(store); await writeAdminStore(store); return summary;
}

export function parseSimpleBulkInput(value: string) { return parseLines(value); }
export function parseBulkFacultyInput(value: string) { return parseLines(value).map((line) => { const [name, subject, designation, sessionsHandled] = line.split("|").map((item) => item.trim()); return { name, subject, designation, sessionsHandled: Number(sessionsHandled) }; }).filter((item) => item.name && item.subject && item.designation && item.sessionsHandled > 0); }
