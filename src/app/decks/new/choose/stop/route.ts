import { requireUserId } from "../../../../../lib/auth";
import { helpMeChooseEnabled } from "../../../../../lib/intake/flag";
import { cancelRead } from "../../../../../lib/intake/run-store";
import { isUuid } from "../../../../../lib/uuid";

/**
 * *Stop* for the deeper look (plan, PR 6). A route handler, not a Server Action: the client
 * dispatches a page's Server Actions one at a time, so a Stop sent as one would wait behind the
 * very submit it means to stop, and arrive after the read had settled and been charged.
 *
 * It names the read by the id the panel chose for its press, so it can reach the database before
 * that press's start has: `cancelRead` then leaves the Stop for the start to find (never charged).
 * A route handler gets none of a Server Action's origin check, so it carries its own: the request
 * must come from this app's own pages (its `Origin` host is this request's host, and a browser's
 * `Sec-Fetch-Site`, when sent, says same-origin), and be JSON, which a cross-site form cannot send.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  let from: string;
  try {
    from = new URL(origin).host;
  } catch {
    return false;
  }
  const site = request.headers.get("sec-fetch-site");
  return from === host && (site === null || site === "same-origin");
}

export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response(null, { status: 401 });
  }
  if (!helpMeChooseEnabled()) return new Response(null, { status: 404 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return new Response(null, { status: 415 });
  const body: unknown = await request.json().catch(() => null);
  const readId = typeof body === "object" && body !== null ? (body as { readId?: unknown }).readId : null;
  if (typeof readId !== "string" || !isUuid(readId)) return new Response(null, { status: 400 });
  return Response.json({ stopped: await cancelRead(readId.toLowerCase(), userId) });
}
