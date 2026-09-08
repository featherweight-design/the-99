// Gate 2 (forced-state runtime) for #360's top-off list. Every state the
// handoff names is driven in a real browser at both widths, and the ones that
// need a failure are given one — a route abort on the server action, and a
// throttled commit for the in-flight label.
//
// Run by hand: `PROBE_BASE=http://localhost:3021 node scripts/probe-top-off-list.mjs`.
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
const DECK = process.env.PROBE_DECK;
const OUT = "probe-out/top-off";

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
 * Each walk ends in a real commit, which fills the deck it was walking. Without
 * this the second width opens a deck with no last slots and the strip correctly
 * renders nothing. Undoing every top-off pass puts the fixture back where the
 * walk expects it, and leaves the seed pass alone.
 */
const sql = neon(DATABASE_URL);
async function resetDeck() {
  await sql`
    delete from deck_cards
     where deck_id = ${DECK}
       and oracle_id in (
         select fpc.oracle_id from fill_pass_cards fpc
           join fill_passes fp on fp.id = fpc.pass_id
          where fp.deck_id = ${DECK} and fp.kind = 'top_off')`;
  await sql`delete from fill_passes where deck_id = ${DECK} and kind = 'top_off'`;
  const [{ n }] = await sql`
    select coalesce(sum(quantity), 0) n from deck_cards where deck_id = ${DECK}`;
  console.log(`[reset] deck back to ${n} cards`);
}

const shots = [];
async function shot(page, label) {
  const file = `${OUT}/${label}.png`;
  await page.screenshot({ path: file, fullPage: false });
  shots.push(file);
}

async function openList(page) {
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  const door = page.getByRole("button", { name: /Choose the cards for the last/ });
  await door.waitFor({ timeout: 20_000 });
  return door;
}

async function walk(page, width) {
  const w = width === 390 ? "phone" : "desktop";

  const door = await openList(page);
  await shot(page, `${w}-1-closed`);
  console.log(`[${w}] door + note drawn`);

  // Scoped to the panel the door controls. A page-wide checkbox count also
  // picks up the quick-add dock's "Owned only" toggle, which is checked and
  // stays mounted while the list is open.
  // An attribute selector rather than `#id`: React's useId emits `«r0»`, which
  // is not a bare CSS identifier, and Node has no CSS.escape.
  const listSel = `[id="${await door.getAttribute("aria-controls")}"]`;
  const list = page.locator(listSel);
  const ticks = () => page.locator(`${listSel} input[type=checkbox]:checked`).count();

  await door.click();
  const boxes = list.getByRole("checkbox");
  await boxes.first().waitFor({ timeout: 15_000 });
  const rows = await boxes.count();
  console.log(`[${w}] open: ${rows} rows, ${await ticks()} seeded ticks`);
  await shot(page, `${w}-2-open`);

  // The pinned bar is out of flow at phone, so the last row is only reachable
  // if the list reserves the bar's height. Scroll the last row to the foot and
  // look at it.
  await boxes.last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, `${w}-2b-list-end`);

  // Clear, then the zero-tick line, then the owned tick-all — the two head
  // controls and the state between them.
  await page.getByRole("button", { name: /Clear all ticks/ }).click();
  await page.waitForTimeout(200);
  await shot(page, `${w}-3-zero-ticks`);
  const zero = await page.locator("text=/nothing ticked/").count();
  console.log(`[${w}] zero-tick line present: ${zero > 0}`);

  await page.getByRole("button", { name: /Tick all .* candidates you already own/ }).click();
  await page.waitForTimeout(200);
  console.log(`[${w}] re-ticked: ${await ticks()}`);

  // Decline and restore.
  const decline = page.getByRole("button", { name: /^Set .* aside$/ }).first();
  await decline.click();
  await page.waitForTimeout(200);
  await shot(page, `${w}-4-declined`);
  console.log(`[${w}] declined row drawn: ${await page.locator("text=not this one").count()}`);
  await page.getByRole("button", { name: /^Put .* back on the list$/ }).first().click();
  await page.waitForTimeout(200);
  console.log(`[${w}] restored: ${await page.locator("text=not this one").count() === 0}`);

  // Forced failure: kill the server action's POST, which is the thrown-call
  // half of state 15. The list must stay open with every tick intact.
  await page.route("**/decks/**", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  const before = await ticks();
  await page.getByRole("button", { name: /^Add .* cards to the deck/ }).click();
  await page.waitForTimeout(1500);
  // By test id, not by role: the plate carries no live role, because
  // BuilderShell's polite region is what speaks the refusal.
  const refusal = await list
    .getByTestId("top-off-refusal")
    .innerText()
    .catch(() => "(none)");
  const after = await ticks();
  console.log(`[${w}] refusal: "${refusal.trim()}" · ticks ${before} then ${after}`);
  await shot(page, `${w}-5-refused`);
  await page.unroute("**/decks/**");

  // Forced in-flight: hold the POST open long enough to read the label.
  await page.route("**/decks/**", async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 4000));
    await route.continue();
  });
  await page.getByRole("button", { name: /^Add .* cards to the deck/ }).click();
  await page.waitForTimeout(900);
  const sleeving = await page.locator("text=/Sleeving/").count();
  const cancelOff = await page.getByRole("button", { name: "Cancel" }).isDisabled();
  console.log(`[${w}] in-flight label: ${sleeving > 0} · cancel disabled: ${cancelOff}`);
  await shot(page, `${w}-6-inflight`);
  await page.waitForTimeout(6000);
  await page.unroute("**/decks/**");
  const closed = await page.getByRole("button", { name: /Choose the cards for the last/ }).count();
  console.log(`[${w}] committed and closed back to the door: ${closed > 0}`);
  await shot(page, `${w}-7-after-commit`);
}

const browser = await clerkSetup().then(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await signIn(page);
await resetDeck();
await walk(page, 1280);

const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  storageState: await page.context().storageState(),
});
await resetDeck();
await walk(phone, 390);

console.log(`\nshots:\n${shots.join("\n")}`);
await browser.close();
