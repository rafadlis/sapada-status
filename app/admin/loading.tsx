import { PageLoading } from "@/components/page-loading";
import { SiteHeader } from "@/components/site-header";

export default function Loading() {
  return <div className="status-site"><SiteHeader /><PageLoading page="admin" /></div>;
}
