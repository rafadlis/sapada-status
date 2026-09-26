import { eq } from "drizzle-orm";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { incidents } from "@/lib/db/schema";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const incidentId = Number(id);
  if (!Number.isSafeInteger(incidentId) || incidentId < 1) return new Response("Invalid incident", { status: 400 });
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  if (action !== "resolve" && action !== "reopen") return new Response("Invalid action", { status: 400 });
  await getDb().update(incidents).set({
    state: action === "resolve" ? "resolved" : "investigating",
    resolvedAt: action === "resolve" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(incidents.id, incidentId));
  return Response.redirect(new URL("/admin?updated=1", request.url), 303);
}
