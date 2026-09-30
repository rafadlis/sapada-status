import { getDb } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { checkTimeoutMs } from "@/lib/check-result";
import { services } from "@/lib/services";
import { runComponentChecks } from "@/lib/component-checks";
import { processWhatsappAlerts } from "@/lib/whatsapp-alerts";

function authorized(request: Request, secret: string | undefined) {
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request, process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCheck();
}

export async function POST(request: Request) {
  if (!authorized(request, process.env.MONITOR_TOKEN)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runCheck();
}

async function runCheck() {
  const [serviceResults, componentResults] = await Promise.all([Promise.all(services.map(async (service) => {
    const started = performance.now();
    let ok = false;
    let statusCode: number | null = null;
    let error: string | null = null;
    try {
      const response = await fetch(service.url, {
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(checkTimeoutMs),
        headers: { "user-agent": "Bapenda-Status-Monitor/1.0" },
      });
      statusCode = response.status;
      ok = statusCode >= 200 && statusCode < 400;
      if (!ok) error = `HTTP ${statusCode}`;
    } catch (cause) {
      error = cause instanceof Error ? cause.message.slice(0, 300) : "Unknown network error";
    }
    return { serviceKey: service.key, ok, statusCode, latencyMs: Math.round(performance.now() - started), error };
  })), runComponentChecks()]);
  const results = [...serviceResults, ...componentResults];
  try {
    await getDb().insert(checks).values(results);
  } catch (cause) {
    console.error("Failed to save health check", cause);
    return Response.json({ error: "Failed to save health check" }, { status: 500 });
  }
  try {
    const alerts = await processWhatsappAlerts(results);
    return Response.json({ results, alerts }, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    console.error("Failed to process WhatsApp alerts", cause);
    return Response.json({ error: "Health checks saved, but WhatsApp alerts could not be processed" }, { status: 503 });
  }
}
