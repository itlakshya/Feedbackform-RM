import { requireAdminSession } from "@/lib/admin-auth";
import { parsePage, parseQuestionCategory, redirectIfStalePage } from "@/lib/admin-pagination";
import { getQuestionMetrics, listQuestionsPage } from "@/lib/admin-store";
import { AdminShell, SectionCard } from "@/components/admin-shell";
import { QuestionsManager } from "@/components/questions-manager";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; category?: string | string[] }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const requestedPage = parsePage(params.page);
  const category = parseQuestionCategory(params.category);
  const categoryQuery = category === "all" ? undefined : { category };
  const [result, metrics] = await Promise.all([listQuestionsPage(requestedPage, undefined, category), getQuestionMetrics()]);
  redirectIfStalePage("/admin/questions", requestedPage, result.page, categoryQuery);

  return (
    <AdminShell
      current="/admin/questions"
      title="Questions"
      description="Manage common question sets on a dedicated page."
      metrics={[
        { label: "Faculty", value: metrics.faculty },
        { label: "General", value: metrics.general },
        { label: "Total", value: metrics.total },
      ]}
    >
      <SectionCard title="Question List" description="Filter by category, then add, edit, or delete questions.">
        <QuestionsManager result={result} category={category} />
      </SectionCard>
    </AdminShell>
  );
}
