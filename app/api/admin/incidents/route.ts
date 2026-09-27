import { sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { initialState, isIncidentKind } from "@/lib/incident";
import { incidentHistoryTag } from "@/lib/incident-history";
import { isIncidentServiceKey } from "@/lib/incident-service";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const kind = String(form.get("kind") ?? "incident");
  const serviceKey = String(form.get("serviceKey") ?? "");
  if (!title || !message || title.length > 120 || message.length > 2000 || !isIncidentKind(kind) || !isIncidentServiceKey(serviceKey)) {
    return Response.redirect(new URL("/admin?error=validation", request.url), 303);
  }
  const db = getDb();
  const state = initialState(kind);
  await db.execute(sql`WITH created AS (
    INSERT INTO incidents (title, message, kind, state, service_key)
    VALUES (${title}, ${message}, ${kind}, ${state}, ${serviceKey})
    RETURNING id, created_at
  ) INSERT INTO incident_updates (incident_id, state, message, created_at)
    SELECT id, ${state}, ${message}, created_at FROM created`);
  revalidateTag(incidentHistoryTag, { expire: 0 });
  return Response.redirect(new URL("/admin?created=1", request.url), 303);
}
