import type { NextRequest } from "next/server";
import { check } from "../../../../lib/copy-editor/edits";
import { copyEditorUser } from "../../../../lib/copy-editor/gate";
import { dispatchCopyEdit } from "../../../../lib/copy-editor/github";
import { readEditorRows } from "../../../../lib/copy-editor/rows";
import { readCapped } from "../../../../lib/http/read-capped";
import { enforceHit } from "../../../../lib/rate/observe";
import { tooManyRequests } from "../../../../lib/rate/refuse";
import { editBranch, MAX_EDITS_CHARS, parseSubmission } from "../../../../../scripts/lib/copy-sheet/submission.mts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const refuse = (status: number, body: unknown) => Response.json(body, { status, headers: NO_STORE });

/**
 * Submits the admin's edits: validates them against the generated rows with the copy sheet's own `problems()`, then starts
 * the `Copy edit` workflow, which creates the branch and the pull request (`pnpm copy:import`, run again there). This route holds a token that can
 * only start a workflow; it creates no branch and writes no content. Admin on staging only (a bare 404 otherwise), one
 * dispatch per admin a minute, JSON only (a cross-site form cannot send it without a preflight).
 */
export async function POST(req: NextRequest) {
  const userId = await copyEditorUser();
  if (!userId) return new Response(null, { status: 404 });
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return refuse(415, { error: "json-only" });
  const text = await readCapped(req, MAX_EDITS_CHARS + 2_000);
  if (text === null) return refuse(413, { error: "too-large" });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return refuse(400, { error: "bad-json" });
  }
  const parsed = parseSubmission(raw);
  if ("error" in parsed) return refuse(400, { error: "bad-edits", message: parsed.error });
  const rows = await readEditorRows();
  if (!rows) return refuse(503, { error: "rows-not-built" });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const refused: { key: string; reason: string }[] = [];
  for (const e of parsed.edits) {
    const row = byKey.get(e.key);
    if (!row) refused.push({ key: e.key, reason: "unknown-key" });
    else if (row.readOnly) refused.push({ key: e.key, reason: "read-only" });
    else if (row.text !== e.from) refused.push({ key: e.key, reason: "stale" });
    else if (check(row, e.to).problems.length) refused.push({ key: e.key, reason: "rule" });
  }
  if (refused.length) return refuse(422, { error: "rejected", rows: refused });
  const token = process.env.COPY_EDIT_DISPATCH_TOKEN;
  if (!token) return refuse(503, { error: "not-configured" });
  const wait = await enforceHit(userId, "copy-edit-submit");
  if (wait !== null) return tooManyRequests(wait, NO_STORE);
  const branch = editBranch(new Date());
  if (!(await dispatchCopyEdit(token, branch, parsed.edits))) return refuse(502, { error: "dispatch-failed" });
  return refuse(202, { branch });
}
