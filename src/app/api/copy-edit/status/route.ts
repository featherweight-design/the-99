import type { NextRequest } from "next/server";
import { copyEditorUser } from "../../../../lib/copy-editor/gate";
import { copyEditStatus } from "../../../../lib/copy-editor/github";
import { EDIT_BRANCH_RE } from "../../../../../scripts/lib/copy-sheet/submission.mts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Where a submitted branch stands (pull request, running, failed): `?branch=copy-edit-...`. Admin on staging only (a bare 404 otherwise). */
export async function GET(req: NextRequest) {
  if (!(await copyEditorUser())) return new Response(null, { status: 404 });
  const branch = req.nextUrl.searchParams.get("branch") ?? "";
  if (!EDIT_BRANCH_RE.test(branch)) return Response.json({ error: "bad-branch" }, { status: 400, headers: NO_STORE });
  const token = process.env.COPY_EDIT_DISPATCH_TOKEN;
  if (!token) return Response.json({ error: "not-configured" }, { status: 503, headers: NO_STORE });
  return Response.json(await copyEditStatus(token, branch), { headers: NO_STORE });
}
