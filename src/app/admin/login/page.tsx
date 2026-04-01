import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminLoginHint, getAdminSession } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  const adminLogin = getAdminLoginHint();

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="space-y-5 self-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
            Feedback Admin
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-slate-950">
            Create and control feedback data from the backend.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-600">
            Use the admin panel to add branches, courses, batches, faculty, and question
            banks. The public feedback form automatically reads the active batch from this backend store.
          </p>
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
            Admin login from <strong>.env</strong>: <strong>{adminLogin.email}</strong> / <strong>{adminLogin.password}</strong>
          </div>
        </section>
        <AdminLoginForm />
      </div>
    </main>
  );
}
