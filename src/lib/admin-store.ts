
import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPgPool } from "@/lib/postgres";
import { ADMIN_PAGE_SIZE, paginationMeta, type QuestionCategoryFilter } from "@/lib/admin-pagination";
import type { ActiveBatchListPage, AdminBatch, AdminBranch, AdminCourse, AdminIdentity, AdminQuestion, AdminQuestionCategory, AdminSimplePerson, AdminStore, BatchListItem, BatchListPage, BatchMetrics, BranchListPage, CourseListPage, DashboardCounts, FacultyListItem, FacultyListPage, FacultyMetrics, FeedbackResponseListPage, FeedbackResponseMetrics, NamedOption, QuestionListPage, QuestionMetrics } from "@/lib/admin-types";
import type { BatchFeedbackConfig, FeedbackSubmission, GeneralFeedbackResponse } from "@/lib/feedback-types";

const seedStorePath = path.join(process.cwd(), "data", "admin-store.json");
let bootstrapPromise: Promise<void> | null = null;
type Queryable = Pick<PoolClient, "query">;

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
  await getPgPool().query(`
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
  const tableCheck = await getPgPool().query<{ table_name: string | null }>("SELECT to_regclass('public.app_store') AS table_name");
  if (!tableCheck.rows[0]?.table_name) return null;
  const result = await getPgPool().query<{ payload: Partial<AdminStore> }>("SELECT payload FROM app_store WHERE store_key = $1", ["admin-store"]);
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
      const counts = await readStoreCounts(getPgPool());
      if (Object.values(counts).some((value) => value > 0)) return;
      const legacyStore = (await readLegacyStore()) ?? (await readSeedStore());
      const client = await getPgPool().connect();
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

function getFacultyColumnIndexes(headers: string[]) {
  return headers.reduce<number[]>((indexes, header, index) => {
    const normalized = header.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (normalized === "faculty" || normalized === "faculty_name" || /^faculty_?\d+$/.test(normalized) || /^faculty_name_?\d+$/.test(normalized)) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

function getUniqueFacultyNames(row: string[], facultyColumnIndexes: number[]) {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const index of facultyColumnIndexes) {
    const name = row[index]?.trim() ?? "";
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function parseQuestionOptions(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []; }
function parseGeneralResponse(value: unknown): GeneralFeedbackResponse { if (value && typeof value === "object") { const parsed = value as GeneralFeedbackResponse; return { averageScore: Number(parsed.averageScore ?? 0), answers: Array.isArray(parsed.answers) ? parsed.answers : [], comment: typeof parsed.comment === "string" ? parsed.comment : "" }; } return { averageScore: 0, answers: [], comment: "" }; }
type FeedbackResponseRow = { response_id: string; batch_id: string; batch_name: string; branch: string; course: string; semester: string; student_name: string; mobile_number: string; email: string; submitted_at: Date | string; faculty_responses: unknown; support_responses: unknown; general_response: unknown; overall_comment: string };
function mapFeedbackResponseRow(row: FeedbackResponseRow): FeedbackSubmission {
  return {
    responseId: row.response_id,
    batchId: row.batch_id,
    batchName: row.batch_name,
    branch: row.branch,
    course: row.course,
    semester: row.semester,
    studentName: row.student_name,
    mobileNumber: row.mobile_number,
    email: row.email,
    submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : row.submitted_at.toISOString(),
    facultyResponses: Array.isArray(row.faculty_responses) ? row.faculty_responses : [],
    supportResponses: Array.isArray(row.support_responses) ? row.support_responses : [],
    generalResponse: parseGeneralResponse(row.general_response),
    overallComment: row.overall_comment,
  };
}
function getActiveBatchDependencies(store: AdminStore, batch: AdminBatch) { return { branch: store.branches.find((item) => item.id === batch.branchId) ?? null, course: store.courses.find((item) => item.id === batch.courseId) ?? null, coordinator: store.coordinators.find((item) => item.id === batch.coordinatorId) ?? null, mentor: store.mentors.find((item) => item.id === batch.mentorId) ?? null }; }
function resetActiveBatchIfMissing(store: AdminStore) { if (!store.batches.some((batch) => batch.id === store.activeBatchId)) store.activeBatchId = store.batches.find((batch) => batch.status === "active")?.id ?? null; }
function findOrCreateByName<T extends { id: string; name: string }>(list: T[], name: string, prefix: string) { const normalized = name.trim().toLowerCase(); const existing = list.find((item) => item.name.trim().toLowerCase() === normalized); if (existing) return existing; const created = { id: createId(prefix), name: name.trim() } as T; list.push(created); return created; }

export async function readAdminStore(): Promise<AdminStore> {
  await ensureDatabaseStore();
  const [configResult, branchResult, courseResult, facultyResult, coordinatorResult, mentorResult, questionResult, batchResult, batchFacultyResult, feedbackResult] = await Promise.all([
    getPgPool().query("SELECT config_key, config_value FROM app_config"), getPgPool().query("SELECT id, name FROM branches ORDER BY LOWER(name), id"), getPgPool().query("SELECT id, name FROM courses ORDER BY LOWER(name), id"), getPgPool().query("SELECT id, name, subject, designation, sessions_handled FROM faculties ORDER BY LOWER(name), id"), getPgPool().query("SELECT id, name FROM coordinators ORDER BY LOWER(name), id"), getPgPool().query("SELECT id, name FROM mentors ORDER BY LOWER(name), id"), getPgPool().query("SELECT id, text, helper, category, input_type, options, mandatory FROM questions ORDER BY id"), getPgPool().query("SELECT id, name, branch_id, course_id, semester, strength, coordinator_id, mentor_id, status FROM batches ORDER BY LOWER(name), id"), getPgPool().query("SELECT batch_id, faculty_id FROM batch_faculties ORDER BY batch_id, faculty_id"), getPgPool().query("SELECT response_id, batch_id, batch_name, branch, course, semester, student_name, mobile_number, email, submitted_at, faculty_responses, support_responses, general_response, overall_comment FROM feedback_responses ORDER BY submitted_at DESC, response_id DESC")
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
    feedbackResponses: (feedbackResult.rows as FeedbackResponseRow[]).map(mapFeedbackResponseRow),
  };
}

export async function listNamedOptions(table: "branches" | "courses" | "batches"): Promise<NamedOption[]> {
  await ensureDatabaseStore();
  const result = await getPgPool().query<NamedOption>(`SELECT id, name FROM ${table} ORDER BY LOWER(name), id`);
  return result.rows;
}

export async function listBranchesPage(page = 1, pageSize = ADMIN_PAGE_SIZE): Promise<BranchListPage> {
  await ensureDatabaseStore();
  const countResult = await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM branches");
  const total = countResult.rows[0]?.count ?? 0;
  const { safeSize, safePage, totalPages, offset } = paginationMeta(total, page, pageSize);
  const pageResult = await getPgPool().query<AdminBranch>("SELECT id, name FROM branches ORDER BY LOWER(name), id LIMIT $1 OFFSET $2", [safeSize, offset]);
  return { items: pageResult.rows, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function listCoursesPage(page = 1, pageSize = ADMIN_PAGE_SIZE): Promise<CourseListPage> {
  await ensureDatabaseStore();
  const countResult = await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM courses");
  const total = countResult.rows[0]?.count ?? 0;
  const { safeSize, safePage, totalPages, offset } = paginationMeta(total, page, pageSize);
  const pageResult = await getPgPool().query<AdminCourse>("SELECT id, name FROM courses ORDER BY LOWER(name), id LIMIT $1 OFFSET $2", [safeSize, offset]);
  return { items: pageResult.rows, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function countBatches() {
  await ensureDatabaseStore();
  const result = await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM batches");
  return result.rows[0]?.count ?? 0;
}

export async function countActiveBatches() {
  await ensureDatabaseStore();
  const result = await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM batches WHERE status = 'active'");
  return result.rows[0]?.count ?? 0;
}

export async function getBatchMetrics(): Promise<BatchMetrics> {
  await ensureDatabaseStore();
  const result = await getPgPool().query<BatchMetrics>(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active, COALESCE(SUM(strength), 0)::int AS students FROM batches`);
  return result.rows[0] ?? { total: 0, active: 0, students: 0 };
}

export async function listBatchesPage(page = 1, pageSize = ADMIN_PAGE_SIZE): Promise<BatchListPage> {
  await ensureDatabaseStore();
  const countResult = await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM batches");
  const total = countResult.rows[0]?.count ?? 0;
  const { safeSize, safePage, totalPages, offset } = paginationMeta(total, page, pageSize);
  const pageResult = await getPgPool().query<BatchListItem>(
    `SELECT b.id, b.name, b.branch_id AS "branchId", b.course_id AS "courseId", b.status, COALESCE(br.name, '') AS "branchName", COALESCE(c.name, '') AS "courseName"
     FROM batches b
     LEFT JOIN branches br ON br.id = b.branch_id
     LEFT JOIN courses c ON c.id = b.course_id
     ORDER BY LOWER(b.name), b.id
     LIMIT $1 OFFSET $2`,
    [safeSize, offset],
  );
  return { items: pageResult.rows, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  await ensureDatabaseStore();
  const result = await getPgPool().query<DashboardCounts>(
    `SELECT
      (SELECT COUNT(*)::int FROM branches) AS branches,
      (SELECT COUNT(*)::int FROM courses) AS courses,
      (SELECT COUNT(*)::int FROM batches) AS batches,
      (SELECT COUNT(*)::int FROM faculties) AS faculties,
      (SELECT COUNT(*)::int FROM coordinators) AS coordinators,
      (SELECT COUNT(*)::int FROM mentors) AS mentors,
      (SELECT COUNT(*)::int FROM questions) AS questions`,
  );
  return result.rows[0] ?? { branches: 0, courses: 0, batches: 0, faculties: 0, coordinators: 0, mentors: 0, questions: 0 };
}

export async function listActiveBatchesPage(page = 1, pageSize = ADMIN_PAGE_SIZE): Promise<ActiveBatchListPage> {
  await ensureDatabaseStore();
  const countResult = await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM batches WHERE status = 'active'");
  const total = countResult.rows[0]?.count ?? 0;
  const { safeSize, safePage, totalPages, offset } = paginationMeta(total, page, pageSize);
  const pageResult = await getPgPool().query<NamedOption>(
    "SELECT id, name FROM batches WHERE status = 'active' ORDER BY LOWER(name), id LIMIT $1 OFFSET $2",
    [safeSize, offset],
  );
  return { items: pageResult.rows, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function getFacultyMetrics(): Promise<FacultyMetrics> {
  await ensureDatabaseStore();
  const result = await getPgPool().query<FacultyMetrics>(`SELECT (SELECT COUNT(*)::int FROM faculties) AS total, (SELECT COUNT(*)::int FROM batch_faculties) AS assignments`);
  return result.rows[0] ?? { total: 0, assignments: 0 };
}

export async function listFacultiesPage(page = 1, pageSize = ADMIN_PAGE_SIZE): Promise<FacultyListPage> {
  await ensureDatabaseStore();
  const countResult = await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM faculties");
  const total = countResult.rows[0]?.count ?? 0;
  const { safeSize, safePage, totalPages, offset } = paginationMeta(total, page, pageSize);
  const facultyResult = await getPgPool().query<{ id: string; name: string; subject: string; designation: string; sessions_handled: number }>(
    "SELECT id, name, subject, designation, sessions_handled FROM faculties ORDER BY LOWER(name), id LIMIT $1 OFFSET $2",
    [safeSize, offset],
  );
  const facultyIds = facultyResult.rows.map((row) => row.id);
  const assignmentMap = new Map<string, { batchIds: string[]; batchNames: string[]; branchNames: Set<string>; courseNames: Set<string> }>();
  for (const id of facultyIds) assignmentMap.set(id, { batchIds: [], batchNames: [], branchNames: new Set(), courseNames: new Set() });
  if (facultyIds.length > 0) {
    const assignmentResult = await getPgPool().query<{ faculty_id: string; batch_id: string; batch_name: string; branch_name: string | null; course_name: string | null }>(
      `SELECT bf.faculty_id, bf.batch_id, b.name AS batch_name, br.name AS branch_name, c.name AS course_name
       FROM batch_faculties bf
       INNER JOIN batches b ON b.id = bf.batch_id
       LEFT JOIN branches br ON br.id = b.branch_id
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE bf.faculty_id = ANY($1::text[])
       ORDER BY LOWER(b.name), b.id`,
      [facultyIds],
    );
    for (const row of assignmentResult.rows) {
      const current = assignmentMap.get(row.faculty_id);
      if (!current) continue;
      current.batchIds.push(row.batch_id);
      current.batchNames.push(row.batch_name);
      if (row.branch_name) current.branchNames.add(row.branch_name);
      if (row.course_name) current.courseNames.add(row.course_name);
    }
  }
  const items: FacultyListItem[] = facultyResult.rows.map((row) => {
    const assignment = assignmentMap.get(row.id) ?? { batchIds: [], batchNames: [], branchNames: new Set<string>(), courseNames: new Set<string>() };
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      designation: row.designation,
      sessionsHandled: Number(row.sessions_handled ?? 1),
      batchIds: assignment.batchIds,
      batchNames: assignment.batchNames,
      branchNames: Array.from(assignment.branchNames),
      courseNames: Array.from(assignment.courseNames),
    };
  });
  return { items, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function getQuestionMetrics(): Promise<QuestionMetrics> {
  await ensureDatabaseStore();
  const result = await getPgPool().query<QuestionMetrics>(
    `SELECT COUNT(*) FILTER (WHERE category IN ('faculty', 'general'))::int AS total, COUNT(*) FILTER (WHERE category = 'faculty')::int AS faculty, COUNT(*) FILTER (WHERE category = 'general')::int AS general FROM questions`,
  );
  return result.rows[0] ?? { total: 0, faculty: 0, general: 0 };
}

export async function listQuestionsPage(page = 1, pageSize = ADMIN_PAGE_SIZE, category: QuestionCategoryFilter = "all"): Promise<QuestionListPage> {
  await ensureDatabaseStore();
  const countResult = category === "all"
    ? await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM questions WHERE category IN ('faculty', 'general')")
    : await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM questions WHERE category = $1", [category]);
  const total = countResult.rows[0]?.count ?? 0;
  const { safeSize, safePage, totalPages, offset } = paginationMeta(total, page, pageSize);
  const pageResult = category === "all"
    ? await getPgPool().query<{ id: string; text: string; helper: string; category: AdminQuestionCategory; input_type: AdminQuestion["inputType"]; options: unknown; mandatory: boolean }>(
        `SELECT id, text, helper, category, input_type, options, mandatory FROM questions WHERE category IN ('faculty', 'general') ORDER BY id LIMIT $1 OFFSET $2`,
        [safeSize, offset],
      )
    : await getPgPool().query<{ id: string; text: string; helper: string; category: AdminQuestionCategory; input_type: AdminQuestion["inputType"]; options: unknown; mandatory: boolean }>(
        `SELECT id, text, helper, category, input_type, options, mandatory FROM questions WHERE category = $1 ORDER BY id LIMIT $2 OFFSET $3`,
        [category, safeSize, offset],
      );
  return {
    items: pageResult.rows.map((row) => ({
      id: row.id,
      text: row.text,
      helper: row.helper,
      category: row.category,
      inputType: row.input_type,
      options: parseQuestionOptions(row.options),
      mandatory: row.category === "general" ? Boolean(row.mandatory) : false,
    })),
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages,
  };
}

export async function getFeedbackResponseMetrics(): Promise<FeedbackResponseMetrics> {
  await ensureDatabaseStore();
  const result = await getPgPool().query<FeedbackResponseMetrics>(
    `SELECT
      COUNT(*)::int AS responses,
      COALESCE(SUM(GREATEST(CASE WHEN jsonb_typeof(faculty_responses) = 'array' THEN jsonb_array_length(faculty_responses) ELSE 0 END, 1)), 0)::int AS rows,
      COUNT(DISTINCT email)::int AS students
     FROM feedback_responses`,
  );
  return result.rows[0] ?? { responses: 0, rows: 0, students: 0 };
}

export async function listFeedbackTableQuestions() {
  await ensureDatabaseStore();
  const result = await getPgPool().query<{ category: AdminQuestionCategory; text: string }>(
    `SELECT category, text FROM questions WHERE category IN ('faculty', 'general') ORDER BY id`,
  );
  return result.rows;
}

export async function listFeedbackResponsesPage(page = 1, pageSize = ADMIN_PAGE_SIZE): Promise<FeedbackResponseListPage> {
  await ensureDatabaseStore();
  const countResult = await getPgPool().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM feedback_responses");
  const total = countResult.rows[0]?.count ?? 0;
  const { safeSize, safePage, totalPages, offset } = paginationMeta(total, page, pageSize);
  const pageResult = await getPgPool().query<FeedbackResponseRow>(
    `SELECT response_id, batch_id, batch_name, branch, course, semester, student_name, mobile_number, email, submitted_at, faculty_responses, support_responses, general_response, overall_comment
     FROM feedback_responses
     ORDER BY submitted_at DESC, response_id DESC
     LIMIT $1 OFFSET $2`,
    [safeSize, offset],
  );
  return { items: pageResult.rows.map(mapFeedbackResponseRow), total, page: safePage, pageSize: safeSize, totalPages };
}

export async function writeAdminStore(store: AdminStore) { await ensureDatabaseStore(); const client = await getPgPool().connect(); try { await persistStore(client, store); } finally { client.release(); } }
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
  const facultyColumnIndexes = getFacultyColumnIndexes(headers);
  for (const row of rows.slice(1)) {
    const branchName = row[indexOf("branch")]?.trim() ?? ""; const courseName = row[indexOf("course")]?.trim() ?? ""; const batchName = row[indexOf("batch")]?.trim() ?? "";
    if (!branchName || !courseName || !batchName) continue; summary.processedRows += 1;
    const previousBranchCount = store.branches.length; const branch = findOrCreateByName(store.branches, branchName, "branch"); if (store.branches.length > previousBranchCount) summary.createdBranches += 1;
    const previousCourseCount = store.courses.length; const course = findOrCreateByName(store.courses, courseName, "course"); if (store.courses.length > previousCourseCount) summary.createdCourses += 1;
    const facultyIds: string[] = [];
    for (const facultyName of getUniqueFacultyNames(row, facultyColumnIndexes)) {
      const existingFaculty = store.faculties.find((item) => item.name.trim().toLowerCase() === facultyName.toLowerCase());
      if (existingFaculty) { facultyIds.push(existingFaculty.id); continue; }
      const createdFaculty = { id: createId("faculty"), name: facultyName, subject: "General", designation: "Faculty", sessionsHandled: 1 };
      store.faculties.push(createdFaculty); summary.createdFaculties += 1; facultyIds.push(createdFaculty.id);
    }
    const existingBatch = store.batches.find((item) => item.name.trim().toLowerCase() === batchName.toLowerCase() && item.branchId === branch.id && item.courseId === course.id);
    if (existingBatch) {
      for (const facultyId of facultyIds) {
        if (!existingBatch.facultyIds.includes(facultyId)) { existingBatch.facultyIds.push(facultyId); summary.linkedFaculties += 1; }
      }
      continue;
    }
    store.batches.push({ id: createId("batch"), name: batchName, branchId: branch.id, courseId: course.id, semester: "Semester 1", strength: 0, facultyIds, coordinatorId: null, mentorId: null, status: "active" });
    summary.createdBatches += 1; summary.linkedFaculties += facultyIds.length;
  }
  resetActiveBatchIfMissing(store); await writeAdminStore(store); return summary;
}

export function parseSimpleBulkInput(value: string) { return parseLines(value); }
export function parseBulkFacultyInput(value: string) { return parseLines(value).map((line) => { const [name, subject, designation, sessionsHandled] = line.split("|").map((item) => item.trim()); return { name, subject, designation, sessionsHandled: Number(sessionsHandled) }; }).filter((item) => item.name && item.subject && item.designation && item.sessionsHandled > 0); }
