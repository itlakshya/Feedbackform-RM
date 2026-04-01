"use client";

import { useActionState } from "react";
import { loginAdmin } from "@/app/admin/actions";

const initialState = {} as { error?: string };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, initialState);

  return (
    <form action={action} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
          Admin Login
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Secure backend configuration
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to manage branches, courses, batches, faculty, and questions.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-400 focus:bg-white"
          name="email"
          type="email"
          placeholder="admin@feedback.local"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-400 focus:bg-white"
          name="password"
          type="password"
          placeholder="Enter password"
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-6 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in..." : "Login to admin"}
      </button>
    </form>
  );
}
