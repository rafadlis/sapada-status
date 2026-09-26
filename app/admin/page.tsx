import { connection } from "next/server";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { getStatusData, formatJakarta } from "@/lib/status";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; updated?: string }> }) {
  await connection();
  const params = await searchParams;
  const authorized = await isAdmin();
  const data = authorized ? await getStatusData() : null;

  return (
    <main className="admin-shell">
      <div className="admin-top"><Link className="brand-word" href="/">SAPADA<span> / Status</span></Link><Link href="/">Lihat halaman publik</Link></div>
      <section className="admin-content">
        <p className="kicker">Pengelolaan status</p>
        <h1>{authorized ? "Informasi gangguan" : "Masuk sebagai pengelola"}</h1>
        {params.error === "login" && !authorized && <p className="form-feedback form-error" role="alert">Kata sandi tidak sesuai. Coba lagi.</p>}
        {params.error === "validation" && authorized && <p className="form-feedback form-error" role="alert">Isi judul dan penjelasan sesuai batas karakter.</p>}
        {(params.created === "1" || params.updated === "1") && authorized && <p className="form-feedback form-success" role="status">Informasi gangguan berhasil diperbarui.</p>}
        {!authorized ? (
          <form className="admin-form" action="/api/admin/login" method="post">
            <p>Masukkan kata sandi pengelola untuk menerbitkan pembaruan layanan.</p>
            <label htmlFor="password">Kata sandi</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            <button type="submit">Masuk</button>
          </form>
        ) : (
          <>
            <p>Pemeriksaan otomatis menunjukkan kondisi layanan. Gunakan catatan ini untuk menjelaskan gangguan kepada publik.</p>
            <form className="admin-form" action="/api/admin/incidents" method="post">
              <h2>Terbitkan informasi baru</h2>
              <label htmlFor="title">Judul</label>
              <input id="title" name="title" maxLength={120} placeholder="Contoh: Gangguan akses SAPADA" required />
              <label htmlFor="message">Penjelasan untuk publik</label>
              <textarea id="message" name="message" rows={5} maxLength={2000} placeholder="Jelaskan dampak dan langkah penanganan yang sedang dilakukan." required />
              <button type="submit">Terbitkan informasi</button>
            </form>
            <h2>Informasi sebelumnya</h2>
            <div className="admin-incidents">
              {data?.incidents.length ? data.incidents.map((incident) => (
                <article className="admin-incident" key={incident.id}>
                  <div><strong>{incident.title}</strong><span>{formatJakarta(incident.createdAt, { dateStyle: "medium", timeStyle: "short" })} WIB</span></div>
                  <p>{incident.message}</p>
                  <form action={`/api/admin/incidents/${incident.id}`} method="post">
                    <input type="hidden" name="action" value={incident.state === "resolved" ? "reopen" : "resolve"} />
                    <button className="button-secondary" type="submit">{incident.state === "resolved" ? "Buka kembali" : "Tandai selesai"}</button>
                  </form>
                </article>
              )) : <p>Belum ada informasi gangguan.</p>}
            </div>
            <form action="/api/admin/logout" method="post"><button className="button-text" type="submit">Keluar</button></form>
          </>
        )}
      </section>
    </main>
  );
}
