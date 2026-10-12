// Under `src/`, the social tables may be read and written ONLY by `src/lib/social/**` (plan
// `boards/plan-social-foundation-2026-10-12.md`). Every read there takes the viewer from the session
// and joins the grant on that viewer in the same statement; a query on these tables anywhere else is a
// cross-user read nobody reviewed against that rule. Static, by import and by name: a Drizzle binding
// imported from the schema, a schema namespace's property, the relational API (`db.query.friendLinks`,
// which reaches every table through the schema `db` was built with, no import needed), or a table named
// in raw SQL. Scripts (`scripts/`) are outside it: a probe writes fixtures on a scratch branch.
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** Drizzle bindings for the social tables. A new table joins both lists in the PR that adds it. */
export const SOCIAL_BINDINGS = ["socialProfiles", "friendLinks", "friendInvites", "pods", "podMembers"];
/** The tables' SQL names. `pods` is matched only where SQL would name a table, never as a word in copy. */
const RAW = [
  // Case-insensitive: Postgres folds an unquoted identifier, so `FROM FRIEND_LINKS` names the same table.
  /\b(?:social_profiles|friend_links|friend_invites|pod_members)\b/i,
  /\b(?:from|join|into|update|table)\s+"?pods\b"?/i,
];

const ALLOWED = (path) => path.startsWith("src/lib/social/") || path === "src/db/schema.ts";
const isTest = (path) => /\.test\.(?:t|j)sx?$|\.test\.mts$/.test(path);

/** The findings for one file's source, as `{ line, why }`. Exported for the tests. */
export function socialReadsIn(source) {
  const findings = [];
  const lineAt = (offset) => source.slice(0, offset).split("\n").length;
  const imports = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']([^"']*db\/schema)["']/g;
  for (const m of source.matchAll(imports)) {
    if (/^import\s*type/.test(m[0])) continue;
    const names = m[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter(Boolean);
    for (const name of names) if (SOCIAL_BINDINGS.includes(name)) findings.push({ line: lineAt(m.index), why: `imports ${name}` });
  }
  const namespace = new RegExp(`\\.(${SOCIAL_BINDINGS.join("|")})\\b`, "g");
  if (/import\s*\*\s*as\s+\w+\s+from\s*["'][^"']*db\/schema["']/.test(source)) {
    for (const m of source.matchAll(namespace)) findings.push({ line: lineAt(m.index), why: `reads schema.${m[1]}` });
  }
  for (const m of source.matchAll(new RegExp(`\\.query\\.(${SOCIAL_BINDINGS.join("|")})\\b`, "g"))) {
    findings.push({ line: lineAt(m.index), why: `reads db.query.${m[1]}` });
  }
  for (const pattern of RAW) {
    for (const m of source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))) {
      findings.push({ line: lineAt(m.index), why: `names ${m[0].trim()} in SQL` });
    }
  }
  return findings;
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (/\.(?:ts|tsx|mts|mjs|js)$/.test(entry.name)) out.push(path);
  }
  return out;
}

/** Every finding under `root` (the repository), outside the allowed paths and outside tests. */
export async function socialReadFindings(root, dir = "src") {
  const files = await walk(join(root, dir));
  const findings = [];
  for (const file of files) {
    const path = relative(root, file).split(sep).join("/");
    if (ALLOWED(path) || isTest(path)) continue;
    for (const f of socialReadsIn(await readFile(file, "utf8"))) findings.push({ path, ...f });
  }
  return { files: files.length, findings };
}
