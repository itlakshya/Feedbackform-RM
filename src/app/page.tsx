export const dynamic = "force-dynamic";

import { FeedbackForm } from "@/components/feedback-form";
import { getActiveFeedbackConfig } from "@/lib/feedback-data";

export default async function Home() {
  const config = await getActiveFeedbackConfig();

  if (!config) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
            Feedback setup required
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            No active batch is available.
          </h1>
          <p className="mt-3 text-slate-600">
            Login to the admin panel, create the batch data, and keep at least one batch in active status.
          </p>
          <a
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 font-semibold text-white"
            href="/admin/login"
          >
            Open admin login
          </a>
        </div>
      </main>
    );
  }

  return <FeedbackForm config={config} />;
}
