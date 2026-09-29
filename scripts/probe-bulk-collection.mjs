// "Select N from my collection" ticks what it says (Hugh's deck bug batch, 2026-09-28, item 10).
//
// Reported: the button read `Select 6 from my collection` and a press ticked nothing. This walks it
// on a cold load (pressed the moment it is drawn) and again well after hydration, at 1300x900, on a
// staging-shaped deck, and reads the list's own boxes after each press. The label's figure and the
// count the press ticked must agree, and a press must tick at least one box.
//
// FIXTURE. A copy of a real deck under the signed-in account, trimmed to leave `PROBE_OPEN` slots
// (default 12): the same commander and the first rows of its list. It is written before the walk and
// deleted in a `finally`. The source deck is named with `PROBE_SOURCE_DECK` (default `HD - Thorin`)
// and must belong to the signed-in account, so `pull:staging` it into a scratch branch first.
// Writes that deck and the account's About row (captured and restored). Point it at a scratch branch
// or `local-dev`, never production:
//   PROBE_BASE=http://localhost:3336 pnpm probe:bulk-collection
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY", "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SOURCE = process.env.PROBE_SOURCE_DECK ?? "HD - Thorin";
const OPEN = Number(process.env.PROBE_OPEN ?? 12);
const sql = neon(DATABASE_URL);

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = email.includes("+clerk_test")
        ? await signIn.create({ identifier: email })
        : await signIn.create({ identifier: email, password });
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
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/** A trimmed copy of the source deck, `OPEN` slots short of 99. */
async function buildFixture(userId) {
  const [src] = await sql`
    select id, commander_oracle_id from decks where user_id = ${userId} and name = ${SOURCE} limit 1`;
  if (!src) throw new Error(`The signed-in account holds no deck named ${SOURCE}; pull:staging it first.`);
  const rows = await sql`
    select oracle_id, quantity from deck_cards where deck_id = ${src.id} order by oracle_id`;
  const [deck] = await sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${userId}, ${"probe bulk collection"}, ${src.commander_oracle_id}) returning id`;
  let built = 0;
  try {
    for (const r of rows) {
      if (built + r.quantity > 99 - OPEN) continue;
      await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}, ${r.oracle_id}, ${r.quantity})`;
      built += r.quantity;
    }
  } catch (error) {
    // The caller holds no id until this returns, so a half-built deck is deleted here.
    await sql`delete from decks where id = ${deck.id}`;
    throw error;
  }
  return { id: deck.id, open: 99 - built };
}

const BULK = /^Select (\d+) cards from your collection/;
const listBoxes = (page) => page.getByRole("group", { name: /candidates? for the last/ }).getByRole("checkbox");

async function walk(page, deckId, mode) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: mode === "cold" ? "domcontentloaded" : "networkidle" });
  const door = onPageRole(page, "button", /^Choose the cards for the last/).first();
  await door.waitFor({ state: "visible", timeout: 30_000 });
  if (mode === "hydrated") await page.waitForTimeout(2_000);
  await door.click();
  await listBoxes(page).first().waitFor({ timeout: 30_000 });
  // The pair mounts when its plans land, and draws only the controls whose press would tick
  // something. Wait for either control, then read whether the collection one is among them.
  const pair = onPageRole(page, "button", /^Select .* cards (from your collection|this deck needs)/).first();
  const mounted = await pair.waitFor({ state: "visible", timeout: 30_000 }).then(() => true, () => false);
  if (!mounted) {
    // Neither control drew: the plans were refused, never landed, or both would tick nothing.
    // Whatever the cause, this run pressed nothing, and it says so rather than passing.
    check(`${mode}: the bulk pair is drawn`, false, "no bulk control within 30s — NOT a pass");
    return;
  }
  if (mode === "hydrated") await page.waitForTimeout(2_000);
  const bulk = onPageRole(page, "button", BULK).first();
  if ((await bulk.count()) === 0) {
    // The zero case, with the pair drawn: the collection plan chose nothing the list can tick,
    // so the collection control is absent rather than a live button naming a count.
    check(`${mode}: no collection control promises a count it cannot tick`, true, "the plan chose none, and none is drawn");
    return;
  }
  // The list opens with the seed's own ticks, which come from the same plan. Cleared first, so
  // what is ticked after the press is what the press ticked, not what the seed left.
  await onPageRole(page, "button", /^Clear all ticks$/).first().click();
  await page.waitForTimeout(300);
  const name = (await bulk.getAttribute("aria-label")) ?? "";
  const promised = Number(name.match(BULK)?.[1] ?? NaN);
  const note = (await bulk.innerText()).replace(/\s+/g, " ").trim();
  await bulk.click();
  await page.waitForTimeout(1_000);
  const boxes = listBoxes(page);
  const total = await boxes.count();
  let ticked = 0;
  for (let i = 0; i < total; i += 1) if (await boxes.nth(i).isChecked()) ticked += 1;
  check(`${mode}: the press ticks at least one box`, ticked > 0, `${ticked} of ${total} ticked; control read "${note}"`);
  check(`${mode}: it ticks the number it names`, ticked === promised, `named ${promised}, ticked ${ticked}`);
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  const userId = await signIn(page);
  const about = await captureAboutSeen(userId);
  let fixture = null;
  try {
    await clearAboutSheet(page, userId);
    fixture = await buildFixture(userId);
    console.log(`fixture: ${fixture.open} open slots on a copy of ${SOURCE}`);
    for (const mode of ["cold", "hydrated"]) {
      try {
        await walk(page, fixture.id, mode);
      } catch (error) {
        if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/bulk-${mode}.png` });
        throw error;
      }
    }
  } finally {
    // Each step on its own, so one failing cannot skip the rest.
    try {
      if (fixture) await sql`delete from decks where id = ${fixture.id}`;
    } finally {
      try {
        await restoreAboutSeen(about);
      } finally {
        await browser.close();
      }
    }
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  return failures;
}

main().then(
  (n) => process.exit(n === 0 ? 0 : 1),
  (error) => { console.error(error); process.exit(1); },
);
