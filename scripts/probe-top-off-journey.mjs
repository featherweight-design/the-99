// Gate 5 (journey lifecycle) for #360's top-off vertical. The four passes the
// gate names — forward, reverse, repeat, resume — are driven end to end in a
// real browser against the briefing's eighteen-step walk script, at 1280 and
// again at 390. The mutation-feedback sub-check rides along with the commit and
// each undo, with the network held open, because the builder is server-rendered
// and a mutation with no optimistic path reads as a dead button.
//
// Run by hand: `PROBE_BASE=http://localhost:3022 PROBE_DECK=<id> node scripts/probe-top-off-journey.mjs`.
import { mkdirSync } from "node:fs";
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
// The deck is the fixture the whole walk is written against, and it goes
// straight into SQL. Missing, every query returns nothing and the walk fails
// eighteen steps later as a timeout on a door that was never going to be there.
if (!DECK) {
  console.error("PROBE_DECK is required: the id of a deck under 99 with a seed pass.");
  process.exit(1);
}
const OUT = "probe-out/top-off-journey";
mkdirSync(OUT, { recursive: true });

const sql = neon(DATABASE_URL);
const shots = [];
const findings = [];

/** Every observation the walk makes, so the transcript is the artefact rather
 *  than the screenshots. A false `ok` is a finding, never a silent line. */
function check(scope, claim, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${scope}] ${mark} — ${claim}${detail ? ` (${detail})` : ""}`);
  if (!ok) findings.push(`[${scope}] ${claim}${detail ? ` — ${detail}` : ""}`);
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

/** The fixture the walk script names: a deck under 99 with a seed pass and no
 *  top-offs, so the door has slots to open and the ledger has one line. Trimmed
 *  by deleting whole rows, because a deck 31 short is the state being walked. */
async function resetDeck(target = 68) {
  await sql`delete from fill_passes where deck_id = ${DECK}`;
  const rows = await sql`
    select oracle_id, quantity from deck_cards where deck_id = ${DECK} order by oracle_id`;
  let running = 0;
  const keep = [];
  for (const row of rows) {
    if (running + row.quantity > target) continue;
    running += row.quantity;
    keep.push(row.oracle_id);
  }
  if (keep.length < rows.length) {
    await sql`delete from deck_cards where deck_id = ${DECK} and oracle_id <> all(${keep})`;
  }
  // Whole rows are deleted, and a row can hold several copies, so a deck whose
  // quantities do not add up to the target lands short. Every count the walk
  // asserts is written against a deck exactly 31 slots open, so an undershoot
  // fails here rather than as a mismatched figure eighteen steps later.
  if (running !== target) {
    console.error(
      `PROBE_DECK trimmed to ${running}, not ${target}: its quantities do not add up to the target. Pick a deck with more single copies.`,
    );
    process.exit(1);
  }
  await sql`update deck_cards set auto = true where deck_id = ${DECK}`;
  const [seed] = await sql`
    insert into fill_passes (deck_id, kind, ordinal, open_slots)
    values (${DECK}, 'seed', 1, 99) returning id`;
  await sql`
    insert into fill_pass_cards (pass_id, oracle_id, quantity)
    select ${seed.id}, oracle_id, quantity from deck_cards where deck_id = ${DECK}`;
  console.log(`\n[reset] deck at ${running}/99, one seed pass`);
  return running;
}

async function deckSize() {
  const [row] = await sql`
    select coalesce(sum(quantity), 0)::int n from deck_cards where deck_id = ${DECK}`;
  return row.n;
}

async function passRows() {
  return sql`
    select fp.ordinal, fp.kind, count(fpc.*)::int cards
      from fill_passes fp left join fill_pass_cards fpc on fpc.pass_id = fp.id
     where fp.deck_id = ${DECK} group by fp.id order by fp.ordinal`;
}

const doorSel = /^Choose the cards for the last/;
const commitSel = /^Add .* to the deck,/;

async function openDeck(page) {
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  // A full deck has no strip at all — the last-slots surface is gone once there
  // are no slots — so the wait is on the ledger too, which outlives it.
  await page
    .locator(
      "button[aria-label^='Choose the cards for the last'], [data-testid='last-slots-exhausted'], [data-testid='quick-add-dock']",
    )
    .first()
    .waitFor({ timeout: 30_000 });
}

/** The list's own boxes. The deck page carries other checkboxes, so an unscoped
 *  role query counts rows that are not candidates. */
function listBoxes(page) {
  return page.getByRole("group", { name: /candidates? for the last/ }).getByRole("checkbox");
}

/** One decklist row, counted by its remove control. The rows are divs with no
 *  test id, and a bare `li` count picks up the nav and the ledger as well, so a
 *  filtered decklist could read as unchanged. Every row carries exactly one
 *  remove button, and a stack of copies names the count instead. */
function decklistRows(page) {
  return page.getByRole("button", { name: /^Remove (one copy of )?.+/ });
}

/** The live region the whole surface announces through. Read rather than
 *  watched: every announcement this walk cares about survives its settle. */
async function announcement(page) {
  // The deck page mounts more than one polite region (the game log has its
  // own), so every one is read and joined rather than trusting document order.
  const texts = await page.locator('[aria-live="polite"][aria-atomic="true"]').allInnerTexts();
  return texts.join(" | ");
}

async function openList(page) {
  await page.getByRole("button", { name: doorSel }).click();
  await listBoxes(page).first().waitFor({ timeout: 15_000 });
}

/** The box is sr-only and the whole row is its label, so the row is the target
 *  a player hits and the one the walk hits too. */
async function toggle(box) {
  await box.evaluate((el) => el.closest("label").click());
}

/** Inertness is aria-disabled, not the disabled attribute: a capped box stays
 *  focusable so a reader can tab into it and hear the cap line. */
async function isInert(box) {
  return (await box.getAttribute("aria-disabled")) === "true";
}

// ── Pass 1 — forward (walk steps 1–5) ────────────────────────────────────
async function forward(page, w) {
  const scope = `${w}·forward`;
  await openDeck(page);
  const doors = await page.getByRole("button", { name: doorSel }).count();
  check(scope, "step 1: the strip offers one door and no fill CTA", doors === 1, `${doors} doors`);
  const legacyCtas = await page
    .getByRole("button", { name: /Fill .* from my collection|Top up with cards to buy/ })
    .count();
  check(scope, "step 1: both shipped CTAs are gone", legacyCtas === 0);
  await shot(page, `${w}-01-door`);

  await openList(page);
  const boxes = listBoxes(page);
  const total = await boxes.count();
  let ticked = 0;
  for (let i = 0; i < total; i += 1) if (await boxes.nth(i).isChecked()) ticked += 1;
  check(scope, "step 2: the list opens in place with owned rows ticked", total > 0 && ticked > 0, `${ticked}/${total} ticked`);
  check(scope, "step 2: opening announces the two counts", /candidates? for/.test(await announcement(page)));
  await shot(page, `${w}-02-list-open`);

  // Step 3: move the selection both ways and watch the head and the commit.
  // Read in two halves: the untick has to move the count down before the tick
  // moves it back, because ticking to the cap lands on the same figure it
  // started from and would read as a control that does nothing.
  const commit = () => page.getByRole("button", { name: commitSel }).getAttribute("aria-label");
  const headBefore = await commit();
  let untickedCount = 0;
  for (let i = 0; i < total && untickedCount < 2; i += 1) {
    if (await boxes.nth(i).isChecked()) {
      await toggle(boxes.nth(i));
      untickedCount += 1;
    }
  }
  await page.waitForTimeout(600);
  const headUnticked = await commit();
  check(scope, "step 3: two unticks take the commit's count down by two", headBefore !== headUnticked, `${headBefore} → ${headUnticked}`);
  let tickedCount = 0;
  for (let i = total - 1; i >= 0 && tickedCount < 3; i -= 1) {
    const box = boxes.nth(i);
    if (!(await box.isChecked()) && !(await isInert(box))) {
      await toggle(box);
      tickedCount += 1;
    }
  }
  await page.waitForTimeout(600);
  const headTicked = await commit();
  check(scope, "step 3: ticking back takes it up again, capped at the open slots", headTicked === headBefore, `${headUnticked} → ${headTicked}`);
  check(scope, "step 3: ticking announces the running count", /ticked/.test(await announcement(page)));
  await shot(page, `${w}-03-selection-moved`);

  // Step 4: tick past the cap. Untouched boxes go inert, never hidden.
  for (let i = 0; i < total; i += 1) {
    const box = boxes.nth(i);
    if (!(await box.isChecked()) && !(await isInert(box))) await toggle(box);
  }
  await page.waitForTimeout(600);
  const stillPresent = await boxes.count();
  let inert = 0;
  for (let i = 0; i < stillPresent; i += 1) if (await isInert(boxes.nth(i))) inert += 1;
  const capLine = await page.locator("text=/untick one to swap another in/").count();
  check(scope, "step 4: the cap goes the remaining boxes inert", inert > 0, `${inert} inert`);
  check(scope, "step 4: no row is hidden by the cap", stillPresent === total, `${stillPresent} of ${total}`);
  check(scope, "step 4: the cap line states the figure", capLine > 0);
  await shot(page, `${w}-04-capped`);

  // Step 5: one commit, one request, and the mutation-feedback sub-check.
  // The figure comes off the commit's own label rather than from the cap, so a
  // server that placed fewer cards than the button offered is a failure here
  // and not a deck that merely grew.
  const before = await deckSize();
  const offered = Number(/^Add (\d+)/.exec(await commit())?.[1]);
  const posts = [];
  // Removed at the end of the step: the page outlives this pass, so a listener
  // left attached would count a later pass's POSTs into this array.
  const countPost = (r) => r.method() === "POST" && posts.push(r.url());
  page.on("request", countPost);
  let held;
  await page.route("**/decks/**", async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 3500));
    await route.continue();
  });
  const clicked = Date.now();
  await page.getByRole("button", { name: commitSel }).click();
  await page.locator("text=/Sleeving .* cards?…/").first().waitFor({ timeout: 4000 }).then(
    () => (held = Date.now() - clicked),
    () => (held = null),
  );
  check(
    scope,
    "step 5 (mutation feedback): the commit states it is working before the server answers",
    held !== null && held < 1200,
    held === null ? "no in-flight label" : `${held}ms to feedback`,
  );
  await shot(page, `${w}-05-commit-inflight`);
  await page.waitForTimeout(8000);
  await page.unroute("**/decks/**");
  page.off("request", countPost);
  const after = await deckSize();
  check(scope, "step 5: one POST for the whole commit", posts.length === 1, `${posts.length} POSTs`);
  check(
    scope,
    "step 5: the deck grew by the ticked count",
    Number.isInteger(offered) && after - before === offered,
    `${before} → ${after}, label offered ${offered}`,
  );
  const listClosed = (await listBoxes(page).count()) === 0;
  check(scope, "step 5: the list closes on a settled commit", listClosed);
  check(scope, "step 5: the commit announces what landed", /added\./.test(await announcement(page)));
  await shot(page, `${w}-06-after-commit`);
  return after;
}

// ── Pass 2 — reverse (walk steps 6–8) ────────────────────────────────────
async function reverse(page, w) {
  const scope = `${w}·reverse`;
  await openDeck(page);
  const mark = page.getByRole("button", { name: /^Mark the .* from 1st top-off in the deck below$/ });
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const rowsBefore = await decklistRows(page).count();
  await mark.click();
  await page.waitForTimeout(400);
  const markedRows = await page.locator("text=/^from 1st top-off$/").count();
  const rowsAfter = await decklistRows(page).count();
  const scrollAfter = await page.evaluate(() => window.scrollY);
  check(scope, "step 6: the mark lands on the pass's rows", markedRows > 0, `${markedRows} rows`);
  check(scope, "step 6: nothing filters", rowsBefore === rowsAfter, `${rowsBefore} → ${rowsAfter}`);
  check(scope, "step 6: nothing scrolls", scrollBefore === scrollAfter);
  check(scope, "step 6: the mark is announced", /marked in the deck\./.test(await announcement(page)));
  await shot(page, `${w}-07-marked`);

  await page.getByRole("button", { name: /^Clear the mark on 1st top-off$/ }).click();
  await page.waitForTimeout(400);
  check(scope, "step 7: the same control clears the mark", (await page.locator("text=/^from 1st top-off$/").count()) === 0);
  check(scope, "step 7: clearing is announced", /Mark cleared\./.test(await announcement(page)));

  const before = await deckSize();
  const undo = page.getByRole("button", { name: /Undo the .* from 1st top-off/ });
  let held;
  await page.route("**/decks/**", async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 3500));
    await route.continue();
  });
  const clicked = Date.now();
  await undo.click();
  await page.locator("text=/Putting .* back…/").first().waitFor({ timeout: 4000 }).then(
    () => (held = Date.now() - clicked),
    () => (held = null),
  );
  check(
    scope,
    "step 8 (mutation feedback): the undo states it is working before the server answers",
    held !== null && held < 1200,
    held === null ? "no in-flight label" : `${held}ms to feedback`,
  );
  await page.waitForTimeout(8000);
  await page.unroute("**/decks/**");
  const after = await deckSize();
  check(scope, "step 8: the pass's cards leave the deck", after < before, `${before} → ${after}`);
  check(scope, "step 8: the line goes with the pass", (await page.locator("text=/you chose from the last/").count()) === 0);
  check(scope, "step 8: the undo announces the settled size", new RegExp(`put back\\. ${after} of 99\\.`).test(await announcement(page)), await announcement(page));
  await shot(page, `${w}-08-after-undo`);
}

// ── Pass 3 — repeat, and the keyed-state trap (walk steps 9–13) ──────────
async function repeat(page, w) {
  const scope = `${w}·repeat`;
  await openDeck(page);
  await openList(page);
  await page.getByRole("button", { name: commitSel }).click();
  await page.waitForTimeout(5000);
  const lines = await passRows();
  check(scope, "step 9: a second pass gets its own line", lines.filter((l) => l.kind === "top_off").length >= 1, JSON.stringify(lines));
  // Ordinals are per kind: the seed is its own sequence, so a deck's first
  // top-off is `1st top-off` beneath `the seed` rather than `2nd top-off`.
  const ordinals = lines.filter((l) => l.kind === "top_off").map((l) => Number(l.ordinal));
  check(scope, "step 9: top-off ordinals are stable and never renumber", ordinals.every((n, i) => i === 0 || n > ordinals[i - 1]), ordinals.join(","));
  await openDeck(page);
  await shot(page, `${w}-09-second-pass`);

  // Step 10: keep one card out of the pass. Forced in the database so the count
  // is known rather than whichever row a click happened to land on.
  const [kept] = await sql`
    select fpc.oracle_id from fill_pass_cards fpc join fill_passes fp on fp.id = fpc.pass_id
     where fp.deck_id = ${DECK} and fp.kind = 'top_off' order by fp.ordinal desc, fpc.oracle_id limit 1`;
  await sql`update deck_cards set auto = false where deck_id = ${DECK} and oracle_id = ${kept.oracle_id}`;
  await openDeck(page);
  check(scope, "step 10: the line re-reads with what became of the card", (await page.locator("text=/1 now yours/").count()) > 0);
  await shot(page, `${w}-10-recounted`);

  // Step 11: undo the rest. The kept card survives its pass.
  const undoLast = page.getByRole("button", { name: /Undo the .* from \d+(st|nd|rd|th) top-off/ }).last();
  await undoLast.click();
  await page.waitForTimeout(5000);
  const [survived] = await sql`
    select count(*)::int n from deck_cards where deck_id = ${DECK} and oracle_id = ${kept.oracle_id}`;
  check(scope, "step 11: the kept card stays when its pass is undone", survived.n === 1);
  check(scope, "step 11: the line goes", (await page.locator("text=/you chose from the last/").count()) === 0);
  await shot(page, `${w}-11-kept-survives`);

  // Step 12: the same card, placed again by a later pass, gets a fresh line.
  await openDeck(page);
  await openList(page);
  await page.getByRole("button", { name: commitSel }).click();
  await page.waitForTimeout(5000);
  const third = await passRows();
  check(scope, "step 12: a third pass is recorded per pass, never per card", third.length >= 2, JSON.stringify(third));
  await openDeck(page);
  await shot(page, `${w}-12-third-pass`);

  // Step 13: Keep all empties every pass, and the ledger goes with the sweep.
  const keepAll = page.getByRole("button", { name: /Keep all/i }).first();
  if ((await keepAll.count()) > 0) {
    await keepAll.click();
    await page.waitForTimeout(5000);
    await openDeck(page);
    const ledgerGone = (await page.locator("text=/came from/").count()) === 0;
    const sweepGone = (await page.getByRole("button", { name: /Clear all auto/i }).count()) === 0;
    check(scope, "step 13: Keep all empties the ledger", ledgerGone);
    check(scope, "step 13: the sweep goes in the same act", sweepGone);
    await shot(page, `${w}-13-kept-all`);
  } else {
    check(scope, "step 13: Keep all is reachable", false, "no Keep all control found");
  }
}

// ── Pass 4 — resume (walk steps 14–16) ───────────────────────────────────
async function resume(page, browser, w) {
  const scope = `${w}·resume`;
  await resetDeck();
  await openDeck(page);
  await openList(page);
  const before = await deckSize();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  check(scope, "step 14: a reload closes the list and drops the ticks", (await listBoxes(page).count()) === 0);
  check(scope, "step 14: the deck is unchanged by the abandoned selection", (await deckSize()) === before);
  await shot(page, `${w}-14-reload-scratch`);

  await openList(page);
  await page.getByRole("button", { name: commitSel }).click();
  await page.waitForTimeout(5000);
  const ledgerBefore = await page.locator("text=/you chose from the last/").first().innerText();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const ledgerAfter = await page.locator("text=/you chose from the last/").first().innerText();
  check(scope, "step 15: the ledger is server state and survives a reload", ledgerBefore === ledgerAfter, `${ledgerBefore} / ${ledgerAfter}`);
  await shot(page, `${w}-15-reload-ledger`);

  // Step 16: two tabs. Commit in one, reload the other, and they agree. The
  // deck is full after step 15, so it goes back to a state with slots first.
  await resetDeck();
  await openDeck(page);
  const second = await browser.newPage({
    viewport: page.viewportSize(),
    storageState: await page.context().storageState(),
  });
  await openDeck(second);
  await openList(second);
  await second.getByRole("button", { name: commitSel }).click();
  await second.waitForTimeout(5000);
  const secondLines = await second.locator("text=/you chose from the last/").count();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const firstLines = await page.locator("text=/you chose from the last/").count();
  check(scope, "step 16: a second session's commit is there on reload", firstLines === secondLines, `${firstLines} vs ${secondLines}`);
  await shot(page, `${w}-16-two-tabs`);
  await second.close();
}

// ── Pass 5 — the phone's own two steps (17–18) ───────────────────────────
async function phoneOnly(page) {
  const scope = "phone·layout";
  await resetDeck();
  await openDeck(page);
  await openList(page);
  const dockNotice = await page.locator("text=/Quick-add is back when you close the list/").count();
  check(scope, "step 17: the dock collapses to its one-line notice", dockNotice > 0);
  await shot(page, "phone-17-dock-retired");

  await page.getByRole("button", { name: /^Close the list$/ }).click();
  await page.waitForTimeout(800);
  const dockBack = await page.locator("[data-testid='quick-add-dock']").count();
  check(scope, "step 17: closing restores the dock", dockBack > 0);
  await shot(page, "phone-17b-dock-back");

  await openList(page);
  const inner = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("*"));
    return els.filter((el) => {
      const s = getComputedStyle(el);
      return (
        (s.overflowY === "auto" || s.overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight + 4 &&
        el !== document.scrollingElement
      );
    }).length;
  });
  check(scope, "step 18: one scroll surface, no inner scroller", inner === 0, `${inner} inner scrollers`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await shot(page, "phone-18-page-end");
}

const browser = await clerkSetup().then(() => chromium.launch());
const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await signIn(desktop);

await resetDeck();
await forward(desktop, "desktop");
await reverse(desktop, "desktop");
await resetDeck();
await repeat(desktop, "desktop");
await resume(desktop, browser, "desktop");

const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  storageState: await desktop.context().storageState(),
});
await resetDeck();
await forward(phone, "phone");
await reverse(phone, "phone");
await resetDeck();
await repeat(phone, "phone");
await resume(phone, browser, "phone");
await phoneOnly(phone);

console.log(`\nshots:\n${shots.join("\n")}`);
console.log(`\n${findings.length} findings`);
for (const f of findings) console.log(` · ${f}`);
await browser.close();
process.exit(findings.length === 0 ? 0 : 1);
