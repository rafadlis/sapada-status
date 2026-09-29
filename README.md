# Status Layanan Bapenda Garut

Public status page for four Bapenda Kabupaten Garut services: SAPADA, Struk Berhadiah, Simpul PAD, and the main Bapenda website. It is deployed on Vercel with Neon Postgres at `https://status.bapenda.garutkab.go.id`.

The page shows the latest HTTP result for each service and history ranges from 30 minutes to 90 days. The default is 30 days. Each bar represents one minute, hour, or Jakarta calendar day according to the selected range. Green bars have only successful checks, yellow bars have both successful and failed checks, red bars have only failed checks, and gray bars have no recorded check. Hover or select a bar to see its exact period, failure count, latest error time, and reason. Its detail link lists every check in that period with exact timestamps. The displayed uptime is estimated from recorded checks, not continuous observation. Open pages refresh every minute while visible. When a service has no result for 20 minutes, its state becomes unknown.

## Setup

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and set the Neon connection strings and secrets.
3. Apply the Drizzle migrations with `bunx drizzle-kit migrate`.
4. Run `bun run lint -- app lib components` and `node scripts/check-app-conventions.mjs`.

`DATABASE_URL` is the pooled Neon URL used by the app. `DATABASE_URL_UNPOOLED` is the direct URL used for migrations. Keep both out of Git. The `@shadcn/lint` plugin is registered in `eslint.config.mjs`.

## Monitoring and updates

The GitHub Actions workflow calls `POST /api/check` on a five-minute schedule. Configure `MONITOR_TOKEN` as both a GitHub Actions repository secret and a Vercel environment variable, and set the `STATUS_URL` repository variable to the Vercel production URL. Vercel Cron calls `GET /api/check` through 96 daily jobs as a backup; set `CRON_SECRET` in Vercel production environment variables. A request checks all four public services and the SAPADA integrations concurrently, records each result in Neon, and returns the results as JSON. The workflow can also be triggered manually.

The SAPADA section has four integration components: TTE, Storage, Payment API, and ATR BPN API. The status app calls SAPADA's protected, read only `/api/internal/integration-health` route because the VPN endpoints cannot be reached from Vercel. Set `INTEGRATION_HEALTH_TOKEN` to a random 64-character hexadecimal signing seed in Vercel production. Sapada verifies short lived Ed25519 signatures with a public key in its code; no signing secret is needed on the SAPADA server. Without the seed, integration components remain unknown and no integration checks are recorded. A failed or malformed probe response records failures for all four components. Payment API is healthy only when all four payment VPN routes accept a TCP connection. This proves network reachability, not that a payment transaction succeeds. The ATR BPN component remains unknown until SAPADA has an `ATR_BPN_SPLP_HEALTH_URL`. HTTP 4xx from the TTE or SPLP HEAD probe means the route answered; it does not prove an authenticated business transaction works. No provider URL or credential appears on the public status page.

Open `/admin` and sign in with `ADMIN_PASSWORD` to publish a disruption or planned maintenance for one service or all services in a single update. The page uses `SESSION_SECRET` to sign its session cookie. Every stage change requires a public note and creates a dated update. The homepage highlights active updates, `/history` lists earlier events, `/incidents/:id` shows each timeline and affected services, and `/rss.xml` publishes official updates. The migration assigns existing SAPADA checks and updates to the SAPADA service.

On the current Vercel Hobby plan, each Cron job runs once per day with timing precision of roughly one hour. The 96 daily jobs add backup checks but cannot guarantee a precise 15-minute interval. GitHub Actions remains the five-minute scheduler; its scheduled runs can be late or skipped under load, and GitHub may disable them in an inactive public repository. The public page marks monitoring as unknown when results stop arriving. The status site and Neon must be reachable for checks to be saved.

## Domain

`status.bapenda.garutkab.go.id` is attached to the Vercel project and serves the status page over HTTPS. Cloudflare has a DNS-only A record named `status.bapenda` in the `garutkab.go.id` zone pointing to `76.76.21.21`. Public resolvers return that address. Vercel now recommends a project-specific CNAME, while its domain settings say the legacy A record continues to work. The app is also available at `sapada-status.vercel.app`.
