import { connection } from "next/server";
import Link from "next/link";
import { formatJakarta, getStatusData } from "@/lib/status";

const statusCopy = {
  operational: { label: "Layanan beroperasi", detail: "SAPADA dapat diakses berdasarkan pemeriksaan terakhir.", tone: "good" },
  degraded: { label: "Gangguan terdeteksi", detail: "Pemeriksaan terakhir gagal mengakses SAPADA.", tone: "bad" },
  unknown: { label: "Status belum dapat dipastikan", detail: "Belum ada hasil pemeriksaan terbaru. Silakan coba lagi nanti.", tone: "unknown" },
} as const;

function dayKey(date: Date) {
  return formatJakarta(date, { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default async function Home() {
  await connection();
  const data = await getStatusData();
  const copy = statusCopy[data.state];
  const openIncidents = data.incidents.filter((incident) => incident.state !== "resolved");
  const now = new Date();
  const checksByDay = new Map<string, { count: number; failed: boolean }>();
  for (const check of data.history) {
    const key = dayKey(check.checkedAt);
    const previous = checksByDay.get(key);
    checksByDay.set(key, { count: (previous?.count ?? 0) + 1, failed: Boolean(previous?.failed || !check.ok) });
  }
  const days = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - 29 + index);
    const key = dayKey(day);
    const checks = checksByDay.get(key);
    return { key, day, count: checks?.count ?? 0, failed: checks?.failed ?? false };
  });

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="SAPADA Status, beranda">
            <span className="brand-symbol" aria-hidden="true"><span /><span /><span /></span>
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
            <div className="status-main"><span className="status-orb" aria-hidden="true" /><div><h2>{copy.label}</h2><p>{copy.detail}</p></div></div>
            <div className="status-panel-bottom"><span>Pemeriksaan terakhir</span><strong>{data.latest ? `${formatJakarta(data.latest.checkedAt, { dateStyle: "medium", timeStyle: "short" })} WIB` : "Belum tersedia"}</strong></div>
          </div>
        </section>

        <section className="overview" aria-labelledby="overview-title">
          <div className="section-heading"><div><p className="kicker">Pemantauan otomatis</p><h2 id="overview-title">Ketersediaan layanan</h2></div><span className="section-note">30 hari terakhir</span></div>
          <div className="overview-grid">
            <div className="uptime-number"><strong>{data.uptime === null ? "—" : `${data.uptime.toFixed(2)}%`}</strong><span>Pemeriksaan berhasil</span></div>
            <div className="uptime-chart" aria-label="Riwayat pemeriksaan 30 hari">
              <div className="day-bars">{days.map((day) => <span key={day.key} title={`${formatJakarta(day.day, { dateStyle: "medium" })}: ${day.count === 0 ? "tidak ada data" : day.failed ? "ada gangguan" : "beroperasi"}`} className={`day-bar ${day.count === 0 ? "day-empty" : day.failed ? "day-failed" : "day-good"}`} />)}</div>
              <div className="chart-labels"><span>30 hari lalu</span><span>Hari ini</span></div>
            </div>
          </div>
          <p className="overview-footnote">Persentase dihitung dari {data.history.length.toLocaleString("id-ID")} pemeriksaan yang tercatat. Bagian tanpa data tidak dihitung sebagai waktu aktif.</p>
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

        <aside className="about-service"><div><p className="kicker">Tentang halaman ini</p><h2>Satu tempat untuk mengetahui kondisi SAPADA.</h2></div><p>Pemeriksaan otomatis dilakukan setiap lima menit. Pengelola dapat menerbitkan penjelasan ketika layanan terganggu. Jika pemeriksaan berhenti lebih dari 20 menit, status akan ditandai belum dapat dipastikan.</p></aside>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><span>© {now.getFullYear()} SAPADA · Bapenda Kabupaten Garut</span><span>Waktu ditampilkan dalam WIB</span></div></footer>
    </div>
  );
}
