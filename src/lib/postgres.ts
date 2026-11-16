import "server-only";

import { Pool } from "pg";

declare global {
  var __feedbackPgPool: Pool | undefined;
}

function getDatabaseConfig() {
  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB?.trim();
  const host = process.env.POSTGRES_HOST?.trim() || "localhost";
  const port = Number(process.env.POSTGRES_PORT ?? 5432);

  if (!user || !password || !database) {
    throw new Error("POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB must be configured.");
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("POSTGRES_PORT must be a valid port number.");
  }

  return { user, password, database, host, port };
}

function createPool() {
  return new Pool(getDatabaseConfig());
}

export function getPgPool() {
  if (!global.__feedbackPgPool) {
    global.__feedbackPgPool = createPool();
  }

  return global.__feedbackPgPool;
}
