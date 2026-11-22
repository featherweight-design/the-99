// probe:deck-loading-art: the deck page's loading skeleton draws the commander's art exactly where the loaded header draws it,
// so the art does not jump when the page arrives. Per width (390 and 1300) and per deck (a lone commander, a partner pair), it
// presses the deck's tile on /decks with the deck page's RSC request held, reads the art layer in the skeleton (its rect inside
// the band, background-size, background-position, the mask), releases the request, reads the same layer in the loaded header and
// asserts the two are equal. On main the skeleton always draws the 340px portrait while a 1300px window's header draws 560px, so
// the 1300 checks fail there.
//
// Its writes: two decks of its own (`probe:deck-loading-art`, no cards) on the signed-in account, deleted in `finally`.
// Production and staging are refused by `neon.branch_id`. DATABASE_URL must be the database the dev server reads.
//   E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_BASE=http://localhost:3291 node scripts/probe-deck-loading-art.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const sql = neon(DATABASE_URL);
const NAME = "probe:deck-loading-art";
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const HOLD_MS = 12_000;
const SHOTS = process.env.PROBE_SHOTS; // a folder: one PNG per width, deck kind and state, for the contact sheet
const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 820 } },
];

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

/** Two decks of the probe's own: a lone commander with art, and a Partner pair, both with art. */
async function makeDecks(userId) {
  const partners = await sql`select oracle_id from cards where commander_legal and art_crop_uri is not null
    and oracle_text ~ '(^|\n)Partner( \\(|$)' and type_line ilike 'Legendary Creature%' order by name limit 2`;
  if (partners.length < 2) throw new Error("The catalog holds no two Partner commanders with art.");
  const [single] = await sql`select oracle_id from cards where commander_legal and art_crop_uri is not null
    and type_line ilike 'Legendary Creature%' and oracle_id <> ${partners[0].oracle_id} order by name limit 1`;
  const [one] = await sql`insert into decks (user_id, name, commander_oracle_id) values (${userId}, ${NAME}, ${single.oracle_id}) returning id`;
  const [two] = await sql`insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${userId}, ${NAME}, ${partners[0].oracle_id}, ${partners[1].oracle_id}) returning id`;
  return [{ kind: "single", id: one.id }, { kind: "partner", id: two.id }];
}

/** The art layer of the band that is drawn (not the hidden twin) inside `scope`, as values that do not depend on the page above it. */
const READ_ART = (scope) => {
  const root = document.querySelector(scope);
  if (!root) return { missing: `no ${scope}` };
  const drawn = [...root.querySelectorAll("[data-art-wash-band]")].find((b) => b.getClientRects().length > 0 && b.getBoundingClientRect().width > 0);
  if (!drawn) return { missing: "no drawn band" };
  const art = drawn.querySelector(".art-wash-art");
  const band = drawn.getBoundingClientRect();
  const a = art.getBoundingClientRect();
  const cs = getComputedStyle(art);
  const round = (n) => Math.round(n * 10) / 10;
  return {
    band: { w: round(band.width), h: round(band.height) },
    art: { x: round(a.left - band.left), y: round(a.top - band.top), w: round(a.width), h: round(a.height) },
    size: cs.backgroundSize,
    position: cs.backgroundPosition,
    mask: cs.maskImage || cs.webkitMaskImage || "",
    image: cs.backgroundImage.includes("url(") ? "url" : cs.backgroundImage.slice(0, 40),
  };
};

async function walk(browser, width, deck) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label} ${deck.kind}: ${s}`;
  try {
    await signIn(page);
    // Warm the deck route (a dev server compiles it on first visit), then go to the list.
    await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.locator("[data-art-wash-band]").first().waitFor({ state: "attached", timeout: 90_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    // A dev server's first visit can abort the navigation it is still compiling; one retry reads the compiled route.
    for (let attempt = 0; attempt < 3; attempt++) {
      const ok = await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded", timeout: 180_000 }).then(() => true, () => false);
      if (ok) break;
    }
    const link = page.locator(`a[href="/decks/${deck.id}"]`).first();
    await link.waitFor({ timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    // Hold the deck page's own RSC request so the skeleton stays on screen.
    let release;
    const gate = new Promise((r) => (release = r));
    await page.route(new RegExp(`/decks/${deck.id}\\?.*_rsc=`), async (route) => {
      await Promise.race([gate, new Promise((r) => setTimeout(r, HOLD_MS))]);
      await route.continue().catch(() => {});
    });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    const shown = await page.locator("[data-loading-screen]").first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
    if (!report(L("the loading skeleton draws"), shown)) return;
    await page.waitForTimeout(600);
    const loading = await page.evaluate(READ_ART, "[data-loading-screen]");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width.label}-${deck.kind}-loading.png` });
    report(L("the skeleton draws the commander's art"), loading.image === "url", JSON.stringify(loading));
    release();
    await page.locator("[data-loading-screen]").first().waitFor({ state: "detached", timeout: 90_000 });
    await page.waitForTimeout(600);
    const loaded = await page.evaluate(READ_ART, "main");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width.label}-${deck.kind}-loaded.png` });
    report(L("the loaded header draws the commander's art"), loaded.image === "url", JSON.stringify(loaded));
    for (const key of ["band", "art", "size", "position", "mask"]) {
      const same = JSON.stringify(loading[key]) === JSON.stringify(loaded[key]);
      report(L(`skeleton and loaded header agree on the art's ${key}`), same, same ? "" : `skeleton ${JSON.stringify(loading[key])} vs loaded ${JSON.stringify(loaded[key])}`);
    }
  } finally {
    await context.close();
  }
}

await clerkSetup();
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
await assertNotSharedBranch(branch, "probe-deck-loading-art");
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const userId = await signIn(page);
  await context.close();
  const decks = await makeDecks(userId);
  for (const width of WIDTHS) for (const deck of decks) await walk(browser, width, deck);
} finally {
  await sql`delete from decks where name = ${NAME}`;
  await browser.close();
}
console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
