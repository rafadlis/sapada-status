import { PageLoading } from "@/components/page-loading";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default function Loading() {
  return <div className="status-site reference-site"><SiteHeader /><PageLoading page="home" /><SiteFooter /></div>;
}
