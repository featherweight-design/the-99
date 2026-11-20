import { unsubscribeByToken } from "../../../lib/flyer/launch-unsubscribe";
import { overAnonymousCeiling } from "../../../lib/rate/anon";

/**
 * The launch email's one-click unsubscribe (RFC 8058, launch email R2c G1): the mail client POSTs
 * `List-Unsubscribe=One-Click` to the `List-Unsubscribe` URL, which carries the same `t` as the footer link. It draws
 * nothing. The answer is the same 200 whether or not the address was on the list, and a malformed token is a 400 that
 * says nothing about any address. Public in `src/proxy.ts`. Bounded across every visitor (`launch-unsubscribe-all`), not
 * per visitor: a provider sends many recipients' one-click requests from a few addresses.
 */
export async function POST(req: Request): Promise<Response> {
  if (await overAnonymousCeiling("launch-unsubscribe-all")) return new Response(null, { status: 429 });
  const t = new URL(req.url).searchParams.get("t");
  const outcome = await unsubscribeByToken(t);
  return new Response(null, { status: outcome === "done" ? 200 : 400 });
}
