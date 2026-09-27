type Page = "home" | "history" | "checks" | "incident" | "admin";

const labels: Record<Page, string> = {
  home: "Memuat status layanan",
  history: "Memuat riwayat pembaruan",
  checks: "Memuat detail pemeriksaan",
  incident: "Memuat kronologi pembaruan",
  admin: "Memuat halaman pengelola",
};

export function PageLoading({ page }: { page: Page }) {
  const reference = page === "home" || page === "history";
  return <main className={`site-width page-loading ${reference ? `reference-${page === "home" ? "main" : "history-page"}` : "subpage-main"}`} role="status" aria-live="polite">
    <span className="visually-hidden">{labels[page]}…</span>
    {page === "home" ? <>
      <div className="loading-card loading-overall"><span className="loading-line loading-title" /><span className="loading-line loading-body" /></div>
      <div className="loading-card loading-system"><span className="loading-line loading-title" /><span className="loading-line loading-body" /><span className="loading-bars" /></div>
    </> : <>
      <span className="loading-line loading-short" />
      <span className="loading-line loading-title" />
      <div className="loading-list"><span /><span /><span /></div>
    </>}
  </main>;
}
