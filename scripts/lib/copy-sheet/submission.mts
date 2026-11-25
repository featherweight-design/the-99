// The copy editor's submission: the edits an admin sends, checked for shape and size. No imports, so the submit route
// (bundled by Next) and the workflow's script (run by tsx) share one parser; the wording rules are `problems()`'s, run
// by whoever holds the rows.

/** At most this many edited rows in one submission. */
export const MAX_EDITS = 40;
/** The longest `key`, `from` or `to` accepted (the longest copy leaf is far under it). */
export const MAX_TEXT = 600;
/** The serialized edits, in characters. A workflow_dispatch's inputs may hold 65,535 in all; this leaves room for the branch. */
export const MAX_EDITS_CHARS = 60_000;
/** What the route names the branch and the workflow checks it against: UTC date and time, to the second. */
export const EDIT_BRANCH_RE = /^copy-edit-\d{8}-\d{6}$/;
const KEY_RE = /^src\/lib\/copy\/[A-Za-z0-9._-]+\.ts#[A-Za-z0-9._\[\]#-]+$/;

export type SubmittedEdit = { key: string; from: string; to: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** `copy-edit-20261124-183512`, in UTC. */
export function editBranch(now: Date): string {
  const d = now;
  return `copy-edit-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

/** The edits of a submission body `{ edits: [{ key, from, to }] }`, only those three fields of each, or the first thing wrong with it. */
export function parseSubmission(raw: unknown): { edits: SubmittedEdit[] } | { error: string } {
  const list = raw && typeof raw === "object" ? (raw as { edits?: unknown }).edits : undefined;
  if (!Array.isArray(list)) return { error: "edits must be a list" };
  if (list.length === 0) return { error: "nothing to submit" };
  if (list.length > MAX_EDITS) return { error: `at most ${MAX_EDITS} edits at a time` };
  const edits: SubmittedEdit[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const e = item as Partial<Record<keyof SubmittedEdit, unknown>> | null;
    if (!e || typeof e !== "object" || typeof e.key !== "string" || typeof e.from !== "string" || typeof e.to !== "string") return { error: "each edit needs a key, from and to, all text" };
    if (e.key.length > MAX_TEXT || !KEY_RE.test(e.key)) return { error: "a key is not a copy key" };
    if (e.from.length > MAX_TEXT || e.to.length > MAX_TEXT) return { error: `a text is over ${MAX_TEXT} characters` };
    if (e.to === "" || e.to === e.from) return { error: "an edit must change the text" };
    if (seen.has(e.key)) return { error: "a key appears twice" };
    seen.add(e.key);
    edits.push({ key: e.key, from: e.from, to: e.to });
  }
  if (JSON.stringify(edits).length > MAX_EDITS_CHARS) return { error: "the edits are too long to send at once" };
  return { edits };
}
