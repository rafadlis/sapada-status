import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PageLoading } from "@/components/page-loading";
import { isAdmin } from "@/lib/auth";
import { formatJakarta, getStatusData } from "@/lib/status";
import { kindLabel, stateLabel } from "@/lib/incident";
import { getService, services } from "@/lib/services";

type AdminProps = { searchParams: Promise<{ error?: string; created?: string; updated?: string }> };

export default function AdminPage({ searchParams }: AdminProps) {
  return <div className="status-site"><SiteHeader />
    <Suspense fallback={<PageLoading page="admin" />}><AdminContent searchParams={searchParams} /></Suspense>
  </div>;
}

async function AdminContent({ searchParams }: AdminProps) {
  await connection();
  const params = await searchParams;
  const authorized = await isAdmin();
  const data = authorized ? await getStatusData(0) : null;
  return <main className="site-width subpage-main admin-main">
    <span className="eyebrow">PENGELOLA BAPENDA</span><h1>{authorized ? "Kelola pembaruan" : "Masuk sebagai pengelola"}</h1>
    {params.error === "login" && !authorized && <p className="form-feedback form-error" role="alert">Kata sandi tidak sesuai. Coba lagi.</p>}
    {params.error === "validation" && authorized && <p className="form-feedback form-error" role="alert">Pilih layanan dan lengkapi judul serta catatan publik sesuai batas karakter.</p>}
    {(params.created === "1" || params.updated === "1") && authorized && <p className="form-feedback form-success" role="status">Pembaruan telah diterbitkan.</p>}
    {!authorized ? <form className="admin-form" action="/api/admin/login" method="post">
      <p>Masukkan kata sandi untuk menerbitkan informasi layanan.</p>
      <label htmlFor="password">Kata sandi</label><input id="password" name="password" type="password" autoComplete="current-password" required />
      <button type="submit">Masuk</button>
    </form> : <>
      <p className="page-description">Beri konteks saat pemantauan mendeteksi gangguan. Setiap perubahan tahap disertai catatan yang muncul dalam kronologi publik.</p>
      <div className="admin-monitor-list">{data?.services.map((service) => <div className="admin-monitor" key={service.service.key}>
        <div><span className={`service-dot dot-${service.state}`} /><strong>{service.service.name}: {service.state === "operational" ? "dapat diakses" : service.state === "degraded" ? "pemeriksaan gagal" : "status belum diketahui"}</strong></div>
        <span>{service.latest ? `Pemeriksaan ${formatJakarta(service.latest.checkedAt, { dateStyle: "medium", timeStyle: "medium" })} WIB` : "Belum ada pemeriksaan"}</span>
      </div>)}</div>
      <section className="admin-section"><h2>Terbitkan informasi baru</h2>
        <form className="admin-form" action="/api/admin/incidents" method="post">
          <label htmlFor="serviceKey">Layanan</label><select id="serviceKey" name="serviceKey" defaultValue={services[0].key} required>{services.map((service) => <option key={service.key} value={service.key}>{service.name}</option>)}</select>
          <label htmlFor="kind">Jenis informasi</label><select id="kind" name="kind" defaultValue="incident"><option value="incident">Gangguan</option><option value="maintenance">Pemeliharaan terjadwal</option></select>
          <p className="form-hint">Gangguan dimulai pada tahap “Sedang diselidiki”. Pemeliharaan dimulai pada tahap “Dijadwalkan”.</p>
          <label htmlFor="title">Judul</label><input id="title" name="title" maxLength={120} placeholder="Contoh: Akses layanan terganggu" required />
          <label htmlFor="message">Catatan untuk publik</label><textarea id="message" name="message" rows={5} maxLength={2000} placeholder="Jelaskan dampak, penyebab jika diketahui, dan langkah berikutnya." required />
          <button type="submit">Terbitkan informasi</button>
        </form>
      </section>
      <section className="admin-section"><h2>Kelola informasi</h2>
        {data?.incidents.length ? <div className="admin-incidents">{data.incidents.map((incident) => <article className="admin-incident" key={incident.id}>
          <div className="admin-incident-head"><div><span className="eyebrow">{getService(incident.serviceKey)?.name ?? "Layanan"} · {kindLabel(incident.kind)} · {stateLabel(incident.state)}</span><h3>{incident.title}</h3></div><Link href={`/incidents/${incident.id}`}>Lihat publik ↗</Link></div>
          <p>{incident.updates[0]?.message || incident.message}</p>
          <p className="form-hint">Pembaruan terakhir {formatJakarta(incident.updatedAt, { dateStyle: "medium", timeStyle: "short" })} WIB</p>
          <form className="admin-form update-form" action={`/api/admin/incidents/${incident.id}`} method="post">
            <label htmlFor={`state-${incident.id}`}>Tahap berikutnya</label><select id={`state-${incident.id}`} name="state" defaultValue={incident.state}>{(incident.kind === "maintenance" ? ["scheduled", "in_progress", "resolved"] : ["investigating", "identified", "monitoring", "resolved"]).map((state) => <option key={state} value={state}>{stateLabel(state)}</option>)}</select>
            <label htmlFor={`note-${incident.id}`}>Catatan pembaruan</label><textarea id={`note-${incident.id}`} name="message" rows={3} maxLength={2000} placeholder="Jelaskan perkembangan terbaru kepada publik." required />
            <button type="submit">Terbitkan pembaruan</button>
          </form>
        </article>)}</div> : <p className="muted-box">Belum ada informasi yang diterbitkan.</p>}
      </section>
      <form action="/api/admin/logout" method="post"><button className="button-text" type="submit">Keluar dari pengelola</button></form>
    </>}
  </main>;
}
