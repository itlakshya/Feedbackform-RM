import "server-only";

import { Pool } from "pg";

declare global {
  var __feedbackPgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return new Pool({
    connectionString,
  });
}

export const pgPool = global.__feedbackPgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__feedbackPgPool = pgPool;
}
