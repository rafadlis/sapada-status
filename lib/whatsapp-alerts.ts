import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { whatsappAlertRecipients } from "@/lib/db/schema";
import { components } from "@/lib/components";
import { services } from "@/lib/services";

export type AlertFailure = { serviceKey: string; statusCode: number | null };
type CheckResult = AlertFailure & { ok: boolean };
type ClaimedDelivery = {
  id: number;
  phone: string;
  failures: AlertFailure[];
  created_at: Date;
  attempts: number;
};

export function parseAlertRecipients(raw: string) {
  const recipients = raw.split(/[\s,;]+/).filter(Boolean).map((value) => {
    const digits = value.replace(/^\+/, "").replace(/[()-]/g, "");
    const phone = digits.startsWith("08") ? `62${digits.slice(1)}` : digits;
    if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error("Invalid WhatsApp alert recipient configuration");
    return phone;
  });
  return [...new Set(recipients)];
}

export function parseAlertRecipient(raw: string) {
  try {
    const recipients = parseAlertRecipients(raw.trim());
    return recipients.length === 1 && !/[\s,;]/.test(raw.trim()) ? recipients[0] : null;
  } catch {
    return null;
  }
}

export function alertFailureName(key: string) {
  return services.find((service) => service.key === key)?.name
    ?? components.find((component) => component.key === key)?.name ?? key;
}

export function alertBodyValues(failures: AlertFailure[], checkedAt: Date) {
  const names = failures.map((failure) => alertFailureName(failure.serviceKey)).join(", ");
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
  }).format(checkedAt).replace(" pukul ", ", ");
  const reasons = failures.map((failure) => `${alertFailureName(failure.serviceKey)}: ${failure.statusCode === null ? "tidak dapat diakses" : `HTTP ${failure.statusCode}`}`).join("; ");
  return [names, time, reasons];
}

export function buildOcaAlertPayload(phone: string, templateCode: string, failures: AlertFailure[], checkedAt: Date) {
  return {
    phone_number: phone,
    message: {
      type: "template",
      template: {
        template_code_id: templateCode,
        payload: [{ position: "body", parameters: alertBodyValues(failures, checkedAt).map((text) => ({ type: "text", text })) }],
      },
    },
  };
}

function alertConfig() {
  const endpoint = process.env.WHATSAPP_BIZ_OCA_ENDPOINT;
  const token = process.env.WHATSAPP_BIZ_OCA_TOKEN;
  const templateCode = process.env.WHATSAPP_BIZ_OCA_TEMPLATE_CODE_STATUS_ALERT;
  if (!endpoint || !token || !templateCode) return null;
  if (new URL(endpoint).protocol !== "https:") throw new Error("OCA endpoint must use HTTPS");
  return { endpoint, token, templateCode };
}

export function whatsappAlertConfigured() {
  try {
    return Boolean(alertConfig());
  } catch {
    return false;
  }
}

export async function sendOcaAlert(
  input: { phone: string; failures: AlertFailure[]; checkedAt: Date },
  config: { endpoint: string; token: string; templateCode: string },
  request: typeof fetch = fetch,
): Promise<{ status: "accepted" | "retry" | "failed" | "needs_review"; messageId?: string; error?: string }> {
  try {
    const response = await request(config.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildOcaAlertPayload(input.phone, config.templateCode, input.failures, input.checkedAt)),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      const errorBody: unknown = await response.json().catch(() => null);
      const providerCode = errorBody && typeof errorBody === "object" && "errors" in errorBody
        && Array.isArray(errorBody.errors) ? errorBody.errors[0]?.code : null;
      if (response.status === 429 || String(providerCode ?? "") === "9") return { status: "retry", error: "OCA rate limit" };
      if (response.status >= 500 || response.status === 408) return { status: "needs_review", error: `OCA HTTP ${response.status}; acceptance uncertain` };
      return { status: "failed", error: `OCA HTTP ${response.status}` };
    }
    const data: unknown = await response.json().catch(() => null);
    if (data && typeof data === "object" && "success" in data && data.success === false) {
      return { status: "failed", error: "OCA rejected the message" };
    }
    if (!data || typeof data !== "object" || !("success" in data) || data.success !== true
      || !("msgid" in data) || typeof data.msgid !== "string" || !data.msgid) {
      return { status: "needs_review", error: "OCA acceptance could not be verified" };
    }
    return { status: "accepted", messageId: data.msgid };
  } catch {
    return { status: "needs_review", error: "OCA request outcome uncertain" };
  }
}

export function buildAlertTransitionQuery(results: CheckResult[], recipients: string[], checkedAt: Date) {
  const values = sql.join(results.map((result) => sql`(${result.serviceKey}::text, ${result.ok}::boolean, ${result.statusCode}::integer)`), sql`, `);
  return sql`WITH input(service_key, ok, status_code) AS (VALUES ${values}),
    changed AS (
      INSERT INTO monitor_alert_states (service_key, ok, checked_at, new_failure)
      SELECT service_key, ok, ${checkedAt}, NOT ok FROM input WHERE true
      ON CONFLICT (service_key) DO UPDATE
      SET ok = EXCLUDED.ok, checked_at = EXCLUDED.checked_at,
        new_failure = monitor_alert_states.ok AND NOT EXCLUDED.ok
      WHERE monitor_alert_states.checked_at < EXCLUDED.checked_at
      RETURNING service_key, new_failure
    ),
    failures AS (
      SELECT jsonb_agg(jsonb_build_object('serviceKey', input.service_key, 'statusCode', input.status_code)
        ORDER BY input.service_key) AS details
      FROM changed JOIN input USING (service_key) WHERE changed.new_failure
    )
    INSERT INTO whatsapp_alert_deliveries (phone, failures)
    SELECT recipient.phone, failures.details
    FROM failures CROSS JOIN jsonb_array_elements_text(${JSON.stringify(recipients)}::jsonb) AS recipient(phone)
    WHERE failures.details IS NOT NULL`;
}

async function recordAlertTransitions(results: CheckResult[], recipients: string[], checkedAt: Date) {
  if (results.length === 0) return;
  await getDb().execute(buildAlertTransitionQuery(results, recipients, checkedAt));
}

async function dispatchPendingAlerts(config: { endpoint: string; token: string; templateCode: string }) {
  const claimed = await getDb().execute(sql<ClaimedDelivery>`UPDATE whatsapp_alert_deliveries
    SET status = 'sending', attempts = attempts + 1, claimed_at = now()
    WHERE id IN (
      SELECT delivery.id FROM whatsapp_alert_deliveries AS delivery
      JOIN whatsapp_alert_recipients AS recipient ON recipient.phone = delivery.phone AND recipient.enabled
      WHERE delivery.status = 'pending' AND delivery.next_attempt_at <= now()
      ORDER BY delivery.id LIMIT 4 FOR UPDATE OF delivery SKIP LOCKED
    )
    RETURNING id, phone, failures, created_at, attempts`);
  const deliveries = claimed.rows as ClaimedDelivery[];
  await Promise.all(deliveries.map(async (delivery) => {
    const result = await sendOcaAlert({
      phone: delivery.phone, failures: delivery.failures, checkedAt: new Date(delivery.created_at),
    }, config);
    const status = result.status === "retry" && delivery.attempts >= 3 ? "failed" : result.status === "retry" ? "pending" : result.status;
    const nextAttemptAt = status === "pending" ? new Date(Date.now() + 10 * 60_000) : new Date();
    await getDb().execute(sql`UPDATE whatsapp_alert_deliveries
      SET status = ${status}, next_attempt_at = ${nextAttemptAt},
        provider_message_id = ${result.messageId ?? null}, last_error = ${result.error ?? null}
      WHERE id = ${delivery.id} AND status = 'sending'`);
  }));
  return deliveries.length;
}

export async function processWhatsappAlerts(results: CheckResult[]) {
  const config = alertConfig();
  if (!config) return { status: "unconfigured" as const, processed: 0 };
  const recipients = await getDb().select({ phone: whatsappAlertRecipients.phone }).from(whatsappAlertRecipients)
    .where(eq(whatsappAlertRecipients.enabled, true));
  const checkedAt = new Date();
  await recordAlertTransitions(results, recipients.map((recipient) => recipient.phone), checkedAt);
  const processed = await dispatchPendingAlerts(config);
  return { status: "enabled" as const, processed };
}
