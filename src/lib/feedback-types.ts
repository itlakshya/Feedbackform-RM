export type QuestionInputType = "rating" | "text" | "textarea" | "single_choice";

export type FeedbackQuestion = {
  id: string;
  text: string;
  helper: string;
  inputType: QuestionInputType;
  options: string[];
};

export type GeneralFeedbackQuestion = FeedbackQuestion & {
  mandatory: boolean;
};

export type FacultyMember = {
  id: string;
  name: string;
  subject: string;
  designation: string;
  sessionsHandled: number;
};

export type SupportOwner = {
  id: string;
  name: string;
};

export type SupportSection = {
  id: string;
  title: string;
  description: string;
  owner: SupportOwner | null;
  questions: FeedbackQuestion[];
};

export type ActiveFeedbackBatch = {
  id: string;
  name: string;
  branch: string;
  course: string;
  semester: string;
  strength: number;
  faculties: FacultyMember[];
};

export type BatchFeedbackConfig = {
  defaultBatchId: string;
  batches: ActiveFeedbackBatch[];
  facultyQuestions: FeedbackQuestion[];
  supportSections: SupportSection[];
  generalQuestions: GeneralFeedbackQuestion[];
};

export type QuestionAnswer = {
  questionId: string;
  questionText: string;
  inputType: QuestionInputType;
  value: string;
};

export type FacultyFeedbackResponse = {
  facultyId: string;
  facultyName: string;
  subject: string;
  averageScore: number;
  answers: QuestionAnswer[];
  comment: string;
};

export type SupportFeedbackResponse = {
  sectionId: string;
  sectionTitle: string;
  ownerName: string;
  averageScore: number;
  answers: QuestionAnswer[];
  comment: string;
};

export type GeneralFeedbackResponse = {
  averageScore: number;
  answers: QuestionAnswer[];
  comment: string;
};

export type FeedbackSubmission = {
  responseId?: string;
  batchId: string;
  batchName: string;
  branch: string;
  course: string;
  semester: string;
  studentName: string;
  mobileNumber: string;
  email: string;
  submittedAt: string;
  facultyResponses: FacultyFeedbackResponse[];
  supportResponses: SupportFeedbackResponse[];
  generalResponse: GeneralFeedbackResponse;
  overallComment: string;
};
