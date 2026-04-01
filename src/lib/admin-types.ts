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

export type AdminCourse = {
  id: string;
  name: string;
};

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
