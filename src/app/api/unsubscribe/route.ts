import { unsubscribeByToken } from "../../../lib/flyer/launch-unsubscribe";
import { overAnonymousLimit } from "../../../lib/rate/anon";

/**
 * The launch email's one-click unsubscribe (RFC 8058, launch email R2c G1): the mail client POSTs
 * `List-Unsubscribe=One-Click` to the `List-Unsubscribe` URL, which carries the same `t` as the footer link. It draws
 * nothing. The answer is the same 200 whether or not the address was on the list, and a malformed token is a 400 that
 * says nothing about any address. Public in `src/proxy.ts`; counted against the visitor's `launch-unsubscribe` allowance.
 */
export async function POST(req: Request): Promise<Response> {
  if (await overAnonymousLimit(req.headers, "launch-unsubscribe")) return new Response(null, { status: 429 });
  const t = new URL(req.url).searchParams.get("t");
  const outcome = await unsubscribeByToken(t);
  return new Response(null, { status: outcome === "done" ? 200 : 400 });
}
