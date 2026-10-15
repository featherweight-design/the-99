// Server actions, by NAME. Next sends a server action as a POST whose `next-action` header is a hashed id,
// and the dev server's own manifest maps each id to its file and export, so a probe can say which action a
// request is rather than counting opaque ids. Read from THIS worktree's `next dev` build: PROBE_BASE must be
// a `next dev` server started here. An id the manifest does not hold is named `unknown:<id>`, which matches
// no expected name and so fails whatever check it lands in.
import { readFileSync } from "node:fs";

export const ACTION_MANIFEST = new URL("../../.next/dev/server/server-reference-manifest.json", import.meta.url);

/** The export a `next-action` id names, read fresh (the dev server adds ids as it compiles). */
export function actionName(id, manifest = ACTION_MANIFEST) {
  try {
    const entry = JSON.parse(readFileSync(manifest, "utf8")).node?.[id];
    if (entry?.exportedName) return entry.exportedName;
  } catch {
    // No manifest: the server is not this worktree's `next dev`.
  }
  return `unknown:${String(id).slice(0, 10)}`;
}

/** The calls in `ids`, as a sorted `name×n` list, for comparing against what ships. */
export function tally(ids, name = actionName) {
  const n = {};
  for (const id of ids) { const k = name(id); n[k] = (n[k] ?? 0) + 1; }
  return Object.entries(n).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}×${v}`).join(", ") || "none";
}
