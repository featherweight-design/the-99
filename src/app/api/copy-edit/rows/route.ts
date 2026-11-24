import { copyEditorUser } from "../../../../lib/copy-editor/gate";
import { readEditorRows } from "../../../../lib/copy-editor/rows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** The copy editor's rows (key, kind, today's text, fill-ins, context). Admin on staging only; anyone else gets a bare 404. */
export async function GET() {
  if (!(await copyEditorUser())) return new Response(null, { status: 404 });
  const rows = await readEditorRows();
  if (!rows) return Response.json({ error: "rows-not-built" }, { status: 503, headers: NO_STORE });
  return Response.json({ rows }, { headers: NO_STORE });
}
