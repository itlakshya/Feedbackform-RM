import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { buildFeedbackResponseExcelHtml } from "@/lib/feedback-response-table";

export async function GET() {
  await requireAdminSession();
  const store = await readAdminStore();
  const workbookHtml = `﻿${buildFeedbackResponseExcelHtml(store)}`;
  return new NextResponse(workbookHtml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="feedback-responses.xls"`,
    },
  });
}
