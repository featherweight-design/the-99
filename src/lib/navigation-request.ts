/**
 * Whether a request the proxy sees is a real navigation: a document load or a client transition, never a prefetch and
 * never a write. Pure so the rule can be tested; the proxy supplies the method and headers. Today it decides one thing,
 * when an invite page hands a newcomer's browser its claim secret (`proxy.ts`); it was the About gate's rule until the
 * gate retired (About visual PR 6b).
 *
 * **Prefetches are the exclusion, not client navigations.** Every `<Link>` press in the shell carries `RSC: 1`, and a
 * press is a navigation the reader made. A prefetch is not: a response to one that writes a cookie would write it
 * because the reader's pointer passed over a link.
 */
export function isNavigation(method: string, headers: Headers): boolean {
  if (method !== "GET") return false;
  if (headers.get("Next-Router-Prefetch") === "1") return false;
  if (headers.get("purpose") === "prefetch") return false;
  // An RSC request that is not a prefetch is a real navigation; a document request is the hard-navigation form of it.
  if (headers.get("RSC") === "1") return true;
  return (headers.get("accept") ?? "").includes("text/html");
}
