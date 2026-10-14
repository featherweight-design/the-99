// CARD ART DRAWN AS A CSS BACKGROUND FADES IN (card-art fades plan, PRs 1-3), on deployed staging.
//
// The unit tests prove `ArtLayer` marks itself and the guard (`art-layer-guard.test.ts`) proves no source file
// builds an unfaded CSS url, but neither sees a page. This loads real pages as the audit account and reads every
// element in `main` whose computed background paints Scryfall card art:
//   - each must carry `data-arrival` (it is an `ArtLayer` / `ArrivingArt`), never a host painting art itself;
//   - once the page has settled, none may still be `pending` (art that never shows).
// Pages: the deck page, `/decks`, `/commanders`, the first commander page that list links to, the create picker
// (`/decks/new`), create pre-filled from that commander, and `/decks/precons`, at 1300 and 390. Help me choose's
// best fit needs a model read to draw, so it is covered by its component test (`choose-row.test.tsx`) alone.
// The card details sheet's main faces and the hover preview are left unfaded on purpose and are not opened here.
//
// Read-only on the app's data (it loads pages as any reader's visit does), and deployed-only:
//   MEASURE_DEPLOYED=1 PROBE_BASE=https://staging.the-99.dev [MEASURE_DECK_ID=<uuid>] \
//     [PROBE_COMMANDER_ORACLE_ID=<uuid>] pnpm probe:art-layer
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertDeployedBase, lookupUserId, mintSignInToken } from "./lib/measure-deployed.mjs";

if (process.env.MEASURE_DEPLOYED !== "1") throw new Error("probe:art-layer runs against deployed staging only: set MEASURE_DEPLOYED=1.");
const BASE = process.env.PROBE_BASE ?? "https://staging.the-99.dev";
assertDeployedBase(BASE);
const { THE_99_CLERK_SECRET_KEY_STAGING: SECRET, THE_99_E2E_AUDIT_USER_EMAIL: AUDIT } =
  requireEnv(["THE_99_CLERK_SECRET_KEY_STAGING", "THE_99_E2E_AUDIT_USER_EMAIL"]);
/** The deck to load: `MEASURE_DECK_ID`, else the first deck `/decks` links to. */
const DECK_ID = process.env.MEASURE_DECK_ID ?? null;
/** The commander create opens pre-filled with (an oracle id; nothing on a page carries one). Unset skips that page. */
const COMMANDER = process.env.PROBE_COMMANDER_ORACLE_ID ?? null;

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
  const ticket = await mintSignInToken(SECRET, await lookupUserId(SECRET, AUDIT));
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  await page.evaluate(async (t) => {
    const a = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (a.status !== "complete") throw new Error(`sign-in status ${a.status}`);
    await window.Clerk.setActive({ session: a.createdSessionId });
  }, ticket);
}

/** Every element in the page's content painting card art as a background, with its arrival mark. */
const READ = () => [...document.querySelectorAll("main *")]
  .filter((e) => getComputedStyle(e).backgroundImage.includes("cards.scryfall.io"))
  .map((e) => ({ mark: e.dataset.arrival ?? null, tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 80) }));

let detail = null;
let deck = null;
const browser = await chromium.launch();
try {
  for (const [width, height] of [[1300, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    try {
      await signIn(page);
      // Found once, at the first width, and reused: the phone's lists link differently.
      if (width === 1300) {
        await page.goto(`${BASE}/commanders`, { waitUntil: "load" });
        await page.waitForSelector('main a[href^="/commanders/"]', { timeout: 30_000 }).catch(() => {});
        detail = await page.evaluate(() => document.querySelector('main a[href^="/commanders/"]')?.getAttribute("href") ?? null);
        await page.goto(`${BASE}/decks`, { waitUntil: "load" });
        // The list streams in after the load event; wait for its first deck before reading.
        if (!DECK_ID) await page.waitForSelector('main a[href^="/decks/"]', { timeout: 30_000 }).catch(() => {});
        deck = DECK_ID ? `/decks/${DECK_ID}` : await page.evaluate(() =>
          [...document.querySelectorAll('main a[href^="/decks/"]')].map((a) => a.getAttribute("href"))
            .find((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h ?? "")) ?? null);
      }
      // `/decks/new` (the create picker) and `/decks/precons` draw `CommanderThumb`, and create pre-filled
      // (`?commander=<oracle id>`) draws the converted card face.
      const create = COMMANDER ? `/decks/new?commander=${COMMANDER}` : null;
      if (!create && width === 1300) console.log("  skip  create pre-filled — set PROBE_COMMANDER_ORACLE_ID to load it");
      // Pages expected to paint background art; `/decks/precons` draws its art as <img>s and may read none.
      const routes = [
        [deck, true], ["/decks", true], ["/commanders", true], [detail, true], ["/decks/new", true],
        ...(create ? [[create, true]] : []), ["/decks/precons", false],
      ];
      for (const [path, paints] of routes) {
        if (!path) { report(`${width} page`, false, "no deck or commander link to follow"); continue; }
        await page.goto(`${BASE}${path}`, { waitUntil: "load" });
        // Scroll the page through, so art below the first screen is asked for, then let it settle.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(4000);
        const art = await page.evaluate(READ);
        const unfaded = art.filter((a) => a.mark === null);
        const stuck = art.filter((a) => a.mark === "pending");
        const label = `${width} ${path.startsWith("/commanders/") ? "/commanders/[slug]" : path.replace(/\/decks\/[0-9a-f-]{36}$/, "/decks/[id]").replace(/commander=.*$/, "commander=[slug]")}`;
        // An error page or a loading screen paints no art and would pass the two checks below vacuously.
        if (paints) report(`${label}: draws background art at all`, art.length > 0, `${art.length} painted`);
        report(`${label}: every piece of background art fades`, unfaded.length === 0,
          `${art.length} painted, ${unfaded.length} unfaded${unfaded.length ? `: ${JSON.stringify(unfaded.slice(0, 3))}` : ""}`);
        report(`${label}: none left pending`, stuck.length === 0, `${stuck.length} pending after settling`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
