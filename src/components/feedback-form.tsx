
"use client";

import Image from "next/image";
import { startTransition, useEffect, useMemo, useState } from "react";
import { saveFeedbackSubmissionAction } from "@/app/admin/actions";
import type {
  ActiveFeedbackBatch,
  BatchFeedbackConfig,
  FacultyFeedbackResponse,
  FeedbackQuestion,
  FeedbackSubmission,
  GeneralFeedbackResponse,
  QuestionAnswer,
  SupportFeedbackResponse,
} from "@/lib/feedback-types";

type FeedbackFormProps = {
  config: BatchFeedbackConfig;
};

type FormStep =
  | { id: string; title: string; subtitle: string; kind: "student" }
  | { id: string; title: string; subtitle: string; kind: "academic" }
  | { id: string; title: string; subtitle: string; kind: "faculty"; facultyId: string }
  | { id: string; title: string; subtitle: string; kind: "support"; sectionId: string }
  | { id: string; title: string; subtitle: string; kind: "general" };

const scoreLegend = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Excellent" },
];

function getRatingTone(value: number) {
  if (value <= 2) return "border-rose-500 bg-rose-500 text-white";
  if (value == 3) return "border-amber-500 bg-amber-500 text-white";
  return "border-emerald-600 bg-emerald-600 text-white";
}

const getAllFaculties = (config: BatchFeedbackConfig) =>
  Array.from(new Map(config.batches.flatMap((batch) => batch.faculties).map((faculty) => [faculty.id, faculty])).values());

const emptyFacultyAnswers = (config: BatchFeedbackConfig) =>
  Object.fromEntries(
    getAllFaculties(config).map((faculty) => [
      faculty.id,
      Object.fromEntries(config.facultyQuestions.map((question) => [question.id, ""])),
    ])
  ) as Record<string, Record<string, string>>;

const emptyComments = (config: BatchFeedbackConfig) =>
  Object.fromEntries(getAllFaculties(config).map((faculty) => [faculty.id, ""])) as Record<string, string>;

const emptySupportAnswers = (config: BatchFeedbackConfig) =>
  Object.fromEntries(
    config.supportSections.map((section) => [
      section.id,
      Object.fromEntries(section.questions.map((question) => [question.id, ""])),
    ])
  ) as Record<string, Record<string, string>>;

const emptySupportComments = (config: BatchFeedbackConfig) =>
  Object.fromEntries(config.supportSections.map((section) => [section.id, ""])) as Record<string, string>;

const emptyGeneralAnswers = (config: BatchFeedbackConfig) =>
  Object.fromEntries(config.generalQuestions.map((question) => [question.id, ""])) as Record<string, string>;

function isAnswered(value: string) {
  return value.trim().length > 0;
}

function buildQuestionAnswer(question: FeedbackQuestion, value: string): QuestionAnswer {
  return {
    questionId: question.id,
    questionText: question.text,
    inputType: question.inputType,
    value: value.trim(),
  };
}

function computeAverageScore(answers: QuestionAnswer[]) {
  const ratingScores = answers
    .filter((answer) => answer.inputType === "rating" && answer.value)
    .map((answer) => Number(answer.value))
    .filter((value) => Number.isFinite(value));

  if (ratingScores.length === 0) return 0;
  return Number((ratingScores.reduce((sum, value) => sum + value, 0) / ratingScores.length).toFixed(2));
}

function QuestionInput({
  question,
  value,
  name,
  onChange,
}: {
  question: FeedbackQuestion;
  value: string;
  name: string;
  onChange: (value: string) => void;
}) {
  if (question.inputType === "rating") {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {scoreLegend.map((score) => (
          <label
            key={score.value}
            className={`cursor-pointer rounded-2xl border px-3 py-3 text-center transition ${value === String(score.value) ? getRatingTone(score.value) : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"}`}
          >
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={score.value}
              checked={value === String(score.value)}
              onChange={(event) => onChange(event.target.value)}
            />
            <p className="text-xl font-semibold">{score.value}</p>
            <p className="text-xs uppercase tracking-[0.18em]">{score.label}</p>
          </label>
        ))}
      </div>
    );
  }

  if (question.inputType === "single_choice") {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => (
          <label
            key={option}
            className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${value === option ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"}`}
          >
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={(event) => onChange(event.target.value)}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.inputType === "textarea") {
    return (
      <textarea
        className="mt-4 min-h-28 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-400 focus:bg-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Your answer"
      />
    );
  }

  return (
    <input
      className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-400 focus:bg-white"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Your answer"
    />
  );
}

function QuestionCard({
  question,
  index,
  value,
  name,
  onChange,
  mandatoryLabel,
}: {
  question: FeedbackQuestion;
  index: number;
  value: string;
  name: string;
  onChange: (value: string) => void;
  mandatoryLabel?: string;
}) {
  const helper = question.helper.trim();
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Q{index + 1}</p>
        <h3 className="text-base font-medium text-slate-900">{question.text}</h3>
        {helper ? <p className="text-sm text-slate-500">{helper}</p> : null}
        {mandatoryLabel ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">{mandatoryLabel}</p> : null}
      </div>
      <QuestionInput question={question} value={value} name={name} onChange={onChange} />
    </div>
  );
}

export function FeedbackForm({ config }: FeedbackFormProps) {
  const [studentName, setStudentName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [overallComment, setOverallComment] = useState("");
  const [generalComment, setGeneralComment] = useState("");
  const [facultyAnswers, setFacultyAnswers] = useState(() => emptyFacultyAnswers(config));
  const [facultyComments, setFacultyComments] = useState(() => emptyComments(config));
  const [supportAnswers, setSupportAnswers] = useState(() => emptySupportAnswers(config));
  const [supportComments, setSupportComments] = useState(() => emptySupportComments(config));
  const [generalAnswers, setGeneralAnswers] = useState(() => emptyGeneralAnswers(config));
  const [selectedBatchId, setSelectedBatchId] = useState(config.defaultBatchId);
  const [selectedBranch, setSelectedBranch] = useState(() => config.batches.find((batch) => batch.id === config.defaultBatchId)?.branch ?? config.batches[0]?.branch ?? "");
  const [selectedCourse, setSelectedCourse] = useState(() => config.batches.find((batch) => batch.id === config.defaultBatchId)?.course ?? config.batches[0]?.course ?? "");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [submittedResponse, setSubmittedResponse] = useState<FeedbackSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchOptions = useMemo(() => Array.from(new Set(config.batches.map((batch) => batch.branch))), [config.batches]);
  const courseOptions = useMemo(() => Array.from(new Set(config.batches.filter((batch) => batch.branch === selectedBranch).map((batch) => batch.course))), [config.batches, selectedBranch]);
  const batchOptions = useMemo(() => config.batches.filter((batch) => batch.branch === selectedBranch && batch.course === selectedCourse), [config.batches, selectedBranch, selectedCourse]);
  const selectedBatch = useMemo<ActiveFeedbackBatch | null>(() => config.batches.find((batch) => batch.id === selectedBatchId) ?? batchOptions[0] ?? config.batches[0] ?? null, [batchOptions, config.batches, selectedBatchId]);

  const selectedFaculties = useMemo(() => Array.from(new Map((selectedBatch?.faculties ?? []).map((faculty) => [faculty.id, faculty])).values()), [selectedBatch]);

  const handleBranchChange = (branch: string) => {
    const nextCourses = Array.from(new Set(config.batches.filter((batch) => batch.branch === branch).map((batch) => batch.course)));
    const nextCourse = nextCourses.includes(selectedCourse) ? selectedCourse : nextCourses[0] ?? "";
    const nextBatch = config.batches.find((batch) => batch.branch === branch && batch.course === nextCourse) ?? null;
    setSelectedBranch(branch);
    setSelectedCourse(nextCourse);
    setSelectedBatchId(nextBatch?.id ?? "");
  };

  const handleCourseChange = (course: string) => {
    const nextBatch = config.batches.find((batch) => batch.branch === selectedBranch && batch.course === course) ?? null;
    setSelectedCourse(course);
    setSelectedBatchId(nextBatch?.id ?? "");
  };

  const handleBatchChange = (batchId: string) => {
    const nextBatch = config.batches.find((batch) => batch.id === batchId) ?? null;
    if (!nextBatch) return;
    setSelectedBatchId(nextBatch.id);
    setSelectedBranch(nextBatch.branch);
    setSelectedCourse(nextBatch.course);
  };

  const steps = useMemo<FormStep[]>(() => [
    { id: "student", title: "Student details", subtitle: "Enter student name, email, and mobile number.", kind: "student" },
    { id: "academic", title: "Academic details", subtitle: "Review branch, course, and batch from backend.", kind: "academic" },
    ...selectedFaculties.map((faculty, index) => ({
      id: `faculty-${faculty.id}`,
      title: faculty.name,
      subtitle: `Faculty ${index + 1} feedback and questions.`,
      kind: "faculty" as const,
      facultyId: faculty.id,
    })),
    ...config.supportSections.map((section) => ({
      id: `support-${section.id}`,
      title: section.title,
      subtitle: `Rating and feedback for ${section.title.toLowerCase()}.`,
      kind: "support" as const,
      sectionId: section.id,
    })),
    { id: "general", title: "General questions", subtitle: "Complete the final general feedback section.", kind: "general" },
  ], [config.supportSections, selectedFaculties]);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStepIndex]);

  const handleFacultyAnswerChange = (facultyId: string, questionId: string, value: string) =>
    setFacultyAnswers((current) => ({ ...current, [facultyId]: { ...current[facultyId], [questionId]: value } }));
  const handleSupportAnswerChange = (sectionId: string, questionId: string, value: string) =>
    setSupportAnswers((current) => ({ ...current, [sectionId]: { ...current[sectionId], [questionId]: value } }));
  const handleSupportCommentChange = (sectionId: string, value: string) => setSupportComments((current) => ({ ...current, [sectionId]: value }));
  const handleGeneralAnswerChange = (questionId: string, value: string) => setGeneralAnswers((current) => ({ ...current, [questionId]: value }));

  const resetForm = () => {
    setStudentName("");
    setMobileNumber("");
    setEmail("");
    setOverallComment("");
    setGeneralComment("");
    setFacultyAnswers(emptyFacultyAnswers(config));
    setFacultyComments(emptyComments(config));
    setSupportAnswers(emptySupportAnswers(config));
    setSupportComments(emptySupportComments(config));
    setGeneralAnswers(emptyGeneralAnswers(config));
    setSelectedBatchId(config.defaultBatchId);
    setSelectedBranch(config.batches.find((batch) => batch.id === config.defaultBatchId)?.branch ?? config.batches[0]?.branch ?? "");
    setSelectedCourse(config.batches.find((batch) => batch.id === config.defaultBatchId)?.course ?? config.batches[0]?.course ?? "");
    setCurrentStepIndex(0);
    setError("");
    setSubmittedResponse(null);
    setIsSubmitting(false);
  };

  const buildFacultyResponses = (): FacultyFeedbackResponse[] =>
    selectedFaculties.map((faculty) => {
      const answers = config.facultyQuestions.map((question) => buildQuestionAnswer(question, facultyAnswers[faculty.id][question.id]));
      return {
        facultyId: faculty.id,
        facultyName: faculty.name,
        subject: faculty.subject,
        averageScore: computeAverageScore(answers),
        answers,
        comment: facultyComments[faculty.id].trim(),
      };
    });

  const buildSupportResponses = (): SupportFeedbackResponse[] =>
    config.supportSections.map((section) => {
      const answers = section.questions.map((question) => buildQuestionAnswer(question, supportAnswers[section.id][question.id]));
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        ownerName: section.owner?.name ?? "Not assigned",
        averageScore: computeAverageScore(answers),
        answers,
        comment: supportComments[section.id].trim(),
      };
    });

  const buildGeneralResponse = (): GeneralFeedbackResponse => {
    const answers = config.generalQuestions
      .filter((question) => isAnswered(generalAnswers[question.id]))
      .map((question) => buildQuestionAnswer(question, generalAnswers[question.id]));
    return {
      averageScore: computeAverageScore(answers),
      answers,
      comment: generalComment.trim(),
    };
  };

  const validateStudentStep = () => {
    if (!studentName.trim() || !mobileNumber.trim() || !email.trim()) return "Enter student name, mobile number, and mail ID.";
    if (!/^\d{10}$/.test(mobileNumber.trim())) return "Enter a valid 10-digit mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid mail ID.";
    return "";
  };

  const validateFacultyStep = (facultyId: string) => {
    if (config.facultyQuestions.some((question) => !isAnswered(facultyAnswers[facultyId][question.id]))) {
      return "Answer all questions for this faculty before continuing.";
    }
    return "";
  };

  const validateSupportStep = (sectionId: string) => {
    const section = config.supportSections.find((item) => item.id === sectionId);
    if (!section) return "";
    if (section.questions.some((question) => !isAnswered(supportAnswers[sectionId][question.id]))) {
      return `Answer all questions for ${section.title.toLowerCase()} before continuing.`;
    }
    return "";
  };

  const validateGeneralStep = () => {
    if (config.generalQuestions.some((question) => question.mandatory && !isAnswered(generalAnswers[question.id]))) {
      return "Answer all mandatory general questions before submitting.";
    }
    return "";
  };

  const validateAcademicStep = () => {
    if (!selectedBatch) return "Select branch, course, and batch before continuing.";
    return "";
  };

  const validateCurrentStep = () => {
    if (currentStep.kind === "student") return validateStudentStep();
    if (currentStep.kind === "academic") return validateAcademicStep();
    if (currentStep.kind === "faculty") return validateFacultyStep(currentStep.facultyId);
    if (currentStep.kind === "support") return validateSupportStep(currentStep.sectionId);
    if (currentStep.kind === "general") return validateGeneralStep();
    return "";
  };

  const goNext = () => {
    const nextError = validateCurrentStep();
    if (nextError) {
      setError(nextError);
      return;
    }
    setError("");
    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const goBack = () => {
    setError("");
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextError = validateCurrentStep() || validateStudentStep();
    if (nextError) {
      setError(nextError);
      return;
    }

    setError("");
    setIsSubmitting(true);
    const nextSubmission: FeedbackSubmission = {
      batchId: selectedBatch?.id ?? "",
      batchName: selectedBatch?.name ?? "",
      branch: selectedBatch?.branch ?? "",
      course: selectedBatch?.course ?? "",
      semester: selectedBatch?.semester ?? "",
      studentName: studentName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim().toLowerCase(),
      submittedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      facultyResponses: buildFacultyResponses(),
      supportResponses: buildSupportResponses(),
      generalResponse: buildGeneralResponse(),
      overallComment: overallComment.trim(),
    };
    startTransition(async () => {
      await saveFeedbackSubmissionAction(nextSubmission);
      setSubmittedResponse(nextSubmission);
      setStudentName("");
      setMobileNumber("");
      setEmail("");
      setOverallComment("");
      setGeneralComment("");
      setFacultyAnswers(emptyFacultyAnswers(config));
      setFacultyComments(emptyComments(config));
      setSupportAnswers(emptySupportAnswers(config));
      setSupportComments(emptySupportComments(config));
      setGeneralAnswers(emptyGeneralAnswers(config));
      setSelectedBatchId(config.defaultBatchId);
      setSelectedBranch(config.batches.find((batch) => batch.id === config.defaultBatchId)?.branch ?? config.batches[0]?.branch ?? "");
      setSelectedCourse(config.batches.find((batch) => batch.id === config.defaultBatchId)?.course ?? config.batches[0]?.course ?? "");
      setCurrentStepIndex(0);
      setIsSubmitting(false);
    });
  };

  const currentFaculty = currentStep.kind === "faculty" ? selectedFaculties.find((faculty) => faculty.id === currentStep.facultyId) ?? null : null;
  const currentSupportSection = currentStep.kind === "support" ? config.supportSections.find((section) => section.id === currentStep.sectionId) ?? null : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <Image src="https://lakshyamailerimages.s3.ap-south-1.amazonaws.com/BLUE.png" alt="IIC Lakshya" width={220} height={80} className="h-16 w-auto object-contain sm:h-20" priority />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">IIC Lakshya Feedback form</h1>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <form className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] md:p-8" onSubmit={handleSubmit}>
          <section className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
            {currentStep.kind !== "faculty" ? (
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-semibold text-slate-950">{currentStep.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{currentStep.subtitle}</p>
              </div>
            ) : null}

            {currentStep.kind === "student" ? (
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Student name</span><input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" value={studentName} onChange={(event) => setStudentName(event.target.value)} /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Mobile number</span><input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value.replace(/\D/g, ""))} /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Mail ID</span><input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              </div>
            ) : null}

            {currentStep.kind === "academic" ? (
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Branch</span><select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" value={selectedBranch} onChange={(event) => handleBranchChange(event.target.value)}>{branchOptions.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Course</span><select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" value={selectedCourse} onChange={(event) => handleCourseChange(event.target.value)}>{courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}</select></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Batch</span><select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" value={selectedBatch?.id ?? ""} onChange={(event) => handleBatchChange(event.target.value)}>{batchOptions.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></label>
              </div>
            ) : null}

            {currentStep.kind === "faculty" && currentFaculty ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Faculty page</p>
                    <h3 className="text-2xl font-semibold text-slate-950">{currentFaculty.name}</h3>
                    <p className="text-sm text-slate-600">{currentFaculty.subject} | {currentFaculty.designation}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">Sessions handled: <span className="font-semibold text-slate-950">{currentFaculty.sessionsHandled}</span></div>
                </div>
                <div className="space-y-4">
                  {config.facultyQuestions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      value={facultyAnswers[currentFaculty.id][question.id]}
                      name={`${currentFaculty.id}-${question.id}`}
                      onChange={(value) => handleFacultyAnswerChange(currentFaculty.id, question.id, value)}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {currentStep.kind === "support" && currentSupportSection ? (
              <>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-950">{currentSupportSection.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">Assigned person: {currentSupportSection.owner?.name ?? "Not assigned"}</p>
                </div>
                <div className="space-y-4">
                  {currentSupportSection.questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      value={supportAnswers[currentSupportSection.id][question.id]}
                      name={`${currentSupportSection.id}-${question.id}`}
                      onChange={(value) => handleSupportAnswerChange(currentSupportSection.id, question.id, value)}
                    />
                  ))}
                </div>
                <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">Feedback</span><textarea className="min-h-24 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" value={supportComments[currentSupportSection.id]} onChange={(event) => handleSupportCommentChange(currentSupportSection.id, event.target.value)} /></label>
              </>
            ) : null}

            {currentStep.kind === "general" ? (
              <>
                <div className="space-y-4">
                  {config.generalQuestions.length === 0 ? <p className="text-sm text-slate-600">No general questions configured by admin.</p> : config.generalQuestions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      value={generalAnswers[question.id]}
                      name={`general-${question.id}`}
                      onChange={(value) => handleGeneralAnswerChange(question.id, value)}
                      mandatoryLabel={question.mandatory ? "Mandatory" : "Optional"}
                    />
                  ))}
                </div>
                <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">General feedback</span><textarea className="min-h-24 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" value={generalComment} onChange={(event) => setGeneralComment(event.target.value)} /></label>
                <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">Overall feedback</span><textarea className="min-h-28 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400" value={overallComment} onChange={(event) => setOverallComment(event.target.value)} /></label>
              </>
            ) : null}
          </section>

          {error ? <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="flex gap-3">
              <button type="button" onClick={goBack} disabled={currentStepIndex === 0} className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-200 px-6 font-semibold text-emerald-700 transition hover:border-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
              {!isLastStep ? <button type="button" onClick={goNext} className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700">Next</button> : null}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={resetForm} className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 px-6 font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950">Reset</button>
              {isLastStep ? <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700"> {isSubmitting ? "Submitting..." : "Submit feedback"}</button> : null}
            </div>
          </div>
        </form>
      </section>
      {submittedResponse ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Thank You</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">Feedback submitted successfully.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Thanks, {submittedResponse.studentName}. The form has been reset to the first page.</p>
            <button
              type="button"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700"
              onClick={() => setSubmittedResponse(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}




