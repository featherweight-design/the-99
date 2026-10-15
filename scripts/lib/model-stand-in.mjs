// THE SPEND GUARD, failing closed: a probe that presses anything model-backed (Analyze when it also
// writes the overview, Suggested changes, Look deeper, Help me choose, a fits read) calls
// `assertModelStandIn` first, and refuses to press unless the server it targets PROVES every path it
// will press is free (orchestrator's ruling, 2026-10-15, after a probe pointed at `next start` made
// real overview calls).
//
// Two signals, both read from the server, never from the probe's own environment:
//  1. The server is `next dev`: Next serves its dev pages manifest only from the dev bundler
//     (`setup-dev-bundler.js`); `next start` answers 404. Measured on both, 2026-10-15.
//  2. Each path the probe presses is a stand-in, as the server itself reports at
//     `/api/dev/model-stand-in` (dev only; a production build answers 404). A dev build is not
//     enough on its own: Suggested changes and Look deeper call the real model in development unless
//     the server has `TUNING_STUB_DELAY_MS`, and every other path has a `*_LIVE` opt-in. A path
//     reported live passes only when the server holds no real key (`absent` or `dummy`) and no
//     `ANTHROPIC_BASE_URL` that might not need one.
// Anything else, a redirect to sign-in included, refuses.

export const DEV_MANIFEST = "/_next/static/development/_devPagesManifest.json";
export const STAND_IN_ROUTE = "/api/dev/model-stand-in";
export const MODEL_PATHS = ["synopsis", "intake", "fits", "tuning"];

const parse = (text) => {
  try { return JSON.parse(text); } catch { return null; }
};

/**
 * The decision, pure: `manifest` and `report` are the two responses as `{ status, text }`, `paths`
 * the model paths the probe will press. Returns `{ ok: true }` or `{ ok: false, reason }`.
 */
export function standInDecision({ manifest, report }, paths) {
  const unknown = paths.filter((p) => !MODEL_PATHS.includes(p));
  if (unknown.length > 0) return { ok: false, reason: `unknown model path(s): ${unknown.join(", ")}` };
  const pages = manifest?.status === 200 ? parse(manifest.text)?.pages : undefined;
  if (!Array.isArray(pages)) {
    return { ok: false, reason: `not a \`next dev\` server: ${DEV_MANIFEST} answered ${manifest?.status ?? "nothing"}` };
  }
  const modes = report?.status === 200 ? parse(report.text) : null;
  if (!modes || typeof modes !== "object") {
    return { ok: false, reason: `the server does not report its model stand-ins: ${STAND_IN_ROUTE} answered ${report?.status ?? "nothing"}` };
  }
  const keyless = (modes.key === "absent" || modes.key === "dummy") && modes.baseUrl === false;
  const live = paths.filter((p) => modes[p] !== "stand-in" && !keyless);
  if (live.length > 0) {
    return {
      ok: false,
      reason: `the server would make real model calls for ${live.join(", ")} (key: ${modes.key}${modes.baseUrl ? ", base URL set" : ""}). `
        + "Start it with the path's stand-in (TUNING_STUB_DELAY_MS for tuning; no *_LIVE) or a dummy ANTHROPIC_API_KEY.",
    };
  }
  return { ok: true };
}

/** A `get` over a Playwright page's request context, so the report is read as the signed-in reader. */
export function pageGet(page) {
  return async (url) => {
    const res = await page.request.get(url, { maxRedirects: 0 });
    return { status: res.status(), text: await res.text() };
  };
}

/** Throws, naming why, unless every path in `paths` is free on the server at `base`. */
export async function assertModelStandIn(base, paths, { get }) {
  const read = async (path) => {
    try { return await get(new URL(path, base).toString()); } catch { return null; }
  };
  const decision = standInDecision({ manifest: await read(DEV_MANIFEST), report: await read(STAND_IN_ROUTE) }, paths);
  if (!decision.ok) throw new Error(`spend guard: refusing to press anything. ${decision.reason}`);
  console.log(`spend guard: ${paths.join(", ")} cannot spend on ${base}`);
  return decision;
}
