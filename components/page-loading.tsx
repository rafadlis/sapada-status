import { HistoryChartSkeleton } from "@/components/history-chart-skeleton";
import { defaultHistoryRange, getHistoryRange } from "@/lib/history-range";

type Page = "home" | "history" | "checks" | "incident" | "admin";

const labels: Record<Page, string> = {
  home: "Memuat status layanan",
  history: "Memuat riwayat pembaruan",
  checks: "Memuat detail pemeriksaan",
  incident: "Memuat kronologi pembaruan",
  admin: "Memuat halaman pengelola",
};

export function PageLoading({ page, range = defaultHistoryRange }: { page: Page; range?: ReturnType<typeof getHistoryRange> }) {
  const reference = page === "home" || page === "history";
  return <main className={`site-width page-loading ${reference ? `reference-${page === "home" ? "main" : "history-page"}` : "subpage-main"}`} role="status" aria-live="polite">
    <span className="visually-hidden">{labels[page]}…</span>
    {page === "home" ? <>
      <div className="loading-card loading-overall"><span className="loading-line loading-title" /><span className="loading-line loading-body" /></div>
      <HistoryChartSkeleton range={range} />
    </> : <>
      <span className="loading-line loading-short" />
      <span className="loading-line loading-title" />
      <div className="loading-list"><span /><span /><span /></div>
    </>}
  </main>;
}
