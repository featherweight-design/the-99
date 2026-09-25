// Change commander's door and sheet, walked in a real browser at 1300x900 and 390x844 (PR 3).
//
// Every check here is a fact about laid-out geometry or about a press, which jsdom has neither of:
// the joined plate's drawn box and its 44px halves, the sheet at 700, a row's 56x41 thumb, the
// figure opening the cards it counts, Choose replacing the list with the confirm and Back putting
// it back, and the press that writes the new commander: read back from the database, not the DOM.
//
// It builds its own fixture: a committed deck, under the account it signs in as, led by a mono-green
// legend and holding three cards that another mono-green commander's decks run, so the figure has
// something to count. It deletes the deck in a finally. Point it at `local-dev` with a server started
// with CHANGE_COMMANDER_ENABLED=true, **never production**.
//
// Run: `node scripts/probe-change-commander.mjs` (no package.json entry: that file is outside this
// lane's fence). PROBE_BASE picks the server (default http://localhost:3000).

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}: ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
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
  const userId = await page.evaluate(() => window.Clerk.user.id);
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  // Captured BEFORE the write and put back in the run's finally: the About gate is the account's own
  // state, and a probe that only raises it leaves the real audit account changed.
  const [prior] = await sql`select about_version_seen from user_prefs where user_id = ${userId}`;
  restorePrefs = async () => {
    if (prior) await sql`update user_prefs set about_version_seen = ${prior.about_version_seen} where user_id = ${userId}`;
    else await sql`delete from user_prefs where user_id = ${userId}`;
  };
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  // The version bump's one-time sheet would otherwise sit over every page this walks (E5).
  await clearAboutSheet(page, userId);
  return userId;
}

/** Cleanup handles, each set BEFORE the write it undoes, so a throw part-way through strands
 *  nothing. */
/** Every fixture deck, in the order made. */
const made = [];
let restorePrefs = null;
/** The pair sentinel the half-trade section plants in `commander_pair_support`, deleted only when
 *  this run inserted it (local-dev indexes no pairs, so without it no pair is ever offered). */
let pairSentinel = null;

/**
 * The half-trade (addendum): a pair deck led by A1 + B1 with B2 in its 98, offered A2 + B2. Four
 * generic-partner legends, two of each identity, so the new pair keeps the deck's identity. Every
 * deck id goes into `made` the moment it exists.
 */
async function buildHalfTradeFixture(userId) {
  const rows = await sql`
    select c.oracle_id, c.name, array_to_string(array(select x from unnest(c.color_identity) x order by x), '') as ci
    from cards c
    where c.commander_legal and c.type_line ilike 'Legendary Creature%'
      and c.oracle_text like '%Partner (You can have two commanders if both have partner.)%'
    order by c.oracle_id`;
  const groups = new Map();
  for (const row of rows) groups.set(row.ci, [...(groups.get(row.ci) ?? []), row]);
  const [first, second] = [...groups.values()].filter((g) => g.length >= 2);
  if (!first || !second) throw new Error("catalog holds no generic-partner fixture for the half-trade");
  const [a1, a2] = first;
  const [b1, b2] = second;
  const [deck] = await sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${userId}, 'probe:change-commander half-trade', ${a1.oracle_id}, ${b1.oracle_id}) returning id`;
  made.push(deck.id);
  await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}, ${b2.oracle_id}, 1)`;
  const [v] = await sql`
    insert into deck_versions (deck_id, number, commander_oracle_id, partner_oracle_id)
    values (${deck.id}, 1, ${a1.oracle_id}, ${b1.oracle_id}) returning id`;
  await sql`insert into deck_version_cards (version_id, oracle_id, quantity) values (${v.id}, ${b2.oracle_id}, 1)`;
  // Stored in id order (the table's check), and an `ok` row carries its EDHREC total.
  const [lo, hi] = [a2.oracle_id, b2.oracle_id].sort();
  const planted = await sql`
    insert into commander_pair_support (commander_oracle_id, partner_oracle_id, synergy_state, edhrec_total, deck_count, bracket_counts)
    values (${lo}, ${hi}, 'ok', 500, 500, '{}'::jsonb)
    on conflict do nothing returning commander_oracle_id`;
  if (planted.length > 0) pairSentinel = { a: lo, b: hi };
  return { deckId: deck.id, a1, b1, a2, b2 };
}

/** A committed mono-green deck holding three cards a real mono-green candidate's decks run. With
 *  `trade`, the target also sits in the 99, so choosing it trades places (STATES 21b). */
async function buildFixture(userId, { trade = false } = {}) {
  const [lead] = await sql`
    select c.oracle_id from cards c join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where c.commander_legal and c.color_identity = '{G}' and c.type_line ilike 'Legendary Creature%'
      and cs.synergy_state = 'ok' and cs.deck_count >= 20
    order by cs.deck_count desc, c.oracle_id limit 1`;
  const [target] = await sql`
    select cs.commander_oracle_id as oracle_id from commander_support cs
    join cards c on c.oracle_id = cs.commander_oracle_id
    where c.commander_legal and c.color_identity = '{G}' and cs.synergy_state = 'ok' and cs.deck_count >= 20
      and cs.commander_oracle_id <> ${lead.oracle_id}
    order by cs.deck_count desc, cs.commander_oracle_id limit 1`;
  const hits = await sql`
    select sc.oracle_id from commander_support_cards sc join cards k on k.oracle_id = sc.oracle_id
    where sc.commander_oracle_id = ${target.oracle_id} and k.color_identity <@ '{G}'::text[]
      and k.type_line not ilike '%Land%' and sc.oracle_id not in (select oracle_id from format_staples)
    order by sc.oracle_id limit 3`;
  if (trade) hits.push({ oracle_id: target.oracle_id });
  const [deck] = await sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${userId}, 'probe:change-commander', ${lead.oracle_id}) returning id`;
  made.push(deck.id);
  for (const h of hits) {
    await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}, ${h.oracle_id}, 1)`;
  }
  const [v] = await sql`
    insert into deck_versions (deck_id, number, commander_oracle_id) values (${deck.id}, 1, ${lead.oracle_id})
    returning id`;
  for (const h of hits) {
    await sql`insert into deck_version_cards (version_id, oracle_id, quantity) values (${v.id}, ${h.oracle_id}, 1)`;
  }
  return { deckId: deck.id, lead: lead.oracle_id, target: target.oracle_id };
}

const rect = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height, top: r.top, left: r.left };
});

async function walk(page, width, fixture) {
  const tag = `@${width.label}`;
  await page.setViewportSize(width.viewport);
  await page.goto(`${BASE}/decks/${fixture.deckId}`, { waitUntil: "domcontentloaded" });

  const door = onPage(page, '[data-testid="change-commander-door"]').filter({ visible: true });
  await door.first().waitFor({ state: "visible", timeout: 30_000 });
  report(`door ${tag}`, (await door.count()) === 1, `${await door.count()} visible door(s)`);

  // The plate is the door's first child span: 26px on its drawn axis.
  const plate = await rect(door.locator("span").first());
  if (width.label === 1300) report(`plate height ${tag}`, Math.round(plate.h) === 26, `${plate.h}px`);
  else report(`plate ${tag}`, Math.round(plate.w) === 26 && Math.round(plate.h) === 53, `${plate.w}x${plate.h}px`);
  for (const b of await door.locator("button").all()) {
    const r = await rect(b);
    report(`half target ${tag}`, r.h >= 44 && r.w >= 44 - 0.5 || (width.label === 1300 && r.h >= 44), `${Math.round(r.w)}x${Math.round(r.h)}px`);
  }

  // Press the door: the sheet opens at 700 on desktop, with rows.
  await door.getByRole("button", { name: "Change commander" }).click();
  const dialog = page.getByRole("dialog", { name: "Change commander" });
  await dialog.waitFor({ state: "visible" });
  const rows = dialog.locator('[data-testid="change-commander-row"]');
  await rows.first().waitFor({ state: "visible", timeout: 30_000 });
  if (width.label === 1300) {
    const d = await rect(dialog);
    report(`sheet width ${tag}`, Math.round(d.w) === 700, `${d.w}px`);
  }
  // The title is WHOLE: an ellipsized title reads innerText intact, so width is what tells.
  const title = await dialog.locator("h2").first().evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth, text: el.textContent }));
  report(`title whole ${tag}`, title.sw <= title.cw, `"${title.text}" ${title.sw}/${title.cw}px`);
  const count = await rows.count();
  report(`rows ${tag}`, count > 0, `${count} row(s)`);
  const thumb = await rect(rows.first().locator("span[aria-hidden=true]").first());
  report(`thumb ${tag}`, Math.round(thumb.w) === 56 && Math.round(thumb.h) === 41, `${thumb.w}x${thumb.h}px`);

  // The row's pip run is laid out as a run: a className that replaced CostPips' own would leave
  // an inline span with the pips touching, and every markup assertion would still pass.
  const run = await rows.first().evaluate((el) => {
    // The mana-value comparison's sibling wraps the first half's run.
    // The LEAF span only: a cost of colored pips carries no text, so the line's own wrapper also
    // starts with "(same as" and would otherwise be taken for the comparison.
    const compare = [...el.querySelectorAll("span")].find((x) => x.children.length === 0 && /^\((same as|\d+ (less|more) than) /.test(x.textContent ?? ""));
    const box = compare?.previousElementSibling?.lastElementChild;
    return box ? { display: getComputedStyle(box).display, gap: getComputedStyle(box).columnGap } : null;
  });
  report(`pip run ${tag}`, run?.display === "flex" && run.gap === "3px", JSON.stringify(run));

  // The figure opens the cards it counts, and says so.
  const figure = rows.first().locator("button[aria-expanded]");
  await figure.click();
  report(`figure opens ${tag}`, (await figure.getAttribute("aria-expanded")) === "true", "aria-expanded");
  const panel = page.locator(`#${await figure.getAttribute("aria-controls")}`);
  report(`figure names ${tag}`, (await panel.locator("button").count()) > 0, `${await panel.locator("button").count()} name(s)`);

  // A name opens the card, which stacks ABOVE the sheet: what paints at the card's centre is the
  // card, not the sheet. Same z-index, so only document order decides it.
  await panel.locator("button").first().click();
  const card = page.locator('[role="dialog"][aria-labelledby="card-modal-title"]');
  await card.waitFor({ state: "visible", timeout: 30_000 });
  const onTop = await card.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 120));
    return hit !== null && el.contains(hit);
  });
  report(`card stacks above the sheet ${tag}`, onTop, "elementFromPoint lands in the card");
  await page.keyboard.press("Escape");
  await card.waitFor({ state: "hidden" });

  // Choose replaces the list with the confirm; Back puts the same list back.
  await rows.first().locator("[data-choose]").click();
  const back = dialog.getByRole("button", { name: "Back to the list" });
  report(`confirm ${tag}`, await back.isVisible(), "Back to the list visible");
  report(`list hidden ${tag}`, !(await rows.first().isVisible()), "rows hidden behind the confirm");
  // The actions carry side padding: a button sized by its label alone reads as text on a slab.
  for (const name of [/^Make .* commander$/, "Back to the list"]) {
    const pad = await dialog.getByRole("button", { name }).evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
    report(`action padding ${tag}`, pad >= 12, `${name}: ${pad}px`);
  }
  await back.click();
  report(`back ${tag}`, (await rows.count()) === count && (await rows.first().isVisible()), `${await rows.count()} row(s) again`);
  report(`back keeps the open row ${tag}`, (await figure.getAttribute("aria-expanded")) === "true", "still open");

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
}

async function main() {
  const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
  if (!branch || branch === PRODUCTION || branch === STAGING || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write a fixture to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  let fixture = null;
  try {
    const page = await browser.newPage();
    const userId = await signIn(page);
    fixture = await buildFixture(userId);
    for (const width of WIDTHS) await walk(page, width, fixture);

    // The write, once, at desktop: the live commander moves, and the header says so.
    await page.setViewportSize(WIDTHS[0].viewport);
    await page.goto(`${BASE}/decks/${fixture.deckId}`, { waitUntil: "domcontentloaded" });
    const door = onPage(page, '[data-testid="change-commander-door"]').filter({ visible: true });
    await door.getByRole("button", { name: "Change commander" }).click();
    const dialog = page.getByRole("dialog", { name: "Change commander" });
    const row = dialog.locator('[data-testid="change-commander-row"]').first();
    await row.waitFor({ state: "visible", timeout: 30_000 });
    await row.locator("[data-choose]").click();
    await dialog.getByRole("button", { name: /^Make .* commander$/ }).click();
    await dialog.waitFor({ state: "hidden", timeout: 30_000 });
    const [live] = await sql`select commander_oracle_id as c from decks where id = ${fixture.deckId}`;
    report("write", live.c !== fixture.lead, `commander ${live.c === fixture.lead ? "unchanged" : "moved"}`);
    const [v] = await sql`select commander_oracle_id as c from deck_versions where deck_id = ${fixture.deckId}`;
    report("write is a draft change", v.c === fixture.lead, "the version still holds the old commander");

    // PR 4: the pending banner names the swap on its own line, and focus lands there.
    const line = onPage(page, '[data-testid="banner-commander-line"]').filter({ visible: true });
    await line.first().waitFor({ state: "visible", timeout: 30_000 });
    report("banner line", (await line.count()) === 1, (await line.first().textContent()) ?? "");
    report("focus lands on the banner line", await line.first().evaluate((el) => el === document.activeElement), "document.activeElement");

    // The review page draws the Commander section first, at both widths.
    for (const width of WIDTHS) {
      await page.setViewportSize(width.viewport);
      await page.goto(`${BASE}/decks/${fixture.deckId}/changes`, { waitUntil: "domcontentloaded" });
      const section = onPage(page, '[data-testid="review-commander"]');
      await section.waitFor({ state: "visible", timeout: 30_000 });
      const first = await section.evaluate((el) => {
        // Above the columns (`#review`), which the strip and the chips also sit above: a section
        // mounted anywhere below the lede but inside the columns would fail this.
        const columns = document.querySelector("main #review");
        return columns !== null && el.getBoundingClientRect().bottom <= columns.getBoundingClientRect().top;
      });
      report(`review section first @${width.label}`, first, "above the columns");
      report(`review rows @${width.label}`, (await section.locator("> div > div").count()) === 2, "was and now");
    }

    // Discard names the old commander back, then puts it back.
    await page.goto(`${BASE}/decks/${fixture.deckId}`, { waitUntil: "domcontentloaded" });
    await onPage(page, "button").filter({ hasText: /^Discard/ }).filter({ visible: true }).first().click();
    const why = onPage(page, "p").filter({ hasText: "leads it again." }).filter({ visible: true });
    report("discard names the old commander", (await why.count()) === 1, (await why.first().textContent().catch(() => "")) ?? "");
    // PROBE_SHOT=<dir> photographs the confirm, for copy review.
    if (process.env.PROBE_SHOT) await page.screenshot({ path: `${process.env.PROBE_SHOT}/discard-commander-390.png` });
    // The fixture moved only its commander: the card clause must not be drawn over zero cards.
    const whyText = (await why.first().textContent().catch(() => "")) ?? "";
    report("discard has no empty card clause", !/not stored anywhere|\.\s{2}/.test(whyText), whyText);

    // A trade (STATES 21b): the chosen commander was in the 99. On the review page the old
    // commander's row in `Coming in` reads that it came `from the command zone`, the new one's row
    // in `Going out` reads that it went `to the command zone`, and each hint stands where the row's
    // usual action (Pull it, Put back) would be.
    const traded = await buildFixture(userId, { trade: true });
    await page.setViewportSize(WIDTHS[0].viewport);
    await page.goto(`${BASE}/decks/${traded.deckId}`, { waitUntil: "domcontentloaded" });
    await onPage(page, '[data-testid="change-commander-door"]').filter({ visible: true })
      .getByRole("button", { name: "Change commander" }).click();
    const tradeDialog = page.getByRole("dialog", { name: "Change commander" });
    const tradeRow = tradeDialog.locator('[data-testid="change-commander-row"]').filter({ hasText: "trades places" }).first();
    await tradeRow.waitFor({ state: "visible", timeout: 30_000 });
    await tradeRow.locator("[data-choose]").click();
    await tradeDialog.getByRole("button", { name: /^Make .* commander$/ }).click();
    await tradeDialog.waitFor({ state: "hidden", timeout: 30_000 });
    const [moved] = await sql`select commander_oracle_id as c from decks where id = ${traded.deckId}`;
    report("trade write", moved.c === traded.target, `commander ${moved.c === traded.target ? "is the traded card" : "did not move to it"}`);
    for (const width of WIDTHS) {
      await page.setViewportSize(width.viewport);
      await page.goto(`${BASE}/decks/${traded.deckId}/changes`, { waitUntil: "domcontentloaded" });
      const tradeSection = onPage(page, '[data-testid="review-commander"]');
      await tradeSection.waitFor({ state: "visible", timeout: 30_000 });
      // The traded card keeps the copy it had in the 99, and the fixture's collection does not hold
      // it: a buy tag here would be a purchase the trade never asks for.
      const tradeText = (await tradeSection.textContent()) ?? "";
      report(`trade buys nothing @${width.label}`, !/buy/i.test(tradeText), tradeText.slice(0, 120));
      const columns = onPage(page, "#review");
      // The phone draws one column at a time behind a segmented pair; read what the document holds.
      const hints = await columns.evaluate((el) => ["in", "out"].map((side) => {
        const hint = el.querySelector(`[data-zone-hint="${side}"]`);
        const slot = hint?.parentElement;
        const action = [...(slot?.querySelectorAll("button") ?? [])].some((b) => /Pull it|Put back/.test(b.textContent ?? ""));
        return { side, text: hint?.textContent ?? null, action };
      }));
      const [coming, going] = hints;
      report(`trade zone hints @${width.label}`,
        coming.text === "from the command zone" && going.text === "to the command zone" && !coming.action && !going.action,
        JSON.stringify(hints));
    }

    // The half-trade (addendum): B2 leaves the 98 for the command zone, A2 joins it, and the
    // reader chooses which of A1 and B1 takes B2's slot while the other leaves the deck.
    const ht = await buildHalfTradeFixture(userId);
    const short = (n) => n.split(" // ")[0].split(",")[0].trim();
    for (const width of WIDTHS) {
      const tag = `@${width.label}`;
      await page.setViewportSize(width.viewport);
      await page.goto(`${BASE}/decks/${ht.deckId}`, { waitUntil: "domcontentloaded" });
      const htDoor = onPage(page, '[data-testid="change-commander-door"]').filter({ visible: true });
      await htDoor.first().waitFor({ state: "visible", timeout: 30_000 });
      await htDoor.getByRole("button", { name: /Change (pair|commander)/ }).first().click();
      const htDialog = page.getByRole("dialog", { name: "Change pair" });
      const htRow = htDialog.locator('[data-testid="change-commander-row"]')
        .filter({ hasText: short(ht.a2.name) }).filter({ hasText: short(ht.b2.name) }).first();
      await htRow.waitFor({ state: "visible", timeout: 30_000 });
      report(`half-trade offered ${tag}`, (await htRow.count()) === 1, "the pair with a half in the 98 is listed");
      await htRow.locator("[data-choose]").click();
      const group = htDialog.getByRole("radiogroup", { name: "Which one stays in the 98?" });
      await group.waitFor({ state: "visible" });
      const radios = group.getByRole("radio");
      const first = radios.nth(0);
      report(`half-trade default ${tag}`, (await first.getAttribute("aria-checked")) === "true" && (await first.textContent())?.includes(short(ht.a1.name)),
        `${await first.textContent()} checked by default`);
      // 44px options full width on a phone; 34px from md.
      const box = await first.evaluate((el) => { const r = el.getBoundingClientRect(); return { h: r.height }; });
      const groupBox = await group.evaluate((el) => el.getBoundingClientRect().width);
      const dialogBox = await htDialog.evaluate((el) => el.getBoundingClientRect().width);
      if (width.label === 390) report(`half-trade options ${tag}`, Math.round(box.h) >= 44 && groupBox > dialogBox * 0.8, `${box.h}px tall, group ${groupBox}px of ${dialogBox}px`);
      else report(`half-trade options ${tag}`, Math.round(box.h) === 34, `${box.h}px tall`);
      const sentence = () => htDialog.locator("p").filter({ hasText: "leaves the deck. The deck stays at 98." }).first().textContent();
      const before = await sentence();
      // The arrow key moves the choice and the focus, as a native radio group does.
      await first.focus();
      await page.keyboard.press("ArrowRight");
      const second = radios.nth(1);
      const flipped = (await second.getAttribute("aria-checked")) === "true" && (await second.evaluate((el) => el === document.activeElement));
      const after = await sentence();
      report(`half-trade choice flips ${tag}`, flipped && before !== after && after.includes(`${short(ht.b1.name)} takes`), after ?? "");
      // The plates stay inside the sheet: a long pair's compare line once widened its column and
      // pushed the plates past a phone's edge. Every card's fate line is read against the dialog.
      const inside = await htDialog.evaluate((d) => {
        const box = d.getBoundingClientRect();
        return [...d.querySelectorAll('[data-testid="half-trade-fates"] > span')]
          .every((el) => { const r = el.getBoundingClientRect(); return r.left >= box.left && r.right <= box.right; });
      });
      report(`half-trade plates inside the sheet ${tag}`, inside, "every fate line within the dialog");
      // PROBE_SHOT=<dir> photographs the half-trade's confirm, which no contact-sheet row can reach
      // (it needs this run's pair sentinel).
      if (process.env.PROBE_SHOT) await page.screenshot({ path: `${process.env.PROBE_SHOT}/half-trade-confirm-${width.label}.png` });
      if (width.label === 390) {
        // Written once, at the phone width, with the second choice: B1 stays, A1 leaves.
        await htDialog.getByRole("button", { name: /^Make .* commanders$/ }).click();
        await htDialog.waitFor({ state: "hidden", timeout: 30_000 });
        const [live] = await sql`select commander_oracle_id as c, partner_oracle_id as p from decks where id = ${ht.deckId}`;
        const body = (await sql`select oracle_id from deck_cards where deck_id = ${ht.deckId}`).map((r) => r.oracle_id);
        report("half-trade write: the new pair leads", [live.c, live.p].sort().join() === [ht.a2.oracle_id, ht.b2.oracle_id].sort().join(), `${live.c} + ${live.p}`);
        report("half-trade write: the chosen half took the slot", body.includes(ht.b1.oracle_id) && !body.includes(ht.b2.oracle_id) && !body.includes(ht.a1.oracle_id),
          `body: ${body.length} card(s)`);
      } else {
        await page.keyboard.press("Escape");
        await htDialog.waitFor({ state: "hidden" });
      }
    }
    // The outcome on the review page: the note names both fates, the columns' notes and rows, and
    // the footer counts 1 back in the pool.
    await page.goto(`${BASE}/decks/${ht.deckId}/changes`, { waitUntil: "domcontentloaded" });
    const htSection = onPage(page, '[data-testid="review-commander"]');
    await htSection.waitFor({ state: "visible", timeout: 30_000 });
    const htNote = (await htSection.textContent()) ?? "";
    if (process.env.PROBE_SHOT) await page.screenshot({ path: `${process.env.PROBE_SHOT}/half-trade-review-1300.png` });
    report("half-trade review note", htNote.includes("trade places ·") && htNote.includes(`${short(ht.a1.name)} goes back in the pool`), htNote.slice(0, 160));
    // `Going out` holds only B2, leaving for the command zone, so its note says that, not the pool's.
    const htColumns = (await onPage(page, "#review").textContent()) ?? "";
    report("half-trade going-out note", htColumns.includes("it moves to the command zone"), htColumns.slice(0, 160));
    // The old commander moving into the 98 keeps the copy it led with: no buy tag on its row, even
    // though the fixture's collection does not hold it.
    // Read on the row itself (the one carrying a command-zone hint in Coming in), for any buy tag:
    // priced, unpriced (`buy` alone) or sold out.
    const returningRow = await onPage(page, "#review").evaluate((el) => {
      const hint = el.querySelector('[data-zone-hint="in"]');
      let row = hint;
      while (row && row.parentElement && !row.parentElement.matches("ul, ol, section, #review")) row = row.parentElement;
      return row?.textContent ?? null;
    });
    report("half-trade: the returning commander buys nothing", returningRow !== null && !/buy/i.test(returningRow), returningRow ?? "no row");
    // The footer counts the one released commander back in the pool.
    const footer = (await onPage(page, "#review").evaluate((el) => el.closest("main")?.textContent ?? "")) ?? "";
    report("half-trade: 1 back in the pool", /1 back in the pool/.test(footer), "footer");
  } finally {
    // Each step on its own, so one failing cannot skip the next.
    for (const id of made) await sql`delete from decks where id = ${id}`.catch((e) => { failures += 1; console.error(e); });
    if (pairSentinel) {
      await sql`delete from commander_pair_support where commander_oracle_id = ${pairSentinel.a} and partner_oracle_id = ${pairSentinel.b}`
        .catch((e) => { failures += 1; console.error(e); });
    }
    if (restorePrefs) await restorePrefs().catch((e) => { failures += 1; console.error(e); });
    await browser.close();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
