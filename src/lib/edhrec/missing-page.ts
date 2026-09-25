/**
 * Whether EDHREC has no page at all for a slug — a fact about the commander, not the service.
 *
 * THE JSON API CANNOT SAY. A slug with no page answers `403` from `json.edhrec.com`, carrying
 * the S3 bucket's own `AccessDenied` body, because the bucket refuses to list what it does not
 * hold. A rate limit is also a `403`. Read on its own the status tells a missing page from a
 * throttled run in neither direction, so the index used to call every one of them an outage and
 * retry it forever (#712): seven commanders with no page failed every resumed run.
 *
 * The HTML page can. `edhrec.com/commanders/<slug>` answers a clean `404` for a page that does not
 * exist and `200` (or a redirect, for a pair in the other order) for one that does. Measured
 * 2026-09-24: `the-eternity-elevator` and `brisela-voice-of-nightmares` read JSON 403 and HTML
 * 404; `atraxa-praetors-voice` and `ratonhnhaketon` read 200 on both.
 *
 * ONLY A 404 COUNTS. Anything else — a throttle, a 5xx, a timeout, a thrown fetch — answers
 * `false`, which leaves the caller on its unreachable path. Getting this wrong in that direction
 * costs one retry; getting it wrong in the other writes an absent row over a commander EDHREC
 * does index, which is the loss the unreachable path exists to prevent.
 */
export type PageProbe = (url: string) => Promise<{ status: number }>;

const headProbe: PageProbe = (url) =>
  fetch(url, {
    method: "HEAD",
    // A pair in the other order redirects; a redirect is a page that exists, so it is read
    // as its own status rather than followed.
    redirect: "manual",
    headers: { "User-Agent": "the-99/1.0" },
    signal: AbortSignal.timeout(10_000),
  });

export async function edhrecPageMissing(slug: string, probe: PageProbe = headProbe): Promise<boolean> {
  try {
    const res = await probe(`https://edhrec.com/commanders/${slug}`);
    return res.status === 404;
  } catch {
    return false;
  }
}
