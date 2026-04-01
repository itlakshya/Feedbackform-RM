import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const cookieName = "feedback-admin-session";
const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? "feedback-admin-local-secret";
const maxAge = 60 * 60 * 8;

type SessionPayload = {
  email: string;
  exp: number;
};

function sign(value: string) {
  return createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function encode(payload: SessionPayload) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${base}.${sign(base)}`;
}

function decode(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [base, signature] = token.split(".");
  if (!base || !signature) {
    return null;
  }

  const expected = sign(base);
  const sameLength = Buffer.byteLength(signature) == Buffer.byteLength(expected);

  if (!sameLength || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf8")) as SessionPayload;

  if (payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

function getConfiguredAdminEmail() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error("ADMIN_EMAIL is not configured in .env.");
  }
  return email;
}

function getConfiguredAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not configured in .env.");
  }
  return password;
}

export function getAdminLoginHint() {
  return {
    email: getConfiguredAdminEmail(),
    password: getConfiguredAdminPassword(),
  };
}

export async function verifyAdminCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const configuredEmail = getConfiguredAdminEmail();
  const configuredPassword = getConfiguredAdminPassword();

  if (normalizedEmail != configuredEmail) {
    return false;
  }

  const provided = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);

  if (provided.byteLength != expected.byteLength) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

export async function createAdminSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, encode({ email, exp: Date.now() + maxAge * 1000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return decode(cookieStore.get(cookieName)?.value);
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
