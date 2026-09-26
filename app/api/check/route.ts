import { getDb } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { checkTimeoutMs } from "@/lib/check-result";

export const runtime = "nodejs";

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
  const started = performance.now();
  let ok = false;
  let statusCode: number | null = null;
  let error: string | null = null;
  try {
    const response = await fetch("https://sapada.bapenda.garutkab.go.id/", {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(checkTimeoutMs),
      headers: { "user-agent": "SAPADA-Status-Monitor/1.0" },
    });
    statusCode = response.status;
    ok = statusCode >= 200 && statusCode < 400;
    if (!ok) error = `HTTP ${statusCode}`;
  } catch (cause) {
    error = cause instanceof Error ? cause.message.slice(0, 300) : "Unknown network error";
  }
  const latencyMs = Math.round(performance.now() - started);
  try {
    await getDb().insert(checks).values({ ok, statusCode, latencyMs, error });
  } catch (cause) {
    console.error("Failed to save health check", cause);
    return Response.json({ error: "Failed to save health check" }, { status: 500 });
  }
  return Response.json({ ok, statusCode, latencyMs, error }, { headers: { "cache-control": "no-store" } });
}
