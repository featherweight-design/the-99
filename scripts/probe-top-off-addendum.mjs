// The R1 addendum's own rulings, driven in a real browser at both widths.
// `probe-top-off-list.mjs` covers the list #360 shipped; this covers only what
// the addendum added on top of it, and the keep-all confirm that shipped beside
// it in the group toolbar.
//
// Walked here:
//   1  the decline's visible face, a word rather than a glyph
//   2  the bulk restore's singular form, at exactly one decline
//   3  its plural form, at two
//   4  the zero-ticked line's third branch, when every candidate is declined
//   5  the tick box's focus ring, which the base `:focus-visible` cannot draw
//      because the checkbox it would draw on is `sr-only`
//   6  the keep-all confirm: the question, focus landing on `Keep them`, and a
//      cancel putting focus back on the trigger it replaced
//
// Not walked: the confirm forgetting an unanswered question when the count
// reaches 0. That needs a row's own keep to take the last auto card while the
// question is up, which no sequence of clicks on one page can stage; it is
// covered by `clear-auto.test.tsx`.
//
// Run by hand: `PROBE_BASE=http://localhost:3021 node scripts/probe-top-off-addendum.mjs`.
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK ?? "9ebd7866-d62b-4bc3-b0b5-1aa102707305";
const OUT = "probe-out/top-off-addendum";

const sql = neon(DATABASE_URL);
const shots = [];
let failures = 0;

function check(label, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function shot(page, label) {
  const file = `${OUT}/${label}.png`;
  await page.screenshot({ path: file, fullPage: false });
  shots.push(file);
}

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
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: factor?.emailAddressId,
        });
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

/**
 * The keep-all half of the walk really keeps: it writes `auto = false` across
 * every untouched row, and the addendum's own reason for asking first is that
 * nothing in the app undoes that. The probe restores what it kept so the deck
 * is a fixture again rather than a deck the probe has finished with.
 */
async function autoOracleIds() {
  const rows = await sql`
    select oracle_id from deck_cards where deck_id = ${DECK} and auto = true`;
  return rows.map((r) => r.oracle_id);
}
async function restoreAuto(ids) {
  if (ids.length === 0) return;
  await sql`
    update deck_cards set auto = true
     where deck_id = ${DECK} and oracle_id = any(${ids})`;
  console.log(`[reset] ${ids.length} rows marked auto again`);
}

async function openList(page) {
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  const door = page.getByRole("button", { name: /Choose the cards for the last/ });
  await door.waitFor({ timeout: 20_000 });
  // Read before the click: opening the list replaces the door, and the handle
  // to the panel it controls goes with it.
  // An attribute selector rather than `#id`: React's useId emits `«r0»`, which
  // is not a bare CSS identifier, and Node has no CSS.escape.
  const list = page.locator(`[id="${await door.getAttribute("aria-controls")}"]`);
  await door.click();
  await list.getByRole("checkbox").first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(300);
  return list;
}

async function walkList(page, w) {
  console.log(`\n[${w}] candidate list`);
  const list = await openList(page);
  const declines = list.getByRole("button", { name: /^Set .* aside$/ });
  const rows = await declines.count();

  // Every read of a locator's text is guarded. A probe whose own failure
  // throws reports nothing — no count, no transcript — and the one run that
  // matters is the run where something is missing.
  const face = await declines
    .first()
    .innerText()
    .catch(() => "(absent)");
  check("decline shows a word, not a glyph", face.trim() === "Set aside", face.trim());

  // The ring is a Tailwind `ring-2`, which is a box-shadow. The check is that
  // focusing the sr-only checkbox puts a shadow on the box beside it — the
  // whole point of the peer, since the base rule draws on a clipped 1px box.
  // Tabbed into rather than focused by script: `:focus-visible` on a checkbox
  // is a keyboard-only match, so a programmatic focus proves nothing about the
  // state a keyboard reader is actually in.
  const box = list.locator("input[type=checkbox]").first();
  await box.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(150);
  check("the tab lands on the tick box", await box.evaluate((el) => el === document.activeElement));
  const shadow = await box.evaluate(
    (el) => getComputedStyle(el.nextElementSibling).boxShadow,
  );
  check("focused tick box draws a ring", shadow !== "none" && shadow !== "", shadow);
  await shot(page, `${w}-1-tick-focus`);

  await declines.nth(0).click();
  await page.waitForTimeout(200);
  const one = list.getByRole("button", { name: /^Put the declined candidate back on the list$/ });
  check("one decline reads singular", (await one.count()) === 1, await one.innerText().catch(() => "(absent)"));
  await shot(page, `${w}-2-declined-one`);

  await declines.nth(0).click();
  await page.waitForTimeout(200);
  const two = list.getByRole("button", { name: /^Put all 2 declined candidates back on the list$/ });
  check("two declines read plural", (await two.count()) === 1, await two.innerText().catch(() => "(absent)"));

  await two.click();
  await page.waitForTimeout(200);
  check("bulk restore empties the declined set", (await list.locator("text=not this one").count()) === 0);

  // Every candidate declined — the zero-ticked line's third branch, and the
  // only one of the three that names a way back instead of explaining ticks.
  for (let i = 0; i < rows; i += 1) {
    await declines.nth(0).click();
    await page.waitForTimeout(80);
  }
  const allDeclined = await list.locator("text=/set all .* aside/").count();
  check("all declined names the way back", allDeclined > 0);
  await shot(page, `${w}-3-all-declined`);

  await list
    .getByRole("button", { name: /back on the list$/ })
    .first()
    .click();
  await page.waitForTimeout(300);
  check("every row comes back", (await declines.count()) === rows, `${await declines.count()} of ${rows}`);

  await page.getByRole("button", { name: "Cancel" }).first().click();
  await page.waitForTimeout(300);
}

async function walkConfirm(page, w) {
  console.log(`\n[${w}] keep-all confirm`);
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: /^Keep all \d+ auto cards in this deck$/ });
  await trigger.waitFor({ timeout: 20_000 });
  const sweep = page.getByRole("button", { name: /^Clear all \d+ untouched auto cards$/ });
  check("both bulk controls are up at rest", (await sweep.count()) === 1);
  await shot(page, `${w}-4-toolbar`);

  await trigger.click();
  await page.waitForTimeout(200);
  const yes = page.getByRole("button", { name: "Keep them" });
  check("the question replaces the pair", (await yes.count()) === 1 && (await sweep.count()) === 0);
  check("focus lands on Keep them", await yes.evaluate((el) => el === document.activeElement));

  // Both answers point back at the question, so a reader hears what it is
  // answering rather than a bare `Keep them`.
  const described = await yes.getAttribute("aria-describedby");
  const question = page.locator(`[id="${described}"]`);
  const asked = await question.innerText().catch(() => "(absent)");
  check("the answer points at the question", (await question.count()) === 1, asked.trim());
  await shot(page, `${w}-5-confirm`);

  await page.getByRole("button", { name: "Cancel" }).first().click();
  await page.waitForTimeout(200);
  check("cancel restores the pair", (await sweep.count()) === 1);
  check(
    "cancel puts focus back on the trigger",
    await trigger.evaluate((el) => el === document.activeElement),
  );

  await trigger.click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Keep them" }).click();
  await page.waitForTimeout(2500);
  check("the keep takes both controls away", (await trigger.count()) === 0 && (await sweep.count()) === 0);
  // The kept note is desktop-only: the toolbar has no room for it at 390px,
  // and that stays true after a keep.
  const note = await page.locator("text=/yours now/").count();
  check(w === "phone" ? "kept note stays off the phone toolbar" : "kept note is drawn", w === "phone" ? true : note > 0);
  await shot(page, `${w}-6-kept`);
}

const kept = await autoOracleIds();
console.log(`[fixture] deck ${DECK} · ${kept.length} auto rows`);

const browser = await clerkSetup().then(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  await signIn(page);
  await walkList(page, "desktop");
  await walkConfirm(page, "desktop");
  await restoreAuto(kept);

  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    storageState: await page.context().storageState(),
  });
  await walkList(phone, "phone");
  await walkConfirm(phone, "phone");
} finally {
  await restoreAuto(kept);
  await browser.close();
}

console.log(`\nshots:\n${shots.join("\n")}`);
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} checks failed`);
process.exit(failures === 0 ? 0 : 1);
