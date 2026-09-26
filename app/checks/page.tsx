import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { and, desc, gte, lt } from "drizzle-orm";
import { StatusMark } from "@/components/status-mark";
import { getDb } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { getHistoryRange } from "@/lib/history-range";
import { formatJakarta } from "@/lib/status";

export const metadata: Metadata = {
  title: "Detail pemeriksaan | Status SAPADA Garut",
  robots: { index: false, follow: false },
};

type Query = { from?: string | string[]; to?: string | string[]; page?: string | string[]; range?: string | string[] };
const pageSize = 100;
const dayMs = 24 * 60 * 60 * 1000;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ChecksPage({ searchParams }: { searchParams: Promise<Query> }) {
  await connection();
  const params = await searchParams;
  const range = getHistoryRange(params.range);
  const from = Number(single(params.from));
  const to = Number(single(params.to));
  const requestedPage = Number(single(params.page) ?? "1");
  const now = new Date().getTime();
  const valid = Number.isSafeInteger(from) && Number.isSafeInteger(to) && Number.isSafeInteger(requestedPage)
    && requestedPage >= 1 && requestedPage <= 100 && from < to && to - from <= dayMs
    && from >= now - 31 * dayMs && to <= now + 5 * 60 * 1000;
  const backHref = range.key === "60m" ? "/" : `/?range=${range.key}`;
  let rows: (typeof checks.$inferSelect)[] = [];
  let hasNext = false;
  let unavailable = false;

  if (valid) {
    try {
      const result = await getDb().select().from(checks)
        .where(and(gte(checks.checkedAt, new Date(from)), lt(checks.checkedAt, new Date(to))))
        .orderBy(desc(checks.checkedAt), desc(checks.id))
        .limit(pageSize + 1).offset((requestedPage - 1) * pageSize);
      hasNext = result.length > pageSize;
      rows = result.slice(0, pageSize);
    } catch (error) {
      console.error("Failed to load check details", error);
      unavailable = true;
    }
  }

  const period = valid
    ? `${formatJakarta(new Date(from), { dateStyle: "medium", timeStyle: "short" })}–${formatJakarta(new Date(to), { timeStyle: "short" })} WIB`
    : null;
  const pageHref = (page: number) => `/checks?from=${from}&to=${to}&range=${range.key}&page=${page}`;

  return (
    <div className="site-shell">
      <header className="site-header"><div className="container header-inner">
        <Link className="brand" href="/"><StatusMark className="brand-symbol" /><span className="brand-copy"><strong>SAPADA</strong><small>Status layanan</small></span></Link>
        <Link className="header-link" href={backHref}>Kembali ke status</Link>
      </div></header>
      <main className="container check-detail-page">
        <p className="kicker">Riwayat pemantauan</p>
        <h1>Detail pemeriksaan</h1>
        {period && <p className="check-period">{period}</p>}
        {!valid ? <p className="check-message">Rentang waktu tidak valid. Pilih batang riwayat dari halaman status.</p>
          : unavailable ? <p className="check-message">Riwayat belum dapat dimuat. Coba lagi nanti.</p>
            : rows.length === 0 ? <p className="check-message">Tidak ada pemeriksaan yang tercatat pada rentang waktu ini.</p>
              : <div className="check-list">{rows.map((check) => (
                <article className="check-row" key={check.id}>
                  <div><time dateTime={check.checkedAt.toISOString()}>{formatJakarta(check.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB</time><span className={`check-result ${check.ok ? "check-ok" : "check-failed"}`}>{check.ok ? "Berhasil" : "Gagal"}</span></div>
                  <p>{check.ok ? `HTTP ${check.statusCode ?? "berhasil"}` : check.error || (check.statusCode ? `HTTP ${check.statusCode}` : "Gagal mengakses layanan")}{check.latencyMs !== null ? ` · ${check.latencyMs.toLocaleString("id-ID")} ms` : ""}</p>
                </article>
              ))}</div>}
        {valid && !unavailable && (requestedPage > 1 || hasNext) && <nav className="check-pagination" aria-label="Halaman riwayat pemeriksaan">
          {requestedPage > 1 && <Link href={pageHref(requestedPage - 1)} prefetch={false}>Pemeriksaan lebih baru</Link>}
          <span>Halaman {requestedPage}</span>
          {hasNext && <Link href={pageHref(requestedPage + 1)} prefetch={false}>Pemeriksaan lebih lama</Link>}
        </nav>}
      </main>
    </div>
  );
}
