export const checkTimeoutMs = 10_000;

type CheckResult = {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
};

function timedOut(check: CheckResult) {
  return check.statusCode === null && /timeout|timed out|aborted/i.test(check.error ?? "");
}

export function formatCheckResult(check: CheckResult) {
  if (check.ok) {
    return `HTTP ${check.statusCode ?? "berhasil"}${check.latencyMs === null ? "" : ` · ${check.latencyMs.toLocaleString("id-ID")} ms`}`;
  }
  if (check.statusCode !== null) {
    return `SAPADA merespons dengan HTTP ${check.statusCode}${check.latencyMs === null ? "" : ` · ${check.latencyMs.toLocaleString("id-ID")} ms`}`;
  }
  if (timedOut(check)) {
    return "Pemeriksaan ke SAPADA tidak mendapat respons dalam 10 detik.";
  }
  return "Pemeriksaan gagal terhubung ke SAPADA.";
}
