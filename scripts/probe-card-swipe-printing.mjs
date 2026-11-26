// Card swipe on phone (Wishlist): the neighbors a swipe brings in must draw the printing the list chose for them, not the
// card's default art. Needs the wishlist fixture (scripts/seed-wishlist-printing-fixture.mts) and WL_FIXTURE_FILE.
//
//   PROBE_BASE=http://localhost:3432 WL_FIXTURE_FILE=<file> node scripts/probe-card-swipe-printing.mjs
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const lines = JSON.parse(readFileSync(process.env.WL_FIXTURE_FILE, "utf8"));
const idOf = (src) => (src?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) ?? [])[0] ?? null;
const faceSrc = (loc) => loc.evaluate((el) => el.querySelector("img")?.currentSrc || el.querySelector("img")?.src || getComputedStyle(el.firstElementChild ?? el).backgroundImage);
await clerkSetup();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await signIn(page);
  const byName = (n) => lines.find((l) => l.name === n);
  const nameOf = (l) => l.name;
  async function checkPeeks(label, want, pg = page) {
    const next = pg.getByTestId("phone-peek-next");
    const prev = pg.getByTestId("phone-peek-prev");
    await next.waitFor({ timeout: 10_000 });
    await pg.waitForTimeout(Number(process.env.PROBE_SETTLE ?? 4000)); // the read-ahead lands
    const nextSrc = await faceSrc(next);
    const prevSrc = await faceSrc(prev);
    console.log("DBG", label, JSON.stringify({ nextSrc, prevSrc }));
    check(`${label}: the next peek draws the printing the wishlist chose`, idOf(nextSrc) === want.next, String(idOf(nextSrc)));
    check(`${label}: the previous peek draws the printing the wishlist chose`, idOf(prevSrc) === want.prev, String(idOf(prevSrc)));
  }
  // The three fixture cards are alphabetical on both surfaces: Blorpityblorpboop, Laquatus, Oak.
  const [blorp, laq, oak] = ["Ambassador Blorpityblorpboop", "Ambassador Laquatus", "Ambassador Oak"].map(byName);
  const want = { prev: blorp.printingId, next: oak.printingId };
  // Surface 1: the Wishlist tiles.
  await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "networkidle" });
  const tiles = page.getByTestId("wishlist-tile");
  await tiles.first().waitFor({ timeout: 20_000 });
  const labels = await tiles.evaluateAll((els) => els.map((e) => e.querySelector("button")?.getAttribute("aria-label") ?? ""));
  const at = labels.findIndex((l) => l.includes(laq.name));
  if (at < 1 || at > labels.length - 2) throw new Error(`wishlist tiles not the fixture: ${JSON.stringify(labels)}`);
  // Wishlist tiles read newest first, so the neighbors are whichever the grid holds either side of Laquatus.
  const wl = { prev: lines.find((l) => labels[at - 1].includes(l.name)).printingId, next: lines.find((l) => labels[at + 1].includes(l.name)).printingId };
  await tiles.nth(at).locator("button").first().tap();
  await checkPeeks("Wishlist", wl);
  // Surface 2: the search layer's answers (a second provider, also `browsePrintings`), on a fresh page.
  const page2 = await context.newPage();
  await page2.goto(`${BASE}/collection/wishlist`, { waitUntil: "networkidle" });
  await page2.getByRole("button", { name: /search/i }).first().tap();
  const dlg = page2.getByRole("dialog", { name: "Search all cards" });
  await dlg.waitFor({ timeout: 8_000 });
  await dlg.getByRole("combobox").fill("Ambassador");
  const opt = dlg.getByRole("option", { name: /^Ambassador Laquatus/ });
  await opt.waitFor({ timeout: 15_000 });
  const optNames = await dlg.getByRole("option").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  const si = optNames.findIndex((l) => l.startsWith(laq.name));
  const sr = { prev: lines.find((l) => optNames[si - 1]?.startsWith(l.name))?.printingId ?? null, next: lines.find((l) => optNames[si + 1]?.startsWith(l.name))?.printingId ?? null };
  await opt.tap();
  await checkPeeks("Search", sr, page2);
  await context.close();
} finally {
  await browser.close();
}
if (failed) {
  console.log(`\n${failed} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");
