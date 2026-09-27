import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { PageLoading } from "@/components/page-loading";
import { formatCheckResult } from "@/lib/check-result";
import { getDb } from "@/lib/db";
import { checks } from "@/lib/db/schema";
import { defaultHistoryRange, getHistoryRange } from "@/lib/history-range";
import { formatJakarta } from "@/lib/status";
import { getService, services } from "@/lib/services";

export const metadata: Metadata = {
  title: "Detail pemeriksaan | Status Bapenda Garut",
  robots: { index: false, follow: false },
};

type Query = { from?: string | string[]; to?: string | string[]; page?: string | string[]; range?: string | string[]; service?: string | string[] };
const pageSize = 100;
const dayMs = 24 * 60 * 60 * 1000;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

type ChecksProps = { searchParams: Promise<Query> };

export default function ChecksPage({ searchParams }: ChecksProps) {
  return <div className="status-site"><SiteHeader />
    <Suspense fallback={<PageLoading page="checks" />}><ChecksContent searchParams={searchParams} /></Suspense>
    <SiteFooter /></div>;
}

async function ChecksContent({ searchParams }: ChecksProps) {
  await connection();
  const params = await searchParams;
  const range = getHistoryRange(params.range);
  const requestedService = single(params.service);
  const service = requestedService === undefined ? services[0] : getService(requestedService);
  const from = Number(single(params.from));
  const to = Number(single(params.to));
  const requestedPage = Number(single(params.page) ?? "1");
  const now = new Date().getTime();
  const valid = Boolean(service) && Number.isSafeInteger(from) && Number.isSafeInteger(to) && Number.isSafeInteger(requestedPage)
    && requestedPage >= 1 && requestedPage <= 100 && from < to && to - from <= dayMs
    && from >= now - 31 * dayMs && to <= now + 5 * 60 * 1000;
  const backHref = range.key === defaultHistoryRange.key ? "/" : `/?range=${range.key}`;
  let rows: (typeof checks.$inferSelect)[] = [];
  let hasNext = false;
  let unavailable = false;

  if (valid && service) {
    try {
      const result = await getDb().select().from(checks)
        .where(and(eq(checks.serviceKey, service.key), gte(checks.checkedAt, new Date(from)), lt(checks.checkedAt, new Date(to))))
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
  const pageHref = (page: number) => `/checks?service=${service?.key ?? "sapada"}&from=${from}&to=${to}&range=${range.key}&page=${page}`;

  return (
      <main className="site-width check-detail-page">
        <Link className="back-link" href={backHref}>← Kembali ke status</Link>
        <p className="kicker">Riwayat pemantauan</p>
        <h1>Detail pemeriksaan {service?.name}</h1>
        {period && <p className="check-period">{period}</p>}
        {!valid ? <p className="check-message">Rentang waktu tidak valid. Pilih batang riwayat dari halaman status.</p>
          : unavailable ? <p className="check-message">Riwayat belum dapat dimuat. Coba lagi nanti.</p>
            : rows.length === 0 ? <p className="check-message">Tidak ada pemeriksaan yang tercatat pada rentang waktu ini.</p>
              : <div className="check-list">{rows.map((check) => (
                <article className="check-row" key={check.id}>
                  <div><time dateTime={check.checkedAt.toISOString()}>{formatJakarta(check.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB</time><span className={`check-result ${check.ok ? "check-ok" : "check-failed"}`}>{check.ok ? "Berhasil" : "Gagal"}</span></div>
                  <p>{formatCheckResult(check)}</p>
                </article>
              ))}</div>}
        {valid && !unavailable && (requestedPage > 1 || hasNext) && <nav className="check-pagination" aria-label="Halaman riwayat pemeriksaan">
          {requestedPage > 1 && <Link href={pageHref(requestedPage - 1)}>Pemeriksaan lebih baru</Link>}
          <span>Halaman {requestedPage}</span>
          {hasNext && <Link href={pageHref(requestedPage + 1)}>Pemeriksaan lebih lama</Link>}
        </nav>}
      </main>
  );
}
