// Under `src/`, the `stripe` package and the Stripe tables are reached ONLY through `src/lib/payments/**`
// (payments scope §5.8). That directory holds the key-mode guard, the server-side pack registry and the
// webhook's fetch-and-verify; code anywhere else that imports the SDK or writes a Stripe table has
// skipped all three. Static, by import and by name, in the shape of `social-reads.mjs`. `credit_grants`
// is not listed: the allowance ledger reads it (`src/lib/model/allowance.ts`), and only the webhook path
// writes it. Scripts (`scripts/`) are outside it: a probe writes fixtures on a scratch branch.
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** Drizzle bindings for the Stripe tables. A new one joins both lists in the PR that adds it. */
export const PAYMENT_BINDINGS = ["stripeCustomers", "stripeEvents", "paymentRecords"];
const RAW = /\b(?:stripe_customers|stripe_events|payment_records)\b/i;

// The purge names `stripe_customers` in PURGE_ORDER, which is how an account's mapping goes with it.
const ALLOWED = (path) => path.startsWith("src/lib/payments/") || path === "src/db/schema.ts" || path === "src/lib/account/purge.ts";
const isTest = (path) => /\.test\.(?:t|j)sx?$|\.test\.mts$/.test(path);

/** The findings for one file's source, as `{ line, why }`. Exported for the tests. */
export function paymentReadsIn(source) {
  const findings = [];
  const lineAt = (offset) => source.slice(0, offset).split("\n").length;
  // The SDK, by any import form a module can take: a value import, `import type`, `require` or `import()`.
  for (const m of source.matchAll(/(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)["']stripe(?:\/[^"']*)?["']/g)) {
    findings.push({ line: lineAt(m.index), why: "imports the stripe package" });
  }
  const imports = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']([^"']*db\/schema)["']/g;
  for (const m of source.matchAll(imports)) {
    if (/^import\s*type/.test(m[0])) continue;
    const names = m[1].split(",").map((s) => s.trim()).filter((s) => s && !/^type\s/.test(s)).map((s) => s.split(/\s+as\s+/)[0]);
    for (const name of names) if (PAYMENT_BINDINGS.includes(name)) findings.push({ line: lineAt(m.index), why: `imports ${name}` });
  }
  if (/import\s*\*\s*as\s+\w+\s+from\s*["'][^"']*db\/schema["']/.test(source)) {
    for (const m of source.matchAll(new RegExp(`\\.(${PAYMENT_BINDINGS.join("|")})\\b`, "g"))) {
      findings.push({ line: lineAt(m.index), why: `reads schema.${m[1]}` });
    }
  }
  for (const m of source.matchAll(new RegExp(`\\.query\\.(${PAYMENT_BINDINGS.join("|")})\\b`, "g"))) {
    findings.push({ line: lineAt(m.index), why: `reads db.query.${m[1]}` });
  }
  for (const m of source.matchAll(new RegExp(RAW.source, "gi"))) findings.push({ line: lineAt(m.index), why: `names ${m[0]}` });
  return findings;
}

const gone = (err) => err?.code === "ENOENT";

async function walk(dir, top = true) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (!top && gone(err)) return out;
    throw err;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path, false)));
    else if (/\.(?:ts|tsx|mts|mjs|js)$/.test(entry.name)) out.push(path);
  }
  return out;
}

/** Every finding under `root` (the repository), outside the allowed paths and outside tests. */
export async function paymentReadFindings(root, dir = "src") {
  const files = await walk(join(root, dir));
  const findings = [];
  let read = 0;
  for (const file of files) {
    const path = relative(root, file).split(sep).join("/");
    if (ALLOWED(path) || isTest(path)) { read += 1; continue; }
    let source;
    try {
      source = await readFile(file, "utf8");
    } catch (err) {
      if (gone(err)) continue;
      throw err;
    }
    read += 1;
    for (const f of paymentReadsIn(source)) findings.push({ path, ...f });
  }
  return { files: read, findings };
}
