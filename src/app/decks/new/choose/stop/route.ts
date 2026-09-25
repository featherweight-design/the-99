import { requireUserId } from "../../../../../lib/auth";
import { helpMeChooseEnabled } from "../../../../../lib/intake/flag";
import { cancelRead } from "../../../../../lib/intake/run-store";
import { isUuid } from "../../../../../lib/uuid";

/**
 * *Stop* for the deeper look (plan, PR 6). A route handler, not a Server Action: the client
 * dispatches a page's Server Actions one at a time, so a Stop sent as one would wait behind the
 * very *Look deeper* it means to stop, and arrive after the read had settled and been charged.
 *
 * It names the read by the id the panel chose for its press, so it can reach the database before
 * that press's start has: `cancelRead` then leaves the Stop for the start to find (never charged).
 * JSON only, so a cross-site form cannot post one.
 */
export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response(null, { status: 401 });
  }
  if (!helpMeChooseEnabled()) return new Response(null, { status: 404 });
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return new Response(null, { status: 415 });
  const body: unknown = await request.json().catch(() => null);
  const readId = typeof body === "object" && body !== null ? (body as { readId?: unknown }).readId : null;
  if (typeof readId !== "string" || !isUuid(readId)) return new Response(null, { status: 400 });
  return Response.json({ stopped: await cancelRead(readId.toLowerCase(), userId) });
}
