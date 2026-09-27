import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return <header className="site-header"><div className="site-width site-header-inner">
    <Link className="brand" href="/" aria-label="Beranda Status Bapenda Garut"><Image className="brand-symbol" src="/bapenda-mark.png" alt="" width={119} height={180} priority /><span className="brand-copy"><strong>BAPENDA</strong><small>Status layanan Garut</small></span></Link>
    <Link className="header-subscribe" href="/rss.xml">RSS pembaruan</Link>
  </div></header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="site-width site-footer-inner"><span>Bapenda Kabupaten Garut</span><div><span>Waktu WIB</span><Link href="https://bapenda.garutkab.go.id/" target="_blank" rel="noreferrer">Buka Bapenda</Link><Link href="/admin">Pengelola</Link></div></div></footer>;
}
