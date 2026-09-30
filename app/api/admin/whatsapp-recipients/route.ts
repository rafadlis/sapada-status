import { sql } from "drizzle-orm";
import { isAdmin, sameOrigin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseAlertRecipient } from "@/lib/whatsapp-alerts";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const id = Number(form.get("id"));
  const phone = parseAlertRecipient(String(form.get("phone") ?? ""));
  const name = String(form.get("name") ?? "").trim();
  const redirect = (query: string) => Response.redirect(new URL(`/admin?${query}#whatsapp-recipients`, request.url), 303);
  if (!["add", "update", "toggle", "remove"].includes(intent)
    || (intent !== "add" && (!Number.isSafeInteger(id) || id <= 0))
    || (["add", "update"].includes(intent) && (!phone || name.length > 80))) {
    return redirect("error=recipient");
  }
  const db = getDb();
  if (intent === "add") {
    const added = await db.execute(sql`INSERT INTO whatsapp_alert_recipients (phone, name)
      VALUES (${phone}, ${name}) ON CONFLICT (phone) DO NOTHING RETURNING id`);
    if (!added.rows.length) return redirect("error=recipient-duplicate");
  } else if (intent === "update") {
    const updated = await db.execute(sql`WITH old AS (
      SELECT id, phone FROM whatsapp_alert_recipients WHERE id = ${id} FOR UPDATE
    ), changed AS (
      UPDATE whatsapp_alert_recipients SET phone = ${phone}, name = ${name}
      WHERE id = ${id} AND NOT EXISTS (
        SELECT 1 FROM whatsapp_alert_recipients WHERE phone = ${phone} AND id <> ${id}
      ) RETURNING id
    ), cancelled AS (
      UPDATE whatsapp_alert_deliveries SET status = 'cancelled', last_error = 'Recipient number changed'
      WHERE status = 'pending' AND phone IN (SELECT phone FROM old WHERE phone <> ${phone})
        AND EXISTS (SELECT 1 FROM changed)
    ) SELECT id FROM changed`);
    if (!updated.rows.length) return redirect("error=recipient-duplicate");
  } else if (intent === "toggle") {
    await db.execute(sql`WITH changed AS (
      UPDATE whatsapp_alert_recipients SET enabled = NOT enabled WHERE id = ${id} RETURNING phone, enabled
    ) UPDATE whatsapp_alert_deliveries SET status = 'cancelled', last_error = 'Recipient disabled'
      WHERE status = 'pending' AND phone IN (SELECT phone FROM changed WHERE NOT enabled)`);
  } else {
    await db.execute(sql`WITH removed AS (
      DELETE FROM whatsapp_alert_recipients WHERE id = ${id} RETURNING phone
    ) UPDATE whatsapp_alert_deliveries SET status = 'cancelled', last_error = 'Recipient removed'
      WHERE status = 'pending' AND phone IN (SELECT phone FROM removed)`);
  }
  return redirect("recipients=updated");
}
