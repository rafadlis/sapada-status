import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "sapada_admin";
const sessionAgeSeconds = 12 * 60 * 60;

function equal(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function sign(expires: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return createHmac("sha256", secret).update(expires).digest("hex");
}

export function validPassword(password: string) {
  return Boolean(process.env.ADMIN_PASSWORD && equal(password, process.env.ADMIN_PASSWORD));
}

export function createSession() {
  const expires = String(Date.now() + sessionAgeSeconds * 1000);
  return `${expires}.${sign(expires)}`;
}

export async function isAdmin() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  try {
    return equal(sign(expires), signature);
  } catch {
    return false;
  }
}

export function sessionCookie(value: string) {
  return { name: cookieName, value, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: sessionAgeSeconds };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && new URL(origin).host === request.headers.get("host");
}
