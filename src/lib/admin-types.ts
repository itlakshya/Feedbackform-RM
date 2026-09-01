import type { PaginatedList } from "./admin-pagination";
import type { FacultyMember, FeedbackQuestion, FeedbackSubmission } from "./feedback-types";

export type AdminQuestionCategory = "faculty" | "coordinator" | "mentor" | "general";

export type AdminIdentity = {
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
};

export type AdminBranch = {
  id: string;
  name: string;
};

export type BranchListPage = PaginatedList<AdminBranch>;

export type NamedOption = {
  id: string;
  name: string;
};

export type BatchListItem = {
  id: string;
  name: string;
  branchId: string;
  courseId: string;
  status: BatchStatus;
  branchName: string;
  courseName: string;
};

export type BatchListPage = PaginatedList<BatchListItem>;

export type BatchMetrics = {
  total: number;
  active: number;
  students: number;
};

export type DashboardCounts = {
  branches: number;
  courses: number;
  batches: number;
  faculties: number;
  coordinators: number;
  mentors: number;
  questions: number;
};

export type ActiveBatchListPage = PaginatedList<NamedOption>;

export type FacultyListItem = FacultyMember & {
  batchIds: string[];
  batchNames: string[];
  branchNames: string[];
  courseNames: string[];
};

export type FacultyListPage = PaginatedList<FacultyListItem>;

export type FacultyMetrics = {
  total: number;
  assignments: number;
};

export type QuestionListPage = PaginatedList<AdminQuestion>;

export type QuestionMetrics = {
  total: number;
  faculty: number;
  general: number;
};

export type FeedbackResponseListPage = PaginatedList<FeedbackSubmission>;

export type FeedbackResponseMetrics = {
  responses: number;
  rows: number;
  students: number;
};

export type AdminCourse = {
  id: string;
  name: string;
};

export type CourseListPage = PaginatedList<AdminCourse>;

export type AdminSimplePerson = {
  id: string;
  name: string;
};

export type AdminQuestion = FeedbackQuestion & {
  category: AdminQuestionCategory;
  mandatory: boolean;
};

export type BatchStatus = "active" | "inactive";

export type AdminBatch = {
  id: string;
  name: string;
  branchId: string;
  courseId: string;
  semester: string;
  strength: number;
  facultyIds: string[];
  coordinatorId: string | null;
  mentorId: string | null;
  status: BatchStatus;
};

export type AdminStore = {
  admin: AdminIdentity;
  activeBatchId: string | null;
  branches: AdminBranch[];
  courses: AdminCourse[];
  faculties: FacultyMember[];
  coordinators: AdminSimplePerson[];
  mentors: AdminSimplePerson[];
  questions: AdminQuestion[];
  batches: AdminBatch[];
  feedbackResponses: FeedbackSubmission[];
};
