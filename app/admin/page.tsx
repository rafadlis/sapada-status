import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { AdminIncidentDialog } from "@/components/admin-incident-dialog";
import { AdminIncidentTarget } from "@/components/admin-incident-target";
import { AdminSelect } from "@/components/admin-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteHeader } from "@/components/site-header";
import { PageLoading } from "@/components/page-loading";
import { isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { whatsappAlertDeliveries } from "@/lib/db/schema";
import { formatJakarta, getStatusData } from "@/lib/status";
import { kindLabel, stateLabel } from "@/lib/incident";
import { affectedComponentNames } from "@/lib/incident-components";
import { incidentServiceLabel } from "@/lib/incident-service";
import { alertFailureName, whatsappAlertConfigured } from "@/lib/whatsapp-alerts";

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
  const [data, alertDeliveries] = authorized
    ? await Promise.all([
      getStatusData(null),
      getDb().select().from(whatsappAlertDeliveries).orderBy(desc(whatsappAlertDeliveries.createdAt)).limit(20),
    ])
    : [null, []];
  return <main className="site-width subpage-main admin-main">
    <span className="eyebrow">PENGELOLA BAPENDA</span><h1>{authorized ? "Kelola pembaruan" : "Masuk sebagai pengelola"}</h1>
    {params.error === "login" && !authorized && <p className="form-feedback form-error" role="alert">Kata sandi tidak sesuai. Coba lagi.</p>}
    {params.error === "validation" && authorized && <p className="form-feedback form-error" role="alert">Pilih layanan dan komponen terdampak, lalu lengkapi judul serta catatan publik sesuai batas karakter.</p>}
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
      <section className="admin-section"><Card className="admin-panel">
        <CardHeader className="border-b"><CardTitle><h2>Terbitkan informasi baru</h2></CardTitle></CardHeader>
        <CardContent><form className="admin-form admin-create-form" action="/api/admin/incidents" method="post">
          <AdminIncidentTarget />
          <AdminSelect id="kind" label="Jenis informasi" name="kind" defaultValue="incident" options={[{ value: "incident", label: "Gangguan" }, { value: "maintenance", label: "Pemeliharaan terjadwal" }]} />
          <p className="form-hint">Gangguan dimulai pada tahap “Sedang diselidiki”. Pemeliharaan dimulai pada tahap “Dijadwalkan”.</p>
          <label htmlFor="title">Judul</label><input id="title" name="title" maxLength={120} placeholder="Contoh: Akses layanan terganggu" required />
          <label htmlFor="message">Catatan untuk publik</label><textarea id="message" name="message" rows={5} maxLength={2000} placeholder="Jelaskan dampak, penyebab jika diketahui, dan langkah berikutnya." required />
          <button type="submit">Terbitkan informasi</button>
        </form></CardContent>
      </Card></section>
      <section className="admin-section"><Card className="admin-panel">
        <CardHeader className="border-b"><CardTitle><h2>Kelola informasi</h2></CardTitle>
          <CardDescription>{data?.incidents.length ?? 0} informasi terbaru</CardDescription>
        </CardHeader>
        <CardContent className="admin-table-content">{data?.incidents.length ? <Table aria-label="Daftar informasi layanan" className="admin-incident-table">
          <TableHeader><TableRow>
            <TableHead>Informasi</TableHead><TableHead>Tahap</TableHead><TableHead>Diperbarui</TableHead><TableHead className="text-right">Aksi</TableHead>
          </TableRow></TableHeader>
          <TableBody>{data.incidents.map((incident) => <TableRow key={incident.id}>
            <TableCell className="admin-table-title"><strong>{incident.title}</strong><span>{incidentServiceLabel(incident.serviceKey)} · {kindLabel(incident.kind)}</span>{incident.affectedComponentKeys && <span>{affectedComponentNames(incident.affectedComponentKeys).join(" · ")}</span>}</TableCell>
            <TableCell><span className="admin-stage">{stateLabel(incident.state)}</span></TableCell>
            <TableCell className="admin-table-date">{formatJakarta(incident.updatedAt, { dateStyle: "medium", timeStyle: "short" })} WIB</TableCell>
            <TableCell><div className="admin-row-actions"><Link href={`/incidents/${incident.id}`} aria-label={`Lihat ${incident.title} di halaman publik`}>Lihat publik</Link><AdminIncidentDialog id={incident.id} title={incident.title} kind={incident.kind} state={incident.state} serviceKey={incident.serviceKey} affectedComponentKeys={incident.affectedComponentKeys} /></div></TableCell>
          </TableRow>)}</TableBody>
        </Table> : <p className="admin-empty">Belum ada informasi yang diterbitkan.</p>}</CardContent>
      </Card></section>
      <section className="admin-section"><Card className="admin-panel">
        <CardHeader className="border-b"><CardTitle><h2>Peringatan WhatsApp</h2></CardTitle>
          <CardDescription>{whatsappAlertConfigured() ? "Aktif · pesan dikirim saat gangguan baru terdeteksi" : "Belum aktif · lengkapi konfigurasi OCA dan penerima"}</CardDescription>
        </CardHeader>
        <CardContent className="admin-table-content">{alertDeliveries.length ? <Table aria-label="Riwayat pengiriman peringatan" className="admin-incident-table">
          <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Penerima</TableHead><TableHead>Gangguan</TableHead><TableHead>Pengiriman</TableHead></TableRow></TableHeader>
          <TableBody>{alertDeliveries.map((delivery) => <TableRow key={delivery.id}>
            <TableCell className="admin-table-date">{formatJakarta(delivery.createdAt, { dateStyle: "medium", timeStyle: "short" })} WIB</TableCell>
            <TableCell>••••{delivery.phone.slice(-4)}</TableCell>
            <TableCell>{delivery.failures.map((failure) => alertFailureName(failure.serviceKey)).join(", ")}</TableCell>
            <TableCell><span className="admin-stage">{{ pending: "Menunggu", sending: "Memproses", accepted: "Diterima OCA", retry: "Mencoba lagi", failed: "Gagal", needs_review: "Perlu ditinjau" }[delivery.status] ?? delivery.status}</span>{delivery.lastError && <span className="admin-alert-error">{delivery.lastError}</span>}</TableCell>
          </TableRow>)}</TableBody>
        </Table> : <p className="admin-empty">Belum ada peringatan yang dikirim.</p>}</CardContent>
      </Card></section>
      <form action="/api/admin/logout" method="post"><button className="button-text" type="submit">Keluar dari pengelola</button></form>
    </>}
  </main>;
}
