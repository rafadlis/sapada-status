# Status SAPADA

Public status page for `sapada.bapenda.garutkab.go.id`, hosted at `status.sapada.bapenda.garutkab.go.id`.

The page shows the most recent HTTP check, selectable history ranges from 60 minutes to 30 days, and incident updates written by an administrator. The default history range is 60 minutes. Each history bar can be opened to see its check period, failure count, latest error time, and reason. Its detail link lists every check in that period with exact timestamps and paginates long periods. A failed check marks the service as disrupted. If no check has arrived in 20 minutes, the page shows an unknown state rather than claiming that the service is healthy.

## Setup

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and set the Neon connection strings and secrets.
3. Apply the Drizzle migrations with `bunx drizzle-kit migrate`.
4. Run `bun run lint -- app lib` to check the app code. The `@shadcn/lint` plugin is registered in `eslint.config.mjs`; no design rules are enabled yet. Choose rules from the [rule list](https://github.com/shadcn-ui/lint#rules) and add them to that config.

`DATABASE_URL` is the pooled Neon URL used by the app. `DATABASE_URL_UNPOOLED` is the direct URL used for migrations. Keep both out of Git.

## Monitoring and incidents

The GitHub Actions workflow calls `POST /api/check` every five minutes. Configure `MONITOR_TOKEN` as both a GitHub Actions repository secret and a Vercel environment variable, and set the `STATUS_URL` repository variable to the Vercel production URL. Vercel Cron also calls `GET /api/check` through 96 separate daily jobs, four scheduled in each UTC hour; set `CRON_SECRET` in Vercel production environment variables. Both endpoints measure a request to SAPADA, record the result in Neon, and return the result as JSON. A workflow run can also be triggered manually.

Open `/admin` and sign in with `ADMIN_PASSWORD` to publish an incident or mark one resolved. The page requires `SESSION_SECRET` to sign its session cookie. Only the public incident text and timestamps appear on the status page.

The current Vercel Hobby plan permits each Cron job to run once per day, with timing precision of roughly one hour. The 96 daily jobs add backup checks but cannot guarantee a precise 15-minute interval. GitHub Actions remains the five-minute scheduler; its scheduled runs can be late or skipped under load, and GitHub disables scheduled workflows in public repositories after 60 days without repository activity. Five-minute Vercel Cron in one job requires a Pro plan. The public page marks monitoring as unknown when results stop arriving. The status site and its database must be reachable for checks to be saved.

## Domain

The domain is attached to the Vercel project. Its DNS administrator must add an `A` record for `status.sapada.bapenda.garutkab.go.id` pointing to `76.76.21.21`. The authoritative nameservers are on Cloudflare, so create the record there with the proxy disabled (DNS only). After propagation, check the domain and certificate in Vercel.
