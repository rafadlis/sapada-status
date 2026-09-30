import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/") },
    { url: absoluteUrl("/history") },
  ];

  if (!process.env.DATABASE_URL) return pages;

  const rows = await getDb().select({ id: incidents.id, updatedAt: incidents.updatedAt }).from(incidents);
  return [
    ...pages,
    ...rows.map((incident) => ({
      url: absoluteUrl(`/incidents/${incident.id}`),
      lastModified: incident.updatedAt,
    })),
  ];
}
