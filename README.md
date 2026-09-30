# Status Layanan Bapenda Garut

Public status page for four Bapenda Kabupaten Garut services: SAPADA, Struk Berhadiah, Simpul PAD, and the main Bapenda website. It is deployed on Vercel with Neon Postgres at `https://status.bapenda.garutkab.go.id`.

The page shows the latest status for each service and history ranges from 30 minutes to 90 days. The default is 30 days. Each bar represents one minute, hour, or Jakarta calendar day according to the selected range. Green bars have only successful checks, yellow bars have both successful and failed checks, red bars have only failed checks, and gray bars have no recorded check. Hover or select a bar to see its exact period, failure count, latest error time, and reason. Its detail link lists every check in that period with exact timestamps. The displayed uptime is estimated from recorded checks, not continuous observation. Open pages refresh every minute while visible. When a service has no result for 20 minutes, its state becomes unknown.

## Setup

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and set the Neon connection strings and secrets.
3. Apply the Drizzle migrations with `bunx drizzle-kit migrate`.
4. Run `bun run lint -- app lib components` and `node scripts/check-app-conventions.mjs`.

`DATABASE_URL` is the pooled Neon URL used by the app. `DATABASE_URL_UNPOOLED` is the direct URL used for migrations. Keep both out of Git. The `@shadcn/lint` plugin is registered in `eslint.config.mjs`.

## Search and link previews

`lib/seo.ts` defines the production origin used by canonical URLs, social previews, structured data, and the sitemap. Update it if the production domain changes. The homepage canonical consolidates history-range variants; history pagination and period archives each retain their own canonical URL. Incident titles and descriptions use the published incident and latest update, with data shared between metadata and page rendering for each request.

`/sitemap.xml` lists the homepage, history, and all published incidents with their actual update timestamps. `/robots.txt` advertises the sitemap and excludes API routes from crawling. Admin and check-detail pages have `noindex` metadata and remain crawlable so search engines can read that rule. Vercel preview deployments disallow crawling and have `noindex` metadata. `/opengraph-image` provides the shared social image, and public pages advertise the RSS feed. After deployment, submit the production sitemap in Google Search Console.

## Monitoring and updates

The GitHub Actions workflow calls `POST /api/check` on a five-minute schedule. Configure `MONITOR_TOKEN` as both a GitHub Actions repository secret and a Vercel environment variable, and set the `STATUS_URL` repository variable to the Vercel production URL. Vercel Cron calls `GET /api/check` through 96 daily jobs as a backup; set `CRON_SECRET` in Vercel production environment variables. A request checks all four public services and the SAPADA integrations concurrently, records each result in Neon, and returns the results as JSON. The workflow can also be triggered manually.

### WhatsApp failure alerts

The monitor notifies active WhatsApp recipients through OCA when a service or component changes from healthy to failed. Manage names and numbers in `/admin`: add, edit, activate, deactivate, or remove recipients. Disabling, removing, or changing a number cancels its pending messages; a message already submitted to OCA cannot be recalled. Recipient numbers are stored in the database and are only visible to authenticated admins. An alert lists the newly failing checks, the Jakarta time, and their HTTP status or an unreachable reason. Repeated failed checks do not send repeated alerts. A later healthy check rearms the alert for the next failure. The database stores each recipient's delivery result; `/admin` shows the latest results with masked numbers. OCA rate limits are retried on later checks, while a network timeout or uncertain OCA response is flagged for manual review instead of risking a duplicate message.

OCA approved the Indonesian template on 30 September 2026 with the code `marketing:peringatan_gangguan_layanan_bapenda`. Its body is:

```text
Peringatan gangguan layanan Bapenda Garut.

Layanan/komponen: {{1}}
Waktu: {{2}} WIB
Hasil pemeriksaan: {{3}}

Mohon segera periksa layanan, telusuri penyebab gangguan, dan lakukan penanganan. Pantau status di https://status.bapenda.garutkab.go.id/.

Pesan ini dikirim otomatis oleh sistem.
```

Apply the database migration and set `WHATSAPP_BIZ_OCA_ENDPOINT`, `WHATSAPP_BIZ_OCA_TOKEN`, and `WHATSAPP_BIZ_OCA_TEMPLATE_CODE_STATUS_ALERT=marketing:peringatan_gangguan_layanan_bapenda` in Vercel production. Add recipients in `/admin` using international format, such as `6281234567890`. Keep the token and real recipient numbers out of Git. Alerts require all three OCA settings and an active recipient. The first configured check treats any currently failed service or component as a new failure. Review the admin delivery table after the first live alert. “Diterima OCA” confirms provider acceptance, not delivery to the handset.

The SAPADA section has five components: its public website, TTE, Storage, Payment API, and ATR BPN API. The parent row reports their combined status. It is degraded if any component fails, unknown if a component has no recent result and none fails, and operational only if all five are healthy. Its history and uptime count complete monitoring runs, with success requiring all five checks to pass. Older website-only runs do not count toward the overall history. The status app calls SAPADA's protected, read only `/api/internal/integration-health` route because the VPN endpoints cannot be reached from Vercel. Set `INTEGRATION_HEALTH_TOKEN` to a random 64-character hexadecimal signing seed in Vercel production. Sapada verifies short lived Ed25519 signatures with a public key in its code; no signing secret is needed on the SAPADA server. Without the seed, integration components remain unknown and no integration checks are recorded. A failed or malformed probe response records failures for all four integration components. Payment API is healthy only when all four payment VPN routes accept a TCP connection. This proves network reachability, not that a payment transaction succeeds. SAPADA checks its inbound ATR BPN API with an unauthenticated POST and expects the route's Basic Auth challenge. This confirms route and auth guard reachability without sending credentials or taxpayer data; it does not prove that a business lookup succeeds. No provider URL or credential appears on the public status page.

Open `/admin` and sign in with `ADMIN_PASSWORD` to publish a disruption or planned maintenance for one service or all services in a single update. The page uses `SESSION_SECRET` to sign its session cookie. Every stage change requires a public note and creates a dated update. The homepage highlights active updates, `/history` lists earlier events, `/incidents/:id` shows each timeline and affected services, and `/rss.xml` publishes official updates. The migration assigns existing SAPADA checks and updates to the SAPADA service.

On the current Vercel Hobby plan, each Cron job runs once per day with timing precision of roughly one hour. The 96 daily jobs add backup checks but cannot guarantee a precise 15-minute interval. GitHub Actions remains the five-minute scheduler; its scheduled runs can be late or skipped under load, and GitHub may disable them in an inactive public repository. The public page marks monitoring as unknown when results stop arriving. The status site and Neon must be reachable for checks to be saved.

## Domain

`status.bapenda.garutkab.go.id` is attached to the Vercel project and serves the status page over HTTPS. Cloudflare has a DNS-only A record named `status.bapenda` in the `garutkab.go.id` zone pointing to `76.76.21.21`. Public resolvers return that address. Vercel now recommends a project-specific CNAME, while its domain settings say the legacy A record continues to work. The app is also available at `sapada-status.vercel.app`.
