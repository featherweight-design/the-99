// Guards that key an allowlist, an exemption map or an inventory on a FILE PATH go stale silently when the code moves:
// the path stops matching anything, the guard keeps passing, and the exemption it granted now hides nothing (or, worse,
// the next file to appear at that path). This is the one place that turns a stale name into a loud, named failure.
//
//   missingNamedFiles(guard, mapName, paths)       a named path that is not on disk
//   staleNamedEntries(guard, mapName, entries)      a named path that exists but no longer holds what the entry exempts
//
// Both return the messages (empty when every name still holds) so a test can `expect(...).toEqual([])` and a script can
// print them. `assertNamedFiles` / `assertNamedEntries` throw them joined, for a guard with no better way to report.
// Pure `node:fs`, no dependencies: ESLint, `check:*` scripts and vitest all load it.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const here = (root, p) => path.join(root, p);

/** @param {string} guard @param {string} mapName @param {string} p */
const missing = (guard, mapName, p) =>
  `${guard}: ${p} is named in ${mapName} but does not exist: moved? update the entry or delete it`;

/**
 * Every path in `paths` that is not a file under `root`.
 * @param {string} guard the guard's name, as a reader would search for it
 * @param {string} mapName the list or map that names the paths (`ALLOWED`, `SHELLS.bodyFiles`)
 * @param {Iterable<string>} paths repository-relative, `/`-separated, or relative to `root`
 * @param {{ root?: string, exists?: (abs: string) => boolean, extensions?: string[] }} [opts] `extensions` for a name
 *   written as an import path (`["", ".ts", ".tsx"]`): the entry holds when any spelling is on disk
 * @returns {string[]}
 */
export function missingNamedFiles(guard, mapName, paths, { root = process.cwd(), exists = existsSync, extensions = [""] } = {}) {
  return [...paths].filter((p) => !extensions.some((ext) => exists(here(root, p + ext)))).map((p) => missing(guard, mapName, p));
}

/**
 * Every entry whose file is gone, or exists but no longer holds what the entry exempts.
 * `holds` is a RegExp or a predicate over the file's text; `what` names it for the message.
 * @param {string} guard
 * @param {string} mapName
 * @param {Iterable<{ path: string, holds: RegExp | ((text: string) => boolean), what: string }>} entries
 * @param {{ root?: string, read?: (abs: string) => string, exists?: (abs: string) => boolean }} [opts]
 * @returns {string[]}
 */
export function staleNamedEntries(guard, mapName, entries, { root = process.cwd(), read = (f) => readFileSync(f, "utf8"), exists = existsSync } = {}) {
  const out = [];
  for (const { path: p, holds, what } of entries) {
    const abs = here(root, p);
    if (!exists(abs)) {
      out.push(missing(guard, mapName, p));
      continue;
    }
    const text = read(abs);
    const ok = typeof holds === "function" ? holds(text) : new RegExp(holds.source, holds.flags.replace(/[gy]/g, "")).test(text);
    if (!ok) out.push(`${guard}: stale entry ${p} in ${mapName}: the file exists but no longer contains ${what}; delete the entry, or point it at the file that holds it now`);
  }
  return out;
}

/** Throws the messages of `missingNamedFiles`, joined, when there are any. */
export function assertNamedFiles(guard, mapName, paths, opts) {
  const found = missingNamedFiles(guard, mapName, paths, opts);
  if (found.length) throw new Error(found.join("\n"));
}

/** Throws the messages of `staleNamedEntries`, joined, when there are any. */
export function assertNamedEntries(guard, mapName, entries, opts) {
  const found = staleNamedEntries(guard, mapName, entries, opts);
  if (found.length) throw new Error(found.join("\n"));
}
