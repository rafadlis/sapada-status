import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { isValidIncidentState } from "@/lib/incident";
import { parseAffectedComponentKeys } from "@/lib/incident-components";
import { incidentHistoryTag } from "@/lib/incident-history";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await context.params;
  const incidentId = Number(id);
  if (!Number.isSafeInteger(incidentId) || incidentId < 1) return new Response("Invalid incident", { status: 400 });
  const form = await request.formData();
  const state = String(form.get("state") ?? "");
  const message = String(form.get("message") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const db = getDb();
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId)).limit(1);
  if (!incident) return new Response("Incident not found", { status: 404 });
  const affectedComponentKeys = parseAffectedComponentKeys(incident.serviceKey, form.getAll("componentKeys"));
  const coverageChanged = JSON.stringify(affectedComponentKeys?.toSorted() ?? null)
    !== JSON.stringify(incident.affectedComponentKeys?.toSorted() ?? null);
  if (!isValidIncidentState(incident.kind === "maintenance" ? "maintenance" : "incident", state)
    || !title || title.length > 120 || (incident.titleReviewRequired && title === incident.title)
    || message.length > 2000 || affectedComponentKeys === undefined
    || (!message && (state !== incident.state || coverageChanged))) {
    return Response.redirect(new URL("/admin?error=validation", request.url), 303);
  }
  const updatedAt = new Date();
  await db.execute(sql`WITH changed AS (
    UPDATE incidents SET state = ${state}, title = ${title}, title_review_required = false, affected_component_keys = ${JSON.stringify(affectedComponentKeys)}::jsonb,
      updated_at = ${updatedAt}, resolved_at = ${state === "resolved" ? incident.resolvedAt ?? updatedAt : null}
    WHERE id = ${incidentId} RETURNING id
  ) INSERT INTO incident_updates (incident_id, state, message, created_at)
    SELECT id, ${state}, ${message}, ${updatedAt} FROM changed WHERE ${message} <> ''`);
  revalidateTag(incidentHistoryTag, { expire: 0 });
  return Response.redirect(new URL("/admin?updated=1", request.url), 303);
}
