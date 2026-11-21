// Presses the life tracker's in-game player sheet (design handoff F05 to F09, F16, F17, C2) at phone and desktop width
// and measures what the boards draw: the header's Cinzel name and "deck · life", the damage card's big Cinzel count,
// the tax tab's "+N" block, the Counters tab's emphasis count, and Concede / End game in the danger colour.
// It only reads and taps: Start and every change live on the device (localStorage), so it writes nothing to the
// database and may run against local-dev. On main the header is "Your sheet", the damage count is an 18px mono
// stepper, the tax figure is 16px and Counters has no count, so the checks fail.
//
//   PROBE_BASE=http://localhost:3166 node scripts/probe-tracker-sheet.mjs
// Optional: SHEET_TABLE (default the fixture's T5, you and Colin), SHOTS=<dir>.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const TABLE = process.env.SHEET_TABLE ?? "7a0e0000-0000-4000-8000-000000000005";
const SHOTS = process.env.SHOTS;
// What the table's one opponent plays: "one" commander with art (the default), "partner" (two commanders, two art
// halves, two steppers), or "noart" (a seat whose commander draws no image).
const EXPECT = process.env.SHEET_EXPECT ?? "one";
const WIDTHS = [
  { label: "phone 390x844", width: 390, height: 844 },
  { label: "desktop 1300x900", width: 1300, height: 900 },
];

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// The audit account is a `+clerk_test` address: Clerk's fixed 424242 code, through `window.Clerk` on the app's origin
// (as `probe-rollup-ui.mjs`, which says why the hosted portal cannot be driven).
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

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
const style = (loc, props) =>
  loc.evaluate((el, ps) => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
  }, props);

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const { label, width, height } of WIDTHS) {
    console.log(`\n## ${label}`);
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle" });
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.waitFor({ timeout: 20_000 }).catch(async () => {
      await shot(page, `${width}-no-start`);
      throw new Error(`no Start button at ${page.url()}: ${((await page.locator("main").innerText().catch(() => "")) || "").slice(0, 200)}`);
    });
    // The fixture account has seat notices from its other tables stacked over the bottom edge; press through the DOM.
    await start.evaluate((el) => el.click());
    await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
    // Seat notices from the fixture account's other tables stack over the lower edge; they are not under test.
    await page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack]").forEach((n) => n.remove()));
    await page.locator('[data-testid="panel-sheet"]').first().evaluate((el) => el.click());
    const sheet = page.getByRole("dialog");
    await sheet.waitFor({ timeout: 10_000 });

    // Header: the name in Cinzel, then deck and life.
    const name = sheet.locator("b").first();
    const nameStyle = await style(name, ["font-family", "font-size"]);
    check("header name is Cinzel", /cinzel/i.test(nameStyle["font-family"]), nameStyle["font-family"].slice(0, 40));
    check("header name reads the player, not 'Your sheet'", ((await name.textContent()) ?? "").trim() === "You", (await name.textContent()) ?? "");
    check("header name is not cut short", await name.evaluate((el) => el.scrollWidth <= el.clientWidth), "ellipsised");
    check("header carries life", /\d+ life/.test((await sheet.locator("i").first().textContent()) ?? ""));
    await shot(page, `${width}-damage`);

    // Damage: a big Cinzel count in a card per opponent.
    const more = sheet.getByRole("button", { name: /^More /i }).first();
    await more.click();
    const count = sheet.locator('[aria-live="polite"]').first();
    const countStyle = await style(count, ["font-family", "font-size"]);
    check("damage count is Cinzel and big", /cinzel/i.test(countStyle["font-family"]) && parseFloat(countStyle["font-size"]) >= 28, `${countStyle["font-size"]}`);
    const btn = await more.boundingBox();
    check("damage stepper is a 44px target", (btn?.width ?? 0) >= 44 && (btn?.height ?? 0) >= 44, `${btn?.width}x${btn?.height}`);
    const steppers = await sheet.locator('[aria-live="polite"]').count();
    const art = await sheet.locator("span[aria-hidden] img").count();
    const rule = await sheet.locator(".border-t.pt-2").count();
    const wantSteppers = EXPECT === "partner" ? 2 : 1;
    const wantArt = EXPECT === "partner" ? 2 : EXPECT === "noart" ? 0 : 1;
    check(`damage card has ${wantSteppers} stepper(s)`, steppers === wantSteppers, `${steppers}`);
    check(`damage card draws ${wantArt} commander image(s)`, art === wantArt, `${art}`);
    check("a partner pair is split by a rule, a single commander is not", rule === (EXPECT === "partner" ? 1 : 0), `${rule}`);

    // The modal sheet covers the whole table, the turn strip included: the stepper centre must hit a sheet control.
    const covered = await page.evaluate(() => {
      const b = document.querySelector('[role="dialog"] button[aria-label^="More "]');
      if (!b) return "no stepper";
      const r = b.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top && b.contains(top) ? "" : "covered";
    });
    check("sheet sits above the turn strip", covered === "", covered);
    // Counters: emphasis count after setting one.
    await sheet.getByRole("tab", { name: /^Counters/ }).click();
    await sheet.getByRole("button", { name: /^More Poison/i }).first().click();
    const tab = sheet.getByRole("tab", { name: /^Counters/ });
    check("Counters tab shows how many counters are set", /1$/.test(((await tab.textContent()) ?? "").trim()), (await tab.textContent()) ?? "");
    await shot(page, `${width}-counters`);

    // Tax: Cinzel figure.
    await sheet.getByRole("tab", { name: /^Tax/ }).click();
    await shot(page, `${width}-tax-before`);
    await sheet.getByRole("button", { name: /^More /i }).first().click();
    const due = sheet.locator("strong").filter({ hasText: /^\+\d+$/ }).first();
    const dueStyle = await style(due, ["font-family", "font-size"]);
    check("tax 'next cast' figure is Cinzel 40px+", /cinzel/i.test(dueStyle["font-family"]) && parseFloat(dueStyle["font-size"]) >= 40, `${dueStyle["font-size"]}`);
    await shot(page, `${width}-tax`);

    // Mana: three columns.
    await sheet.getByRole("tab", { name: /^Mana/ }).click();
    const cols = await sheet.locator('[role="tabpanel"] .grid').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    check("mana grid is three across", cols === 3, `${cols} columns`);
    const spill = await sheet.locator('[role="tabpanel"] .grid').first().evaluate((grid) =>
      [...grid.children].filter((card) => {
        const c = card.getBoundingClientRect();
        return [...card.querySelectorAll("button")].some((b) => { const r = b.getBoundingClientRect(); return r.left < c.left - 0.5 || r.right > c.right + 0.5; });
      }).length);
    check("mana steppers stay inside their cards", spill === 0, `${spill} cards spill`);
    await shot(page, `${width}-mana`);

    // Table: Concede and End game in the danger colour.
    await sheet.getByRole("tab", { name: /^Table/ }).click();
    const colors = [];
    for (const n of ["Concede", "End game"]) colors.push((await style(sheet.getByRole("button", { name: n, exact: true }), ["color"])).color);
    const body = (await style(sheet, ["color"])).color;
    check("Concede and End game are not the body colour", colors.every((c) => c !== body), colors.join(" | "));
    await shot(page, `${width}-table`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nall checks passed");
process.exit(failed ? 1 : 0);
