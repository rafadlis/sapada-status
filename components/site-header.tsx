import Link from "next/link";
import { StatusMark } from "@/components/status-mark";

export function SiteHeader() {
  return <header className="site-header"><div className="site-width site-header-inner">
    <Link className="brand" href="/" aria-label="Beranda Status SAPADA"><StatusMark className="brand-symbol" /><span className="brand-copy"><strong>SAPADA</strong><small>Status layanan</small></span></Link>
    <nav aria-label="Navigasi utama" className="site-nav"><Link href="/">Status</Link><Link href="/history">Riwayat</Link><a href="https://sapada.bapenda.garutkab.go.id/" target="_blank" rel="noreferrer">Buka SAPADA ↗</a></nav>
  </div></header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="site-width site-footer-inner"><span>SAPADA · Bapenda Kabupaten Garut</span><div><span>Waktu WIB</span><a href="/rss.xml">RSS pembaruan</a><Link href="/admin">Pengelola</Link></div></div></footer>;
}
