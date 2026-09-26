import { createSession, sameOrigin, sessionCookie, validPassword } from "@/lib/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!validPassword(password)) {
    return Response.redirect(new URL("/admin?error=login", request.url), 303);
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/admin", request.url).toString(),
      "Set-Cookie": serializeCookie(sessionCookie(createSession())),
    },
  });
}

function serializeCookie(cookie: ReturnType<typeof sessionCookie>) {
  return `${cookie.name}=${cookie.value}; Max-Age=${cookie.maxAge}; Path=/; HttpOnly; SameSite=Strict${cookie.secure ? "; Secure" : ""}`;
}
