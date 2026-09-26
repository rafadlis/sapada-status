import { isAdmin, sameOrigin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { incidents } from "@/lib/db/schema";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  if (!title || !message || title.length > 120 || message.length > 2000) {
    return Response.redirect(new URL("/admin?error=validation", request.url), 303);
  }
  await getDb().insert(incidents).values({ title, message });
  return Response.redirect(new URL("/admin?created=1", request.url), 303);
}
