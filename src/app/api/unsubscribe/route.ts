import { tokenShaped, unsubscribeByToken } from "../../../lib/flyer/launch-unsubscribe";
import { overAnonymousLimit } from "../../../lib/rate/anon";

/**
 * The launch email's one-click unsubscribe (RFC 8058, launch email R2c G1): the mail client POSTs
 * `List-Unsubscribe=One-Click` to the `List-Unsubscribe` URL, which carries the same `t` as the footer link. It draws
 * nothing. The answer is the same 200 whether or not the address was on the list; a malformed token is a 400, refused before
 * anything is counted or read. Public in `src/proxy.ts`. Counted per visitor at a high limit (`launch-one-click`): a provider
 * sends many recipients' one-click requests from a few addresses.
 */
export async function POST(req: Request): Promise<Response> {
  const t = new URL(req.url).searchParams.get("t");
  if (!tokenShaped(t)) return new Response(null, { status: 400 });
  if (await overAnonymousLimit(req.headers, "launch-one-click")) return new Response(null, { status: 429 });
  await unsubscribeByToken(t);
  return new Response(null, { status: 200 });
}
