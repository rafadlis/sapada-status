import { connection } from "next/server";
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { StatusMark } from "@/components/status-mark";
import { formatCheckResult } from "@/lib/check-result";
import { getHistoryRange, historyRanges } from "@/lib/history-range";
import { formatJakarta, getStatusData } from "@/lib/status";

const statusCopy = {
  operational: { label: "Layanan beroperasi", detail: "SAPADA dapat diakses berdasarkan pemeriksaan terakhir.", tone: "good" },
  degraded: { label: "Gangguan terdeteksi", detail: "Pemeriksaan terakhir gagal mengakses SAPADA.", tone: "bad" },
  unknown: { label: "Status belum dapat dipastikan", detail: "Belum ada hasil pemeriksaan terbaru. Silakan coba lagi nanti.", tone: "unknown" },
} as const;

export default async function Home({ searchParams }: { searchParams: Promise<{ range?: string | string[] }> }) {
  await connection();
  const range = getHistoryRange((await searchParams).range);
  const now = new Date();
  const data = await getStatusData(range.durationMs, now);
  const openIncidents = data.incidents.filter((incident) => incident.state !== "resolved");
  const copy = openIncidents.length
    ? { label: "Gangguan sedang ditangani", detail: "Baca pembaruan pengelola di bawah untuk informasi terbaru.", tone: "bad" }
    : statusCopy[data.state];
  const start = now.getTime() - range.durationMs;
  const bucketMs = range.durationMs / range.buckets;
  const buckets = Array.from({ length: range.buckets }, () => ({ count: 0, failedCount: 0, latestFailure: null as (typeof data.history)[number] | null }));
  for (const check of data.history) {
    const index = Math.floor((check.checkedAt.getTime() - start) / bucketMs);
    if (index < 0 || index >= buckets.length) continue;
    buckets[index].count += 1;
    if (!check.ok) {
      buckets[index].failedCount += 1;
      if (!buckets[index].latestFailure || check.checkedAt > buckets[index].latestFailure.checkedAt) buckets[index].latestFailure = check;
    }
  }

  return (
    <div className="site-shell">
      <AutoRefresh />
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="SAPADA Status, beranda">
            <StatusMark className="brand-symbol" />
            <span className="brand-copy"><strong>SAPADA</strong><small>Status layanan</small></span>
          </Link>
          <a className="header-link" href="https://sapada.bapenda.garutkab.go.id/" target="_blank" rel="noreferrer">Buka SAPADA <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <main className="container main-content">
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-intro">
            <p className="kicker">Status layanan publik</p>
            <h1 id="page-title">Informasi akses<br />SAPADA Garut.</h1>
            <p className="hero-description">Pantau ketersediaan layanan SAPADA dan baca pembaruan saat terjadi gangguan.</p>
          </div>
          <div className={`status-panel status-${copy.tone}`} role="status">
            <div className="status-panel-top"><span>Kondisi saat ini</span><span className="live-label"><span className="live-dot" />Hasil pemantauan</span></div>
            <div className="status-main"><span className="status-orb" aria-hidden="true" /><div><h2>{copy.label}</h2><p>{copy.detail}</p>{data.latest && !data.latest.ok && <p className="status-error">{formatCheckResult(data.latest)}</p>}</div></div>
            <div className="status-panel-bottom"><span>Pemeriksaan terakhir</span><strong>{data.latest ? `${formatJakarta(data.latest.checkedAt, { dateStyle: "medium", timeStyle: "short" })} WIB` : "Belum tersedia"}</strong></div>
          </div>
        </section>

        <section className="overview" aria-labelledby="overview-title">
          <div className="section-heading overview-heading"><div><p className="kicker">Pemantauan otomatis</p><h2 id="overview-title">Ketersediaan layanan</h2></div>
            <nav className="range-picker" aria-label="Rentang riwayat pemeriksaan">
              {historyRanges.map((option) => <Link key={option.key} href={option.key === "60m" ? "/" : `/?range=${option.key}`} prefetch={false} aria-current={range.key === option.key ? "page" : undefined} className="range-option">{option.label}</Link>)}
            </nav>
          </div>
          <div className="overview-grid">
            <div className="uptime-number"><strong>{data.uptime === null ? "—" : `${data.uptime.toFixed(2)}%`}</strong><span>Pemeriksaan berhasil</span></div>
            <div className="uptime-chart" aria-label={`Riwayat pemeriksaan ${range.label} terakhir`}>
              <div className="day-bars" style={{ gridTemplateColumns: `repeat(${range.buckets}, minmax(0, 1fr))` }}>{buckets.map((bucket, index) => {
                const bucketStart = new Date(start + index * bucketMs);
                const bucketEnd = new Date(start + (index + 1) * bucketMs);
                const period = `${formatJakarta(bucketStart, { dateStyle: "medium", timeStyle: "short" })}–${formatJakarta(bucketEnd, { timeStyle: "short" })} WIB`;
                const failure = bucket.latestFailure;
                const failureTime = failure ? `${formatJakarta(failure.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB` : null;
                const errorDetail = failure ? formatCheckResult(failure) : null;
                const summary = bucket.count === 0 ? "Belum ada pemeriksaan" : bucket.failedCount ? `${bucket.failedCount} dari ${bucket.count} pemeriksaan gagal` : `${bucket.count} pemeriksaan berhasil`;
                const label = `${period}: ${summary}${failureTime ? `. Gangguan terakhir ${failureTime}: ${errorDetail}` : ""}`;
                return <details key={index} name="history-check" className={`history-bucket ${index >= range.buckets / 2 ? "bucket-right" : ""}`}>
                  <summary className={`day-bar ${bucket.count === 0 ? "day-empty" : bucket.failedCount ? "day-failed" : "day-good"}`} aria-label={label} title={label} />
                  <div className="bucket-popover"><strong>{period}</strong><span>{summary}</span>{failure && <><span>Gangguan terakhir: {failureTime}</span><span>{errorDetail}</span></>}{bucket.count > 0 && <Link className="bucket-detail-link" href={`/checks?from=${bucketStart.getTime()}&to=${bucketEnd.getTime()}&range=${range.key}`} prefetch={false}>Lihat semua pemeriksaan</Link>}</div>
                </details>;
              })}</div>
              <div className="chart-labels"><span>{range.label} lalu</span><span>Sekarang</span></div>
            </div>
          </div>
          <p className="overview-footnote">Arahkan kursor atau ketuk batang untuk melihat waktu dan detail pemeriksaan. Persentase dihitung dari {data.history.length.toLocaleString("id-ID")} pemeriksaan yang tercatat. Bagian tanpa data tidak dihitung sebagai waktu aktif. Halaman diperbarui otomatis setiap menit saat terbuka.</p>
        </section>

        <section className="incidents-section" aria-labelledby="incidents-title">
          <div className="section-heading"><div><p className="kicker">Pembaruan pengelola</p><h2 id="incidents-title">Informasi gangguan</h2></div></div>
          {openIncidents.length > 0 && <div className="active-notice"><span className="notice-mark" />{openIncidents.length} informasi gangguan sedang ditangani</div>}
          {data.incidents.length ? <div className="incident-list">{data.incidents.map((incident) => (
            <article className="incident" key={incident.id}>
              <div className="incident-date"><strong>{formatJakarta(incident.createdAt, { day: "2-digit" })}</strong><span>{formatJakarta(incident.createdAt, { month: "short", year: "numeric" })}</span></div>
              <div className="incident-body"><div className="incident-title-row"><h3>{incident.title}</h3><span className={`incident-badge ${incident.state === "resolved" ? "badge-resolved" : "badge-open"}`}>{incident.state === "resolved" ? "Selesai" : "Dalam penanganan"}</span></div><p>{incident.message}</p><span className="incident-time">Diterbitkan {formatJakarta(incident.createdAt, { timeStyle: "short" })} WIB{incident.resolvedAt ? ` · Selesai ${formatJakarta(incident.resolvedAt, { dateStyle: "medium", timeStyle: "short" })} WIB` : ""}</span></div>
            </article>
          ))}</div> : <div className="empty-incidents"><span className="empty-icon" aria-hidden="true">✓</span><div><h3>Belum ada informasi gangguan</h3><p>Pembaruan dari pengelola layanan akan tampil di sini.</p></div></div>}
        </section>

        <aside className="about-service"><div><p className="kicker">Tentang halaman ini</p><h2>Satu tempat untuk mengetahui kondisi SAPADA.</h2></div><p>Pemeriksaan otomatis dijadwalkan setiap lima menit. Pengelola dapat menerbitkan penjelasan ketika layanan terganggu. Jika pemeriksaan berhenti lebih dari 20 menit, status akan ditandai belum dapat dipastikan.</p></aside>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><span>© {now.getFullYear()} SAPADA · Bapenda Kabupaten Garut</span><span>Waktu ditampilkan dalam WIB</span></div></footer>
    </div>
  );
}
