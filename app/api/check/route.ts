import { getDb } from "@/lib/db";
import { checks } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = process.env.MONITOR_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = performance.now();
  let ok = false;
  let statusCode: number | null = null;
  let error: string | null = null;
  try {
    const response = await fetch("https://sapada.bapenda.garutkab.go.id/", {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
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
