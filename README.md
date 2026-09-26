# Status SAPADA

Public status page for `sapada.bapenda.garutkab.go.id`, hosted at `status.sapada.bapenda.garutkab.go.id`.

The page shows the most recent HTTP check, a 30 day history, and incident updates written by an administrator. A failed check marks the service as disrupted. If no check has arrived in 20 minutes, the page shows an unknown state rather than claiming that the service is healthy.

## Setup

1. Install dependencies with `bun install`.
2. Copy `.env.example` to `.env.local` and set the Neon connection strings and secrets.
3. Apply the Drizzle migrations with `bunx drizzle-kit migrate`.
4. Run `bun run lint -- app lib` to check the app code. The `@shadcn/lint` plugin is registered in `eslint.config.mjs`; no design rules are enabled yet. Choose rules from the [rule list](https://github.com/shadcn-ui/lint#rules) and add them to that config.

`DATABASE_URL` is the pooled Neon URL used by the app. `DATABASE_URL_UNPOOLED` is the direct URL used for migrations. Keep both out of Git.

## Monitoring and incidents

The GitHub Actions workflow calls `POST /api/check` every five minutes. Configure `MONITOR_TOKEN` as both a GitHub Actions repository secret and a Vercel environment variable, and set the `STATUS_URL` repository variable to the Vercel production URL. The endpoint measures a request to SAPADA, records the result in Neon, and returns the result as JSON. A workflow run can also be triggered manually.

Open `/admin` and sign in with `ADMIN_PASSWORD` to publish an incident or mark one resolved. The page requires `SESSION_SECRET` to sign its session cookie. Only the public incident text and timestamps appear on the status page.

GitHub scheduled workflows can run late or be skipped under load. The public page marks monitoring as unknown when results stop arriving. The status site and its database must be reachable for checks to be saved.

## Domain

Add `status.sapada.bapenda.garutkab.go.id` to the Vercel project. The domain administrator must add the DNS record shown by Vercel before the public address will work.
