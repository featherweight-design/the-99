// Deck notes in a real browser at 1300x900 and 390x844: open the Notes segment, add a note with a `[[` tag
// picked from the picker, press the tag (card details open), select the note (it moves under Done (1)),
// unselect it, edit it in place, and delete it behind the confirm. At 390 it also proves the sticky add bar
// and the tab bar step aside while the field has focus. It then empties the deck (commander only) and proves
// Notes is still reachable there: a note adds, All brings the empty state back, and the note is still kept
// after a reload.
//
// It WRITES: it creates a deck of its own under the signed-in account (three catalog cards), walks the notes
// on it, and deletes the deck (notes and cards cascade) in a `finally`. It refuses staging, production and an unknown branch before the first write by
// `neon.branch_id`. Point DATABASE_URL (and the server it names) at local-dev, never production.
// Needs the server started with DECK_NOTES_ENABLED=true.
//
// Run: PROBE_BASE=http://localhost:3201 node scripts/probe-deck-notes.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, markEveryEntrySeen, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failures += 1;
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

let deckId = null;
let verified = false;
let aboutCapture = null;

async function walk(browser, label, viewport, card) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await walkIn(page, label, card);
  } catch (error) {
    // PROBE_SHOTS=<dir> keeps a picture of where a step stopped.
    if (process.env.PROBE_SHOTS) {
      console.log("panel:", JSON.stringify((await page.locator('section[aria-label="Notes"]').first().innerText().catch(() => "(no panel)")).slice(0, 260)));
      console.log("deck still exists:", JSON.stringify(await sql`select count(*)::int as n from decks where id = ${deckId}::uuid`));
      console.log("db:", JSON.stringify(await sql`select left(body, 40) as body, done_at is not null as done from deck_notes where deck_id = ${deckId}::uuid`));
    }
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/deck-notes-${label}-failed.png` });
    throw error;
  } finally {
    await context.close();
  }
}

async function walkIn(page, label, card) {
  await signIn(page);
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const segment = onPage(page, "button").filter({ hasText: /^Notes/ }).first();
  await segment.waitFor({ timeout: 30_000 });
  await segment.click();
  const panel = onPage(page, 'section[aria-label="Notes"]');
  const field = panel.getByRole("combobox", { name: "Add a note" });
  await field.waitFor();
  check(`${label}: an empty deck draws the empty state`, (await panel.getByText("The swap you meant to try.").count()) === 1);

  await field.click();
  await field.pressSequentially(`swap in [[${card.slice(0, 4)}`);
  const option = page.getByRole("option", { name: new RegExp(card) }).first();
  await option.waitFor();
  check(`${label}: the picker offers the deck's card first`, (await page.getByRole("option").first().textContent())?.includes(card) ?? false);
  if (label === "390") {
    const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-hide-on-note-focus]")].every((el) => getComputedStyle(el).display === "none"));
    check("390: the add bar and the tab bar step aside while the field has focus", hidden);
  }
  await page.keyboard.press("Enter");
  await panel.getByRole("button", { name: "Add", exact: true }).click();
  const tag = panel.getByRole("button", { name: `${card}, card details` });
  await tag.waitFor({ timeout: 30_000 });
  check(`${label}: the added note draws the tag`, true);
  check(`${label}: the field cleared`, (await field.inputValue()) === "");

  await tag.click();
  await page.locator('[role="dialog"]').last().waitFor({ timeout: 30_000 });
  check(`${label}: pressing the tag opens card details`, true);
  await page.keyboard.press("Escape");

  await panel.getByRole("checkbox").first().click();
  const doneToggle = panel.getByRole("button", { name: /Done \(1\)/ });
  await doneToggle.waitFor({ timeout: 30_000 });
  check(`${label}: selecting a note moves it under Done (1), closed`, (await panel.getByRole("checkbox").count()) === 0);
  await doneToggle.click();
  await panel.getByRole("checkbox").first().click();
  await panel.getByRole("checkbox", { checked: false }).waitFor({ timeout: 30_000 });
  check(`${label}: unselecting puts it back on the list`, true);

  const rowButtons = label === "390"
    ? async (name) => { await panel.getByRole("button", { name: "More for this note" }).click(); await panel.getByRole("button", { name, exact: true }).click(); }
    : async (name) => { await panel.getByRole("button", { name: name === "Edit" ? "Edit this note" : "Delete this note" }).click(); };
  await rowButtons("Edit");
  const edit = panel.getByRole("combobox", { name: "Edit this note" });
  await edit.fill("changed");
  await panel.getByRole("button", { name: "Save" }).click();
  await panel.getByText("changed", { exact: true }).waitFor({ timeout: 30_000 });
  check(`${label}: an edit saves in place`, true);

  await rowButtons("Delete");
  await panel.getByRole("button", { name: "Delete", exact: true }).click();
  // Deleting the last note returns the panel to its empty state, which is what proves the write landed.
  await panel.getByText("The swap you meant to try.").waitFor({ timeout: 30_000 });
  check(`${label}: delete asks first, then removes the note`, (await sql`select count(*)::int as n from deck_notes where deck_id = ${deckId}::uuid`)[0].n === 0);
}

// The same deck with its cards removed: a commander-only list draws the empty state, which used to carry no
// All / Shopping / Notes control, so Notes was unreachable and kept notes hid.
async function walkEmpty(browser, label, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await signIn(page);
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
    const segment = onPage(page, "button").filter({ hasText: /^Notes/ }).first();
    await segment.waitFor({ timeout: 30_000 });
    check(`${label}: an empty deck draws the Notes control`, true);
    await segment.click();
    const panel = onPage(page, 'section[aria-label="Notes"]');
    const field = panel.getByRole("combobox", { name: "Add a note" });
    await field.waitFor();
    await field.fill(`kept on an empty deck ${label}`);
    await panel.getByRole("button", { name: "Add", exact: true }).click();
    await panel.getByText(`kept on an empty deck ${label}`).waitFor({ timeout: 30_000 });
    check(`${label}: a note adds on an empty deck`, true);
    await onPage(page, "button").filter({ hasText: /^All/ }).first().click();
    check(`${label}: All swaps the empty state back`, (await panel.count()) === 0);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/deck-notes-empty-${label}.png` });
    await page.reload({ waitUntil: "domcontentloaded" });
    const again = onPage(page, "button").filter({ hasText: /^Notes/ }).first();
    await again.waitFor({ timeout: 30_000 });
    await again.click();
    await onPage(page, 'section[aria-label="Notes"]').getByText(`kept on an empty deck ${label}`).waitFor({ timeout: 30_000 });
    check(`${label}: the kept note shows after a reload, on a deck with no cards`, true);
  } finally {
    await context.close();
  }
}

async function main() {
  const branch = (await sql`select current_setting('neon.branch_id', true) as id`)[0].id;
  if (!branch || branch === PRODUCTION || branch === STAGING || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write notes to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
  }
  verified = true;
  console.log(`branch ${branch}`);
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const probe = await browser.newContext();
    const page = await probe.newPage();
    const userId = await signIn(page);
    // An unseen About entry redirects the deck to /about; the branch was verified above as not staging or production.
    aboutCapture = await captureAboutSeen(userId);
    await markEveryEntrySeen(userId);
    await probe.close();
    // Its own deck: a shared fixture deck is rewritten by other lanes' probes on the same database, and a
    // cascade from one of theirs would delete the notes this one is walking.
    const [lead] = await sql`select oracle_id from cards where type_line ~ 'Legendary Creature' and commander_legal order by oracle_id limit 1`;
    const pool = await sql`select oracle_id, name from cards where commander_legal and layout = 'normal' and type_line !~ '(Land|Token|Basic)' and oracle_id <> ${lead.oracle_id}::uuid order by oracle_id limit 3`;
    if (pool.length < 3) throw new Error("catalog is too small, seed it first");
    const [made] = await sql`insert into decks (user_id, name, commander_oracle_id) values (${userId}, ${`probe deck notes ${Date.now()}`}, ${lead.oracle_id}::uuid) returning id`;
    deckId = made.id;
    for (const c of pool) await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${c.oracle_id}::uuid, 1)`;
    const card = pool.map((c) => c.name).sort()[0];
    await walk(browser, "1300", { width: 1300, height: 900 }, card);
    await walk(browser, "390", { width: 390, height: 844 }, card);
    await sql`delete from deck_cards where deck_id = ${deckId}::uuid`;
    await walkEmpty(browser, "1300", { width: 1300, height: 900 });
    await walkEmpty(browser, "390", { width: 390, height: 844 });
  } finally {
    await browser.close();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    try {
      // The deck is the probe's own, and its notes and cards cascade with it.
      if (verified && deckId) await sql`delete from decks where id = ${deckId}::uuid`;
      // Both About columns back, so the account's later runs see the announcements it had not yet seen.
      if (aboutCapture) await restoreAboutSeen(aboutCapture);
    } catch (error) {
      failures += 1;
      console.error("cleanup failed", error);
    }
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
