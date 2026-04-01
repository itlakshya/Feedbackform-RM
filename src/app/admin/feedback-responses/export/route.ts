import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { buildFeedbackResponseCsv } from "@/lib/feedback-response-table";

export async function GET() {
  await requireAdminSession();
  const store = await readAdminStore();
  const csv = `﻿${buildFeedbackResponseCsv(store)}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="feedback-responses.csv"`,
    },
  });
}
