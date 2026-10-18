// The public card page over HTTP, signed OUT (launch epic F3 PR 2b). Read-only: plain requests with no cookie, no browser.
//
//   PROBE_BASE=http://localhost:3110 pnpm probe:public-pages
//   PROBE_CARDS=348c67ef9ccc,6ad8011d3471 PROBE_BASE=... pnpm probe:public-pages
//
// For each card id (12 hex, `PROBE_CARDS`, default the four boards' cards: A1 Rootha, A2 Valki, A3 Ghalta, A4 Sol Ring) it
// proves: the bare id 308s to a canonical `/card/<name>-<id>`; a wrong name part 308s to the same address; the canonical
// address answers 200 with the page's marker and the link-preview tags (og:title, og:image, twitter:card
// summary_large_image); the og image answers 200 image/png. An unknown id answers 404 with the public not-found (the 404
// copy, never a drawn `View decks`). No response may carry `Set-Cookie`: the pages are the same for every visitor.
//
// Serve with `PUBLIC_PAGES_ENABLED=true`. Probes never touch production: a production host is refused.
const BASE = (process.env.PROBE_BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const DEFAULT_CARDS = ["348c67ef9ccc", "907ae51722d5", "b0b6be0c41cf", "6ad8011d3471"];
const CARDS = (process.env.PROBE_CARDS ?? DEFAULT_CARDS.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const UNKNOWN = process.env.PROBE_UNKNOWN ?? "000000000000";

if (/^(?:www\.)?the-99\.dev$/i.test(new URL(BASE).hostname)) {
  console.error(`refused: ${BASE} is production. Probes never touch production.`);
  process.exit(2);
}
for (const id of [...CARDS, UNKNOWN]) {
  if (!/^[0-9a-f]{12}$/.test(id)) {
    console.error(`refused: ${id} is not a 12-hex card id`);
    process.exit(2);
  }
}

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

/** Whether a response is Clerk's DEVELOPMENT-instance handshake (a document request carrying no dev-browser token). */
const isDevHandshake = (res) => res.status === 307 && /\/v1\/client\/handshake/.test(res.headers.get("location") ?? "");
let handshakeNoted = false;

/**
 * GET as a link unfurler does (`Accept: text/html`, no cookie). Against Clerk's DEVELOPMENT instance (localhost, a preview)
 * the middleware answers any such document request with its dev-browser handshake, which a production instance never does
 * for a visitor with no cookie; there the request is repeated as a non-document request, which reaches the same page.
 */
async function get(path) {
  let res = await fetch(`${BASE}${path}`, { redirect: "manual", headers: { accept: "text/html,image/png,*/*" } });
  if (isDevHandshake(res)) {
    if (!handshakeNoted) console.log("NOTE  Clerk development instance: document requests are handshaked, so each is repeated with Accept: */*");
    handshakeNoted = true;
    res = await fetch(`${BASE}${path}`, { redirect: "manual", headers: { accept: "*/*" } });
  }
  check(`${path}: no Set-Cookie`, !res.headers.has("set-cookie"), res.headers.get("set-cookie")?.split("=")[0] ?? "");
  return res;
}

/** A `<meta>` tag's content by its `property` or `name`, or null. */
function meta(html, key) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)="${key.replace(/[:.]/g, "\\$&")}"[^>]*>`));
  return tag ? (tag[0].match(/content="([^"]*)"/)?.[1] ?? "").replace(/&amp;/g, "&") : null;
}

/** The path of a redirect's target, from an absolute or a relative Location. */
const locationPath = (res) => {
  const loc = res.headers.get("location");
  return loc ? new URL(loc, BASE).pathname : null;
};

for (const id of CARDS) {
  const bare = await get(`/card/${id}`);
  const canonical = locationPath(bare);
  const shaped = canonical !== null && new RegExp(`^/card/(?:[a-z0-9-]+-)?${id}$`).test(canonical);
  check(`/card/${id}: 308 to its canonical address`, bare.status === 308 && shaped, `${bare.status} -> ${canonical}`);
  if (!shaped) continue;

  const wrong = await get(`/card/not-its-name-${id}`);
  check(`/card/not-its-name-${id}: 308 to ${canonical}`, wrong.status === 308 && locationPath(wrong) === canonical, `${wrong.status} -> ${locationPath(wrong)}`);

  const page = await get(canonical);
  const html = await page.text();
  check(`${canonical}: 200`, page.status === 200, String(page.status));
  check(`${canonical}: draws the card page`, html.includes('data-testid="public-card-page"'));
  const title = meta(html, "og:title");
  check(`${canonical}: og:title`, Boolean(title?.endsWith(" · The 99")), title ?? "absent");
  check(`${canonical}: twitter:card summary_large_image`, meta(html, "twitter:card") === "summary_large_image", meta(html, "twitter:card") ?? "absent");
  check(`${canonical}: og:description`, Boolean(meta(html, "og:description")));
  const ogImage = meta(html, "og:image");
  check(`${canonical}: og:image`, Boolean(ogImage), ogImage ?? "absent");
  if (ogImage) {
    // The tag is absolute on the deployment's own origin; fetch its path from the server under test.
    const u = new URL(ogImage);
    const img = await get(`${u.pathname}${u.search}`);
    const bytes = new Uint8Array(await img.arrayBuffer());
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    check(`${u.pathname}: 200 image/png`, img.status === 200 && img.headers.get("content-type") === "image/png" && png, `${img.status} ${img.headers.get("content-type")} ${bytes.length} bytes`);
  }
}

const missing = await get(`/card/${UNKNOWN}`);
const missingHtml = await missing.text();
check(`/card/${UNKNOWN}: 404`, missing.status === 404, String(missing.status));
// A 404 thrown by the page is drawn by the browser: Next answers it with an error shell whose markup is empty and whose
// payload carries the page's own boundary (`not-found.tsx` in the segment), which the client renders. So the payload is
// read for the public not-found, and the MARKUP (scripts removed) for `View decks`: the root layout's own not-found rides
// in every page's payload, unrendered, and naming it there proves nothing. The browser half is the contact sheet's C3 row.
const markup = missingHtml.replace(/<script\b[\s\S]*?<\/script>/gi, "");
// The segment's not-found rides in the payload of the card page too, so it is the 404 and the ABSENT page that make it this.
check(`/card/${UNKNOWN}: the public not-found, and no card page`, missingHtml.includes("public-not-found") && missingHtml.includes("no page here") && !missingHtml.includes("public-card-page"));
check(`/card/${UNKNOWN}: no View decks drawn`, !markup.includes("View decks"));
const missingImage = await get(`/card/${UNKNOWN}/opengraph-image`);
check(`/card/${UNKNOWN}/opengraph-image: 404`, missingImage.status === 404, String(missingImage.status));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed against ${BASE} (${CARDS.length} cards).`);
if (failed.length > 0) {
  console.log(`FAILED:\n${failed.map((f) => `  ${f.name}`).join("\n")}`);
  process.exit(1);
}
