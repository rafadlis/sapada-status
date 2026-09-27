# Status Layanan Bapenda Garut

Public status page for four Bapenda Kabupaten Garut services: SAPADA, Struk Berhadiah, Simpul PAD, and the main Bapenda website. It is deployed on Vercel with Neon Postgres. The requested public domain is `status.bapenda.garutkab.go.id`.

The page shows the latest HTTP result for each service and history ranges from 30 minutes to 30 days. The default is 30 days. Each bar represents one minute, hour, or Jakarta calendar day according to the selected range. Green bars have successful checks, red bars have at least one failed check, and gray bars have no recorded check. Hover or select a bar to see its exact period, failure count, latest error time, and reason. Its detail link lists every check in that period with exact timestamps. The displayed uptime is estimated from recorded checks, not continuous observation. Open pages refresh every minute while visible. When a service has no result for 20 minutes, its state becomes unknown.

## Setup

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and set the Neon connection strings and secrets.
3. Apply the Drizzle migrations with `bunx drizzle-kit migrate`.
4. Run `bun run lint -- app lib components` and `node scripts/check-app-conventions.mjs`.

`DATABASE_URL` is the pooled Neon URL used by the app. `DATABASE_URL_UNPOOLED` is the direct URL used for migrations. Keep both out of Git. The `@shadcn/lint` plugin is registered in `eslint.config.mjs`.

## Monitoring and updates

The GitHub Actions workflow calls `POST /api/check` on a five-minute schedule. Configure `MONITOR_TOKEN` as both a GitHub Actions repository secret and a Vercel environment variable, and set the `STATUS_URL` repository variable to the Vercel production URL. Vercel Cron calls `GET /api/check` through 96 daily jobs as a backup; set `CRON_SECRET` in Vercel production environment variables. A request checks all four services concurrently, records each result in Neon, and returns the results as JSON. The workflow can also be triggered manually.

Open `/admin` and sign in with `ADMIN_PASSWORD` to publish a disruption or planned maintenance for a selected service. The page uses `SESSION_SECRET` to sign its session cookie. Every stage change requires a public note and creates a dated update. The homepage highlights active updates, `/history` lists earlier events, `/incidents/:id` shows each timeline, and `/rss.xml` publishes official updates. The migration assigns existing SAPADA checks and updates to the SAPADA service.

On the current Vercel Hobby plan, each Cron job runs once per day with timing precision of roughly one hour. The 96 daily jobs add backup checks but cannot guarantee a precise 15-minute interval. GitHub Actions remains the five-minute scheduler; its scheduled runs can be late or skipped under load, and GitHub may disable them in an inactive public repository. The public page marks monitoring as unknown when results stop arriving. The status site and Neon must be reachable for checks to be saved.

## Domain

`status.bapenda.garutkab.go.id` is attached to the Vercel project. The DNS administrator must add a DNS-only CNAME record in Cloudflare: name `status.bapenda`, target `520250c00b0dea70.vercel-dns-017.com`. After propagation, verify the domain and certificate in Vercel. Until then, the app is available at `sapada-status.vercel.app`.
