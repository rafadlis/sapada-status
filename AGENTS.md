<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Use `@/components/ui/select` (the shadcn Base UI Select) for selection controls. Do not add native `<select>` elements or `NativeSelect`. The `check:conventions` script enforces this in `app/` and `components/`.

Use `@/components/ui/tooltip` for supplementary hover or focus hints. Do not use native `title` attributes or custom hover-only popovers. Keep navigation and other actions on the trigger, since tooltip content is informational.
