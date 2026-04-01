import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";

const templateRows = [
  ["branch", "course", "batch", "faculty_name"],
  ["Kochi", "ACCA", "ACCA-1", "Anu Joseph"],
  ["Kochi", "ACCA", "ACCA-1", "Rahul Menon"],
];

function toCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          if (value.includes('"') || value.includes(",") || value.includes(String.fromCharCode(10))) {
            return `"${value.replaceAll('"', '""')}"`;
          }
          return value;
        })
        .join(",")
    )
    .join(String.fromCharCode(13, 10));
}

export async function GET() {
  await requireAdminSession();
  const csv = `﻿${toCsv(templateRows)}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bulk-upload-template.csv"',
    },
  });
}
