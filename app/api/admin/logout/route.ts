import { sameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const response = Response.redirect(new URL("/admin", request.url), 303);
  response.headers.append("set-cookie", "sapada_admin=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict");
  return response;
}
