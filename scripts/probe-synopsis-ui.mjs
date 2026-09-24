// The Analysis tab's Overview, measured in a real browser at 1300x900 and 390x844.
//
// WHY A BROWSER. Its rulings are layout, and one grid restyled at `md:` leaves identical markup
// whichever way it lays out: the overview heads the left column at 1300 with the climb under it
// and the box spanning both rows beside them, and leads the tab on the phone, box then climb
// after it. It is ONE mount, so the probe counts visible copies rather than trusting the markup.
// The modal is 700px wide at 1300, and a card named in it previews ABOVE the sheet, which is a
// stacking fact jsdom has no model of.
//
// IT REACHES EVERYTHING BY A PRESS: Analysis is client state with no address, the reading comes
// from pressing Analyze, and the overview from pressing `Write one` — the Overview's own control
// (ruling A). So the deck must have NO overview when the run starts; it picks the first deck on
// the account that has none, and fails when none of the first twelve qualifies.
//
// THE MODEL IS THE STUB, and the probe asserts it: the row it wrote must say `model = 'stub'`. A
// server started with `SYNOPSIS_LIVE=1` would spend a real call here, and a run that did so is
// reported as a failure rather than a pass. Start the server without it.
//
// WRITES, all undone in the `finally`: the walked deck's `deck_profiles` row is held on disk and
// put back (`profile-hold.mjs`); the overview it writes and the ledger row that paid for it are
// deleted, so a run neither leaves an overview behind nor spends the account's credit; the walked
// deck's cards a legality notice stands for, and any overview it already held, set aside and put
// back (held on disk first, so a killed run is repaired by the next); and the About row
// `probe:verdict-block` writes. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3010 pnpm probe:synopsis-ui
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
// The real rule, not a restatement: run under tsx so a pure module of the app can be imported.
import { offendingIds, rulesViolations } from "../src/lib/notices/rules-violations.ts";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

/**
 * The Mulligan's fixed land line (contract 6): the FIRST line of each box, in the generated lines'
 * own row, so its glyph and text start where theirs do. Measured, because a row that did not
 * compile would still read correctly as text.
 */
async function landLine(modal, label) {
  const g = await modal.evaluate((el) => {
    const fixed = [...el.querySelectorAll('[data-testid="synopsis-land-range"]')];
    return fixed.map((row) => {
      const box = row.parentElement;
      const next = row.nextElementSibling;
      const x = (e) => Math.round(e.getBoundingClientRect().left);
      return {
        text: row.lastElementChild?.textContent ?? "",
        first: row.previousElementSibling === box.firstElementChild && row.previousElementSibling.tagName === "SPAN",
        glyphX: x(row.firstElementChild), textX: x(row.lastElementChild),
        nextGlyphX: next ? x(next.firstElementChild) : null, nextTextX: next ? x(next.lastElementChild) : null,
      };
    });
  });
  report(`${label}px · the land range opens both Mulligan boxes`,
    g.length === 2 && /^\d+( to \d+)? lands?$/.test(g[0].text) && /^\d+ (or|to) \d+ lands, or \d+ or more$/.test(g[1].text) && g.every((r) => r.first),
    JSON.stringify(g.map((r) => r.text)));
  report(`${label}px · …in the generated lines' own row`,
    g.length === 2 && g.every((r) => r.nextGlyphX === null || (r.glyphX === r.nextGlyphX && r.textX === r.nextTextX)), JSON.stringify(g));
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);

const DESKTOP = { width: 1300, height: 900 };
const PHONE = { width: 390, height: 844 };

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
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
  // The About gate, cleared as `probe:verdict-block` clears it; see that file for why.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  const userId = await page.evaluate(() => window.Clerk.user.id);
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  return userId;
}

/**
 * THE FIXTURE HOLD, ON DISK. The walked deck's lifted cards, its Wastes pad and any overview it
 * already held are written here BEFORE each write that moves them, so a run killed part-way (whose
 * `finally` never runs) leaves a file the next run restores before it touches anything. Every
 * restore is idempotent, since a write the file records may never have happened.
 */
const HOLD = path.join(os.tmpdir(), "probe-synopsis-ui-hold.json");
let fixtureHold = { deckId: null, lifted: [], synopses: [], padded: null };
const saveHold = () => writeFileSync(HOLD, JSON.stringify(fixtureHold));

async function restoreHold() {
  let prior;
  try {
    prior = JSON.parse(readFileSync(HOLD, "utf8"));
  } catch {
    return;
  }
  const { deckId, lifted, synopses, padded } = prior;
  const steps = [
    ["put back the held overviews", () => synopses.length && sql`insert into deck_synopses
      select * from json_populate_recordset(null::deck_synopses, ${JSON.stringify(synopses)}::json) on conflict (id) do nothing`],
    ["take back the Wastes pad", () => padded && (padded.quantity === null
      ? sql`delete from deck_cards where deck_id = ${deckId}::uuid and oracle_id = ${padded.wastes}::uuid`
      : sql`update deck_cards set quantity = ${padded.quantity} where deck_id = ${deckId}::uuid and oracle_id = ${padded.wastes}::uuid`)],
    ["put back the lifted cards", () => lifted.length && sql`insert into deck_cards
      select * from json_populate_recordset(null::deck_cards, ${JSON.stringify(lifted)}::json) on conflict (deck_id, oracle_id) do nothing`],
  ];
  let ok = true;
  // Each on its own: one failing must not skip the rest.
  for (const [label, step] of steps) {
    try {
      await step();
    } catch (e) {
      ok = false;
      report(label, false, e.message);
    }
  }
  if (ok) rmSync(HOLD, { force: true });
}

/** The cards a legality notice stands for in this deck, by the notices' own rule. */
async function offending(deckId) {
  const rows = await sql`select x.oracle_id, x.commander_legal, x.color_identity,
      (x.oracle_id in (d.commander_oracle_id, d.partner_oracle_id)) as is_commander
    from decks d join cards x on x.oracle_id in (d.commander_oracle_id, d.partner_oracle_id)
      or x.oracle_id in (select oracle_id from deck_cards where deck_id = d.id)
    where d.id = ${deckId}::uuid`;
  const card = (r) => ({ oracleId: r.oracle_id, commanderLegal: r.commander_legal, colorIdentity: r.color_identity ?? [] });
  const ids = offendingIds(rulesViolations(rows.filter((r) => !r.is_commander).map(card), rows.filter((r) => r.is_commander).map(card)));
  return { ids, commander: rows.some((r) => r.is_commander && ids.includes(r.oracle_id)) };
}

async function deckHrefs(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...new Set([...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2])))];
  }, PAGE);
}

/** The deck page, its Analysis tab pressed. Waits for the Overview slot or the empty state. */
async function openAnalysis(page, href) {
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 });
  await page.waitForTimeout(500);
  await onPageRole(page, "tab", /analysis/i).first().click();
}

const visibleOverviews = (page) =>
  page.evaluate(() => [...document.querySelectorAll('[data-testid="synopsis-overview"]')]
    .filter((e) => e.getBoundingClientRect().width > 0).length);

/** The three cells' rects: the overview, the verdict box and the climb. */
const cells = (page) =>
  page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
    };
    return {
      overview: rect(document.querySelector('[data-testid="synopsis-overview"]')),
      box: rect(document.querySelector('[data-testid="verdict-cell"]')),
      climb: rect(document.querySelector('[data-testid="climb-cell"]')),
    };
  });

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const holds = [];
  /**
   * The runs THIS probe's presses created, each found right after its press as the first stub run
   * by this account on the walked deck since that press began, and the spent rows it inserted to
   * reach the used-up form. Cleanup deletes exactly these and nothing else: a write from anywhere
   * else during the run is not this probe's to erase.
   */
  let walked = null;
  let walkStart = null;
  let userId = null;
  /** The version this probe pinned its overview to, for 6e; unpinned in the `finally`. */
  let pinned = null;
  const ours = [];
  const fills = [];
  const nowAt = async () => (await sql`select now() as at`)[0].at;
  const claim = async (since) => {
    const taken = ours.map((r) => r.id);
    const [row] = await sql`select id, model, status, model_call_id from deck_synopses
      where deck_id = ${walked}::uuid and user_id = ${userId} and model = 'stub' and created_at >= ${since}
        and not (id = any(${taken}::uuid[]))
      order by created_at limit 1`;
    if (row) ours.push(row);
    return row ?? null;
  };
  const dropOurs = async () => {
    for (const row of ours.splice(0)) {
      await sql`delete from deck_synopses where id = ${row.id}::uuid`;
      if (row.model_call_id) await sql`delete from model_calls where id = ${row.model_call_id}::uuid`;
    }
  };
  const ledger = async () => (await sql`select count(*)::int as n from model_calls where user_id = ${userId}`)[0].n;
  const runsOn = async (deckId) => (await sql`select count(*)::int as n from deck_synopses where deck_id = ${deckId}::uuid`)[0].n;
  const noteIn = (page, scope) => onPage(page, `${scope} [data-testid="press-note"]`);
  const empty = '[data-testid="analysis-empty"]';
  const banner = '[data-testid="analysis-banner"]';
  try {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    userId = await signIn(page);
    // A run killed part-way left its hold on disk: put that deck back before choosing one.
    await restoreHold();

    // A deck with no overview at all, so the first Analyze writes one. A deck with only UNPINNED
    // overviews serves too: they are held for the run below and put back, since a pinned one would
    // lose its pin to the delete's cascade. An empty deck is still preferred.
    let href = null;
    let fallback = null;
    for (const candidate of await deckHrefs(page)) {
      const [{ n }] = await sql`select count(*)::int as n from deck_synopses where deck_id = ${candidate.split("/")[2]}::uuid`;
      // Enough distinct spells for the stub to write a WHOLE overview: a deck padded with one basic
      // gives it too few cards to name, its primer is refused, and the Mulligan (and its fixed
      // land line) never draws.
      const [{ k }] = await sql`select count(distinct c.oracle_id)::int as k from deck_cards c join cards x using (oracle_id)
        where c.deck_id = ${candidate.split("/")[2]}::uuid and x.type_line not ilike '%Land%'`;
      // And a commander no legality notice stands for: the body's offending cards are lifted below,
      // but a commander cannot be.
      // A WHOLE deck, or Analyze is refused (analysis ruling 1): 99 cards beside one commander, 98
      // beside a pair. The account holds other lanes' short fixtures too.
      const [{ whole }] = await sql`select coalesce(sum(c.quantity), 0) + 1 + (d.partner_oracle_id is not null)::int = 100 as whole
        from decks d left join deck_cards c on c.deck_id = d.id where d.id = ${candidate.split("/")[2]}::uuid group by d.id`;
      if (k < 5 || !whole || (await offending(candidate.split("/")[2])).commander) continue;
      if (n === 0) { href = candidate; break; }
      const [{ pins }] = await sql`select count(*)::int as pins from deck_version_synopses v join deck_synopses s on s.id = v.synopsis_id
        where s.deck_id = ${candidate.split("/")[2]}::uuid`;
      if (pins === 0) fallback ??= candidate;
    }
    href ??= fallback;
    if (!report("a deck with no overview, and spells enough for a whole one", href !== null, href ?? "no deck on the account qualifies")) return;
    const deckId = href.split("/")[2];
    walked = deckId;
    walkStart = await nowAt();
    holds.push(await holdProfile(sql, deckId));
    await sql`delete from deck_profiles where deck_id = ${deckId}::uuid`;
    console.log(`       (walking ${href})`);
    // With notices on, a deck holding a card a legality notice stands for withholds a new overview
    // (deck notices HANDOFF §6), and every check below would measure the refusal instead. Most
    // fixture decks carry an off-identity card, so those rows are LIFTED for the run: captured into
    // the cleanup handle BEFORE the delete, and put back in the `finally`.
    fixtureHold = { deckId, lifted: [], synopses: [], padded: null };
    fixtureHold.synopses = await sql`select * from deck_synopses where deck_id = ${deckId}::uuid`;
    saveHold();
    if (fixtureHold.synopses.length) {
      await sql`delete from deck_synopses where deck_id = ${deckId}::uuid`;
      console.log(`       (held ${fixtureHold.synopses.length} overview(s) already on the deck)`);
    }
    const { ids: illegal } = await offending(deckId);
    if (illegal.length) {
      fixtureHold.lifted = await sql`select * from deck_cards where deck_id = ${deckId}::uuid and oracle_id = any(${illegal}::uuid[])`;
      saveHold();
      await sql`delete from deck_cards where deck_id = ${deckId}::uuid and oracle_id = any(${illegal}::uuid[])`;
      // Padded back to whole with Wastes, or the press is refused (analysis ruling 1). Wastes is
      // colorless and moves no bracket or legality fact. Its standing row, if any, is captured
      // first so the `finally` restores that quantity exactly.
      const [{ oracle_id: wastes }] = await sql`select oracle_id from cards where name = 'Wastes' limit 1`;
      const [standing] = await sql`select quantity from deck_cards where deck_id = ${deckId}::uuid and oracle_id = ${wastes}::uuid`;
      fixtureHold.padded = { wastes, quantity: standing?.quantity ?? null };
      saveHold();
      const copies = fixtureHold.lifted.reduce((n, r) => n + r.quantity, 0);
      await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${wastes}::uuid, ${copies})
        on conflict (deck_id, oracle_id) do update set quantity = deck_cards.quantity + ${copies}`;
      console.log(`       (lifted ${fixtureHold.lifted.length} row(s) a legality notice stands for)`);
    }

    // Before a reading: no Overview, and no space for one (§6.2).
    await openAnalysis(page, href);
    await page.waitForTimeout(800);
    report("1300px · no overview before a reading", (await visibleOverviews(page)) === 0, `${await visibleOverviews(page)} drawn`);

    // 7a: the note beside Analyze, read BEFORE the press. A button never spends without its note.
    await noteIn(page, empty).waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    const before = await noteIn(page, empty).innerText().catch(() => "");
    report("1300px · Analyze names the credit before it is pressed", /^Also writes the overview, using a credit\./.test(before), before || "no note");
    const analyze = onPageRole(page, "button", /^Analyze$/).first();
    const described = await analyze.getAttribute("aria-describedby");
    // The description is the note's own text, on a span inside it, so the See which control the
    // check note carries is never read as part of it.
    const describedText = described === null ? null
      : await noteIn(page, empty).evaluate((note, id) => {
          const el = document.getElementById(id);
          return el && note.contains(el) ? el.textContent : null;
        }, described).catch(() => null);
    report("1300px · …and the note describes the press", describedText !== null && describedText === before, `${described} / ${describedText}`);
    const ng = await page.evaluate((scope) => {
      const b = [...document.querySelectorAll(`${scope} button`)].find((e) => e.textContent === "Analyze");
      const n = document.querySelector(`${scope} [data-testid="press-note"]`);
      if (!b || !n) return null;
      const br = b.getBoundingClientRect();
      const nr = n.getBoundingClientRect();
      return { bTop: Math.round(br.top), nTop: Math.round(nr.top), bRight: Math.round(br.right), nLeft: Math.round(nr.left) };
    }, `${PAGE} ${empty}`);
    report("1300px · …in the button's row, after it", ng !== null && ng.nLeft >= ng.bRight && Math.abs(ng.nTop - ng.bTop) <= 14, JSON.stringify(ng));

    // The press writes the overview too (synopsis PR 4), with no second press.
    let since = await nowAt();
    await analyze.click();
    await page.waitForSelector(`${PAGE} [data-testid="findings-block"]`, { timeout: 30_000 });
    const entry = onPage(page, '[data-testid="synopsis-overview"]').getByRole("button", { name: /View full overview/ });
    await entry.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    const first = await claim(since);
    report("Analyze wrote one finished run", first !== null && first.status === "done", JSON.stringify(first && { status: first.status }));
    report("the model was the stub", first !== null && first.model === "stub",
      `${first?.model ?? "none"}: restart the server without SYNOPSIS_LIVE`);
    if (!report("1300px · the overview is drawn, with its entry point", (await entry.count()) === 1, `${await entry.count()} entry points`)) return;
    const marks = await onPage(page, '[data-testid="synopsis-overview"] p').first().innerText();
    report("1300px · no raw [[mark]] reaches the reader", !marks.includes("[["), marks.slice(0, 100));

    // 1300: the overview heads the left column, the climb under it, the box beside both.
    const d = await cells(page);
    report("1300px · drawn once", (await visibleOverviews(page)) === 1, `${await visibleOverviews(page)} visible`);
    report("1300px · the overview heads the left column, over the climb",
      d.overview && d.climb && Math.abs(d.overview.left - d.climb.left) <= 1 && d.overview.bottom <= d.climb.top,
      `overview ${JSON.stringify(d.overview)}, climb ${JSON.stringify(d.climb)}`);
    report("1300px · the box sits beside it, level with its top",
      d.box && d.box.left >= d.overview.right && Math.abs(d.box.top - d.overview.top) <= 2,
      `box ${JSON.stringify(d.box)}`);
    report("1300px · the gap to the climb is the row gap, not the box's slack",
      d.climb.top - d.overview.bottom <= 40, `${d.climb.top - d.overview.bottom}px`);

    // The modal: 700 wide, four sections, and a card preview above it.
    await entry.click();
    const modal = page.locator('[data-testid="receipt-modal"]');
    await modal.waitFor({ state: "visible", timeout: 10_000 });
    const m = await modal.evaluate((el) => ({
      width: Math.round(el.getBoundingClientRect().width),
      headings: [...el.querySelectorAll("h3")].map((h) => h.textContent),
    }));
    report("1300px · the modal is 700 wide", m.width === 700, `${m.width}px`);
    await landLine(modal, "1300");
    report("1300px · four sections, in order",
      m.headings.join("|").toLowerCase() === "overview|primer|key cards|weaknesses", m.headings.join(" | "));
    const names = modal.locator('[data-testid="synopsis-card"]');
    if (report("1300px · the card names in the modal are live", (await names.count()) > 0, `${await names.count()}`)) {
      // Hover names until one previews: a card the catalog has no picture for opens no box, by
      // design, and nothing in the DOM says which names have art.
      for (let i = 0; i < Math.min(8, await names.count()); i += 1) {
        await names.nth(i).hover();
        await page.waitForTimeout(400);
        if (await page.locator('[data-testid="hover-preview"]').count()) break;
      }
      const z = await page.evaluate(() => {
        const box = document.querySelector('[data-testid="hover-preview"]');
        const sheet = document.querySelector('[data-testid="receipt-modal"]')?.closest(".fixed");
        return box ? { box: Number(getComputedStyle(box).zIndex), sheet: Number(getComputedStyle(sheet).zIndex) } : null;
      });
      report("1300px · the preview paints above the sheet", z !== null && z.box > z.sheet,
        z ? `preview z ${z.box}, sheet z ${z.sheet}` : "no preview (the card may have no art)");
    }
    await page.keyboard.press("Escape");

    // 7d, reached by a revert (finding 6): the list is the one its overview describes, but the
    // reading is marked changed, as an edit and its undo leave it. The banner shows; the press
    // returns the saved overview, so it names no cost, and pressing it spends and writes nothing.
    await sql`update deck_profiles set dirty = true where deck_id = ${deckId}::uuid`;
    await openAnalysis(page, href);
    await page.waitForSelector(`${PAGE} ${banner}`, { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    report("1300px · 7d: no note over a list that already has its overview", (await noteIn(page, banner).count()) === 0,
      `${await noteIn(page, banner).count()} notes`);
    const runsBefore = await runsOn(deckId);
    const ledgerBefore = await ledger();
    await onPage(page, banner).getByRole("button").click();
    await page.waitForSelector(`${PAGE} ${banner}`, { state: "detached", timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const runsAfter = await runsOn(deckId);
    const ledgerAfter = await ledger();
    report("…and the press writes nothing and spends nothing", runsAfter === runsBefore && ledgerAfter === ledgerBefore,
      `runs ${runsBefore} to ${runsAfter}, ledger ${ledgerBefore} to ${ledgerAfter}`);

    // Ruling A: a current reading with no overview offers Write one, with its note (7f).
    await dropOurs();
    await openAnalysis(page, href);
    const writeOne = onPage(page, '[data-testid="synopsis-overview"]').getByRole("button", { name: "Write one" });
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('[data-testid="synopsis-overview"] button')].find((e) => e.textContent === "Write one");
      return b && b.getAttribute("aria-disabled") !== "true";
    }, null, { timeout: 20_000 }).catch(() => {});
    // Read AT the moment the press enables: an enabled press with no note is a state read for the
    // reading before (the defect PR 3's probe found).
    const wnote = await onPage(page, '[data-testid="synopsis-overview"]').innerText().catch(() => "");
    report("1300px · Write one names the credit it spends", (await writeOne.count()) === 1 && /Uses a credit/.test(wnote), wnote.replace(/\s+/g, " ").slice(0, 120));
    since = await nowAt();
    await writeOne.click();
    await entry.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    report("…and writes the overview", (await claim(since)) !== null, `${ours.length} run(s) of ours`);

    // 7b, 7e, 7g: every credit out. Analyze and Re-analyze stay enabled (the bracket is free) and
    // say the overview waits; Write one is disabled. Reached by filling the ledger with rows this
    // probe owns and deletes in the `finally`.
    await dropOurs();
    const filled = await sql`insert into model_calls (user_id, feature, status)
      select ${userId}, 'synopsis', 'spent' from generate_series(1, 30) returning id`;
    fills.push(...filled.map((r) => r.id));
    await openAnalysis(page, href);
    await page.waitForTimeout(1500);
    const spentOne = onPage(page, '[data-testid="synopsis-overview"]').getByRole("button", { name: "Write one" });
    const spentAria = await spentOne.getAttribute("aria-disabled").catch(() => "none");
    report("1300px · 7g: Write one is disabled with every credit out", spentAria === "true", `aria-disabled ${spentAria}`);
    await sql`update deck_profiles set dirty = true where deck_id = ${deckId}::uuid`;
    await openAnalysis(page, href);
    await page.waitForSelector(`${PAGE} ${banner}`, { timeout: 20_000 }).catch(() => {});
    await noteIn(page, banner).waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    const used = await noteIn(page, banner).innerText().catch(() => "");
    const reOn = await onPage(page, banner).getByRole("button").getAttribute("aria-disabled");
    report("1300px · 7e: Re-analyze stays enabled and says the overview stays as it was",
      reOn !== "true" && /^Reads the bracket only; the overview stays as it was\. 0 of/.test(used), `${reOn ?? "enabled"}: ${used}`);
    await sql`delete from deck_profiles where deck_id = ${deckId}::uuid`;
    await openAnalysis(page, href);
    await noteIn(page, empty).waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    const waits = await noteIn(page, empty).innerText().catch(() => "");
    const anOn = await onPageRole(page, "button", /^Analyze$/).first().getAttribute("aria-disabled");
    report("1300px · 7b: Analyze stays enabled and says the overview waits for a credit",
      anOn !== "true" && /^Reads the bracket only; the overview waits for a credit\. 0 of/.test(waits), waits || "no note");
    await sql`delete from model_calls where id = any(${fills.splice(0)}::uuid[])`;
    await ctx.close();

    // 390: one column, overview first, then the box, then the climb.
    const phone = await browser.newContext({ viewport: PHONE });
    const p = await phone.newPage();
    await signIn(p);
    // 7a at 390: centred under the full-width button. The deck has no reading and no overview here.
    await openAnalysis(p, href);
    await noteIn(p, empty).waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    const pn = await p.evaluate((scope) => {
      const b = [...document.querySelectorAll(`${scope} button`)].find((e) => e.textContent === "Analyze");
      const n = document.querySelector(`${scope} [data-testid="press-note"]`);
      if (!b || !n) return null;
      const br = b.getBoundingClientRect();
      const nr = n.getBoundingClientRect();
      return { under: nr.top >= br.bottom, centred: Math.abs((nr.left + nr.right) / 2 - (br.left + br.right) / 2) <= 2, size: getComputedStyle(n).fontSize };
    }, `${PAGE} ${empty}`);
    report("390px · the note sits centred under the full-width Analyze, at 9.5px",
      pn !== null && pn.under && pn.centred && pn.size === "9.5px", JSON.stringify(pn));
    const since390 = await nowAt();
    await onPageRole(p, "button", /^Analyze$/).first().click();
    await onPage(p, '[data-testid="synopsis-overview"]').getByRole("button", { name: /View full overview/ })
      .waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    report("390px · Analyze writes the overview too", (await claim(since390)) !== null, `${ours.length} run(s) of ours`);
    const q = await cells(p);
    report("390px · drawn once", (await visibleOverviews(p)) === 1, `${await visibleOverviews(p)} visible`);
    report("390px · overview, then box, then climb",
      q.overview && q.box && q.climb && q.overview.bottom <= q.box.top && q.box.bottom <= q.climb.top,
      `overview ${q.overview?.top}-${q.overview?.bottom}, box ${q.box?.top}-${q.box?.bottom}, climb ${q.climb?.top}`);
    const phoneEntry = onPage(p, '[data-testid="synopsis-overview"]').getByRole("button", { name: /View full overview/ });
    const h = await phoneEntry.evaluate((el) => Math.round(el.getBoundingClientRect().height)).catch(() => 0);
    report("390px · the entry point is a 44px target", h >= 44, `${h}px`);
    await phoneEntry.click();
    const pm = p.locator('[data-testid="receipt-modal"]');
    await pm.waitFor({ state: "visible", timeout: 10_000 });
    const pw = await pm.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    report("390px · the modal takes the width", pw >= 380, `${pw}px`);
    await landLine(pm, "390");
    // The title whole, with no tolerance: an ellipsized title reads `scrollWidth` 1px over. And
    // the aside drawn ONCE, opening the body, rather than squeezing the title in the header.
    const head = await pm.evaluate((el) => {
      const h = el.querySelector("h2");
      const shown = (e) => e.getBoundingClientRect().width > 0;
      return {
        clipped: h ? h.scrollWidth > h.clientWidth : true,
        asides: [...el.querySelectorAll("span")].filter((e) => shown(e) && / · written /.test(e.textContent) && e.children.length === 0).length,
      };
    });
    report("390px · the modal's title is whole", !head.clipped, head.clipped ? "truncated" : "whole");
    report("390px · the aside is drawn once, in the body", head.asides === 1, `${head.asides} drawn`);
    await phone.close();

    // 6e: a version's overview, from its EXPANDED panel. A version is pinned only at commit, and
    // the walked deck may have no version at all, so the probe COPIES this run's overview onto the
    // deck whose version it pins: a pin whose overview came from another deck is a state no commit
    // can produce, and the sheet would name that other deck's cards. The copy joins `ours`, so the
    // `finally` deletes it and the pin goes with it (the pin cascades on its overview).
    const [target] = await sql`select v.id as "versionId", v.number, v.deck_id as "deckId" from deck_versions v
      join decks d on d.id = v.deck_id
      where d.user_id = ${userId}
        and v.number = (select max(number) from deck_versions w where w.deck_id = v.deck_id)
        and not exists (select 1 from deck_version_synopses p where p.version_id = v.id)
      -- A version with a predecessor first: its header carries stat boxes and a larger margin,
      -- which is the layout a fixed offset got wrong. A v1 is measured only when none exists.
      order by (v.number > 1) desc, v.deck_id limit 1`;
    const pinnable = ours.find((r) => r.status === "done") ?? ours[0];
    if (report("6e: a version to pin an overview to", Boolean(target && pinnable), target ? `v${target.number}` : "no deck with a version")) {
      pinned = target.versionId;
      const [copy] = await sql`insert into deck_synopses
          (deck_id, user_id, fingerprint, contract_version, model, model_call_id, status, outcome, content)
        select ${target.deckId}::uuid, user_id, fingerprint, contract_version, model, model_call_id, status, outcome, content
        from deck_synopses where id = ${pinnable.id}::uuid
        returning id, model, status`;
      // First in `ours`, and with no call of its own: it borrows the original's ledger row, so it
      // has to be deleted before `dropOurs` deletes that row with the original.
      ours.unshift({ ...copy, model_call_id: null });
      await sql`insert into deck_version_synopses (version_id, synopsis_id) values (${target.versionId}::uuid, ${copy.id}::uuid)`;
      for (const [label, viewport] of [["1300", DESKTOP], ["390", PHONE]]) {
        const vctx = await browser.newContext({ viewport });
        const v = await vctx.newPage();
        await signIn(v);
        await v.goto(`${BASE}/decks/${target.deckId}`, { waitUntil: "domcontentloaded" });
        await v.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 });
        await v.waitForTimeout(500);
        await onPageRole(v, "tab", /versions/i).first().click();
        const row = onPage(v, 'button[aria-expanded="false"]').first();
        await row.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
        // The link draws only after a server read, so a count taken at once would read 0 on a
        // build that drew it on the collapsed row. Wait out a round trip first.
        await v.waitForTimeout(2500);
        const collapsed = await onPage(v, '[data-testid="synopsis-version-link"]').count();
        report(`${label}px · 6e: no link on the collapsed row`, collapsed === 0, `${collapsed} drawn`);
        await row.click();
        const link = onPage(v, '[data-testid="synopsis-version-link"]');
        await link.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
        const g = await v.evaluate(() => {
          const l = document.querySelector('[data-testid="synopsis-version-link"]');
          const panel = l?.closest('[id]');
          const r = document.querySelector('button[aria-expanded="true"]');
          if (!l || !panel || !r) return null;
          const lr = l.getBoundingClientRect();
          const pr = panel.getBoundingClientRect();
          // The note on desktop is the panel header's paragraph; on the phone, the row's own.
          const note = [...panel.querySelectorAll("h3 + p")].find((e) => e.getBoundingClientRect().width > 0);
          const nr = note?.getBoundingClientRect();
          return {
            height: Math.round(lr.height),
            belowNote: nr ? Math.round(lr.top - nr.bottom) : null,
            belowRow: Math.round(lr.top - r.getBoundingClientRect().bottom),
            firstInPanel: Math.round(lr.top - pr.top),
          };
        });
        if (label === "1300") {
          report("1300px · 6e: the link sits 10px under the panel's note", g !== null && g.belowNote !== null && Math.abs(g.belowNote - 10) <= 1,
            JSON.stringify(g));
        } else {
          report("390px · 6e: the link opens the panel, directly under the row, as a 44px target",
            g !== null && g.height >= 44 && g.firstInPanel <= 2 && g.belowRow >= 0 && g.belowRow <= 12, JSON.stringify(g));
        }
        await link.click();
        const vm = v.locator('[data-testid="receipt-modal"]');
        await vm.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
        const body = await vm.innerText().catch(() => "");
        const writes = await vm.getByRole("button", { name: /Write|Try again|Re-analyze/ }).count();
        report(`${label}px · 6e: the version's sheet opens with its record line and no write control`,
          /Written for version \d+ when it was committed\./.test(body) && writes === 0, `record ${/Written for version/.test(body)}, writes ${writes}`);
        await vctx.close();
      }
    }
  } finally {
    // The overview this run's press wrote, and the credit it spent, so a run leaves neither
    // behind. Found again here rather than trusted from the walk, so a write that landed after a
    // check failed is cleared too.
    if (pinned) await sql`delete from deck_version_synopses where version_id = ${pinned}::uuid`.catch((e) => report("unpin the version", false, e.message));
    // A press whose check failed may have written after the walk last looked: claim it too.
    if (walked) while (await claim(walkStart).catch(() => null));
    await dropOurs().catch((e) => report("delete the written overviews", false, e.message));
    if (fills.length) await sql`delete from model_calls where id = any(${fills}::uuid[])`.catch((e) => report("delete the filled ledger", false, e.message));
    await restoreHold();
    for (const restore of holds) await restore().catch((e) => report("put back the analysis", false, e.message));
    await browser.close();
  }
}

// A throw is a failure the report must SAY: with the climb laid over the overview the press is
// intercepted and Playwright times out, and that run has to read as failed rather than as a crash.
await run().catch((e) => report("the walk completed", false, e.message.split("\n")[0]));
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
