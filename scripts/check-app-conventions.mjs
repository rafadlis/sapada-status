import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const problems = [];
let pages = 0;

function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      scan(path);
      continue;
    }
    if (entry.name === "page.tsx") {
      pages += 1;
      if (!existsSync(join(directory, "loading.tsx"))) {
        problems.push(`${relative(root, path)} needs a sibling loading.tsx`);
      }
    }
    if (!/\.[jt]sx$/.test(entry.name)) continue;
    const source = readFileSync(path, "utf8");
    if (/<a\b/i.test(source)) problems.push(`${relative(root, path)} uses <a> instead of next/link`);
    if (/<(?:[a-z][\w.-]*|Link)\b[^>]*\btitle=/.test(source)) {
      problems.push(`${relative(root, path)} uses a native title tooltip instead of @/components/ui/tooltip`);
    }
    if (/<select\b/.test(source) || /<NativeSelect\b/.test(source) || source.includes("@/components/ui/native-select")) {
      problems.push(`${relative(root, path)} uses a native select instead of @/components/ui/select`);
    }
    if (/prefetch=\{false\}/.test(source)) problems.push(`${relative(root, path)} disables partial prefetching`);
  }
}

scan(join(root, "app"));
scan(join(root, "components"));

const config = readFileSync(join(root, "next.config.ts"), "utf8");
if (!/cacheComponents:\s*true/.test(config)) problems.push("Enable cacheComponents in next.config.ts");
if (!/partialPrefetching:\s*true/.test(config)) problems.push("Enable partialPrefetching in next.config.ts");

if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`✓ ${pages} pages have loading.tsx; Link, Select, Tooltip, and caching conventions pass`);
}
