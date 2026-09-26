import { createSession, sameOrigin, sessionCookie, validPassword } from "@/lib/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!validPassword(password)) {
    return Response.redirect(new URL("/admin?error=login", request.url), 303);
  }
  const response = Response.redirect(new URL("/admin", request.url), 303);
  response.headers.append("set-cookie", serializeCookie(sessionCookie(createSession())));
  return response;
}

function serializeCookie(cookie: ReturnType<typeof sessionCookie>) {
  return `${cookie.name}=${cookie.value}; Max-Age=${cookie.maxAge}; Path=/; HttpOnly; SameSite=Strict${cookie.secure ? "; Secure" : ""}`;
}
