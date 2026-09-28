// Suggested changes on the Analysis tab, measured in a real browser at 1300x900 and 390x844.
//
// Every ruling here is a fact about laid-out geometry or about which of two responsive copies is
// DRAWN, and jsdom lays nothing out: a class that did not compile leaves identical markup.
//
// WHAT IT PROVES, per width:
//  - The panel mounts on the Analysis tab, LAST, below the mix (placement addendum v2): its top
//    sits under the mix strip's bottom. Reached by PRESSING the tab, since the tab has no address.
//  - Never run: the heading at 19px desktop / 17px phone in the display face. The manifest is a
//    DISCLOSURE, never a control (manifest-affordance addendum, Hugh 2026-09-28): every read row is
//    a ruled line at least 32px desktop / 36px phone, with no fill and no top or side border, a
//    default cursor, nothing that changes under the pointer, and a PRESS on it changes nothing.
//  - No games (a second deck, found by query, and the run FAILS when there is none): the dashed
//    row's `Log a game →`, the manifest's only target, measures exactly 44px on the phone and at
//    least 38px on desktop. `py-[12px]` put back reads 43px and fails.
//  - Results, from a fixture set: one card per item; the FULL rationale drawn on desktop and the
//    SHORT one on the phone, each hidden at the other width; the thumbnails 22x31 at both widths;
//    the bracket flag drawn with its chip; the primary 44px tall on a phone; and nothing wider
//    than the viewport at 390.
//
// THE FIXTURE IS A STORED SET, never a model call. It writes one refunded `model_calls` row (a
// refunded unit counts against nothing), one ok `deck_suggestion_runs` row and two items on a
// deck the probe account owns and has analyzed, and deletes the run and the call in a `finally`
// (the items cascade). It first requires the deck to hold NO runs, so the cleanup never touches
// a set the account made. The ok run's `read_version` is the deck's newest version, so the set
// reads as current rather than retired.
//
// Needs a server with ANALYSIS_TAB_ENABLED=true. Signs in through Clerk's dev instance. Point it
// at `local-dev`, NEVER production.
//
//   PROBE_BASE=http://localhost:3047 node scripts/probe-tuning-panel.mjs
//   PROBE_SHOTS=<dir> also saves the panel at each width and phase.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole, PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);

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
}

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, desktop: true },
  { label: 390, viewport: { width: 390, height: 844 }, desktop: false },
];

/** The account's decks that carry a stored reading and no tuning runs, by asking the page for
 *  the decks and the database for which of them qualify. */
async function findDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`${PAGE} a[href^='/decks/']`, { timeout: 20_000 }).catch(() => {});
  const ids = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href").split("/")[2])
      .filter((id) => /^[0-9a-f-]{36}$/.test(id));
  }, PAGE);
  if (ids.length === 0) return null;
  const rows = await sql`
    select d.id, d.user_id from decks d
    join deck_profiles p on p.deck_id = d.id
    where d.id = any(${ids}::uuid[])
      and not exists (select 1 from deck_suggestion_runs r where r.deck_id = d.id)
    order by d.id limit 1`;
  return rows[0] ?? null;
}

/** A deck of the account's with a stored reading, no runs and no games: the one state that draws
 *  the dashed row with its `Log a game →` button. */
async function findNoGamesDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`${PAGE} a[href^='/decks/']`, { timeout: 20_000 }).catch(() => {});
  const ids = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href").split("/")[2])
      .filter((id) => /^[0-9a-f-]{36}$/.test(id));
  }, PAGE);
  if (ids.length === 0) return null;
  const rows = await sql`
    select d.id from decks d
    join deck_profiles p on p.deck_id = d.id
    where d.id = any(${ids}::uuid[])
      and not exists (select 1 from deck_suggestion_runs r where r.deck_id = d.id)
      and not exists (select 1 from deck_games g where g.deck_id = d.id)
    order by d.id limit 1`;
  return rows[0] ?? null;
}

// The handle is the CALLER's and is filled before each write it covers, so a throw part-way
// through still leaves `finally` holding everything that was written.
async function writeFixture(deck, handle) {
  const cuts = await sql`
    select dc.oracle_id, c.name from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = ${deck.id}
    -- Spells first. A fixture deck may be one Wastes row padding a commander, and then both items
    -- cut it: the panel draws what is stored, and never re-validates a stored set.
    order by (c.type_line like '%Land%'), c.name limit 2`;
  const adds = await sql`
    select c.oracle_id, c.name from cards c
    where c.image_uri is not null and c.type_line like '%Artifact%'
      and not exists (select 1 from deck_cards dc where dc.deck_id = ${deck.id} and dc.oracle_id = c.oracle_id)
    order by c.name limit 2`;
  if (cuts.length < 1 || adds.length < 2) throw new Error("fixture: the deck has too few cards to cut");
  const [call] = await sql`
    insert into model_calls (user_id, feature, status) values (${deck.user_id}, 'tuning', 'refunded') returning id`;
  handle.callId = call.id;
  const [{ v }] = await sql`select max(number) as v from deck_versions where deck_id = ${deck.id}`;
  // A flag the reading does NOT already hold, from the sets a verdict can actually produce: the
  // chip refuses any other, and a flag equal to the reading is correctly drawn as no flag.
  const [{ permits }] = await sql`select permits from deck_profiles where deck_id = ${deck.id}`;
  const flag = JSON.stringify(permits) === "[4,5]" ? [2] : [4, 5];
  const [run] = await sql`
    insert into deck_suggestion_runs (deck_id, user_id, input_fingerprint, model, prompt_version, profile_version, model_call_id, status, read_version)
    values (${deck.id}, ${deck.user_id}, 'probe-fixture', 'probe', 0, 0, ${call.id}, 'ok', ${v})
    returning id`;
  handle.runId = run.id;
  const long = "Cards in hand was marked against you in 7 of 9 games, and this list draws 4 of the 10 cards a deck like it runs. This swap trades a one-shot for a card that keeps drawing across the game.";
  const evidence = JSON.stringify([
    { kind: "games", value: "cards in hand 7 of 9 games" },
    { kind: "mix", value: "draw 4 of 10" },
  ]);
  await sql`
    insert into deck_suggestion_items (run_id, add_oracle_id, cut_oracle_id, rationale, rationale_short, evidence, position, bracket_after)
    values
      (${run.id}, ${adds[0].oracle_id}, ${cuts[0].oracle_id}, ${long}, 'Draws steadily instead of once.', ${evidence}::jsonb, 0, null),
      (${run.id}, ${adds[1].oracle_id}, ${cuts[cuts.length - 1].oracle_id}, ${long}, 'A second engine, and a bracket move.', ${evidence}::jsonb, 1, ${flag}::int[])`;
}

async function removeFixture(handle) {
  if (handle.runId) await sql`delete from deck_suggestion_runs where id = ${handle.runId}`.catch((e) => console.error("cleanup run:", e));
  if (handle.callId) await sql`delete from model_calls where id = ${handle.callId}`.catch((e) => console.error("cleanup call:", e));
}

async function openAnalysis(page, deckId) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const tab = onPageRole(page, "tab", /analysis/i).first();
  await tab.waitFor({ timeout: 30_000 });
  await tab.click();
  await onPageRole(page, "heading", "Suggested changes").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(400);
}

/** Geometry of the panel and its parts, read from what is drawn. */
const measure = (page) =>
  page.evaluate((scope) => {
    const root = document.querySelector(scope);
    const drawn = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const section = root.querySelector('section[aria-labelledby="tuning-heading"]');
    const heading = root.querySelector("#tuning-heading");
    const strip = [...root.querySelectorAll('section[aria-label="Recommended mix"]')].find(drawn);
    const rows = [...(section?.querySelectorAll('[data-testid="manifest-row"][data-kind="read"]') ?? [])].map((el) => {
      const cs = getComputedStyle(el);
      const clear = (c) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
      return {
        ...box(el),
        fill: !clear(cs.backgroundColor),
        sides: [cs.borderTopWidth, cs.borderLeftWidth, cs.borderRightWidth].some((w) => parseFloat(w) > 0),
        cursor: cs.cursor,
      };
    });
    const logGame = [...(section?.querySelectorAll('[data-testid="manifest-row"][data-kind="no-games"] button') ?? [])].find(drawn);
    const cards = [...(section?.querySelectorAll("article") ?? [])];
    const paragraphs = cards.flatMap((c) => [...c.querySelectorAll("p")]);
    const primary = [...(section?.querySelectorAll("button") ?? [])].find((b) => /^Suggest/.test(b.textContent.trim()));
    const thumbs = cards.flatMap((c) => [...c.querySelectorAll('button[aria-hidden="true"]')]).filter(drawn).map(box);
    return {
      section: section ? box(section) : null,
      strip: strip ? box(strip) : null,
      heading: heading ? { size: getComputedStyle(heading).fontSize, family: getComputedStyle(heading).fontFamily } : null,
      rows,
      logGame: logGame ? box(logGame) : null,
      cards: cards.length,
      drawnReasons: paragraphs.filter(drawn).map((p) => p.textContent.length),
      flags: cards.filter((c) => c.querySelector('[data-testid="bracket-flag"]')).length,
      primary: primary && drawn(primary) ? box(primary) : null,
      thumbs,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  }, PAGE);

async function walk(page, deck, width, phase) {
  await page.setViewportSize(width.viewport);
  await openAnalysis(page, deck.id);
  const m = await measure(page);
  const tag = `${width.label} ${phase}`;
  // PROBE_SHOTS=<dir> saves the panel at each width and phase, for the design review.
  if (process.env.PROBE_SHOTS) {
    await page
      .locator('section[aria-labelledby="tuning-heading"]')
      .screenshot({ path: `${process.env.PROBE_SHOTS}/tuning-${width.label}-${phase.replace(" ", "-")}.png` })
      .catch((e) => console.error("shot:", e.message));
  }
  if (!report(`${tag}: the panel mounts`, m.section !== null, m.section ? `at ${m.section.top}px` : "no section")) return;
  report(`${tag}: below the mix`, m.strip !== null && m.section.top >= m.strip.bottom, `mix ends ${m.strip?.bottom}px, panel starts ${m.section.top}px`);
  const size = width.desktop ? "19px" : "17px";
  report(`${tag}: heading ${size}`, m.heading?.size === size, `read ${m.heading?.size}`);
  report(`${tag}: nothing past the viewport`, m.overflow <= 0, `${m.overflow}px over`);
  if (phase === "no games") {
    const want = width.desktop ? "at least 38px" : "exactly 44px";
    const ok = m.logGame !== null && (width.desktop ? m.logGame.h >= 38 : m.logGame.h === 44);
    report(`${tag}: Log a game is ${want}`, ok, m.logGame ? `read ${m.logGame.h}px` : "no Log a game button drawn");
  } else if (phase === "never run") {
    const floor = width.desktop ? 32 : 36;
    report(`${tag}: read rows at least ${floor}px`, m.rows.length > 0 && m.rows.every((r) => r.h >= floor), `rows ${m.rows.map((r) => r.h).join(", ") || "none"}`);
    report(`${tag}: no read row has a fill`, m.rows.length > 0 && m.rows.every((r) => !r.fill), `${m.rows.filter((r) => r.fill).length} filled`);
    report(`${tag}: no read row has a top or side border`, m.rows.length > 0 && m.rows.every((r) => !r.sides), `${m.rows.filter((r) => r.sides).length} bordered`);
    report(`${tag}: no read row takes a pointer cursor`, m.rows.length > 0 && m.rows.every((r) => r.cursor !== "pointer"), m.rows.map((r) => r.cursor).join(", "));
    await pressNothing(page, tag);
  } else {
    report(`${tag}: one card per item`, m.cards === 2, `${m.cards} cards`);
    // The fixture's full reason is 190 characters and its short ones under 40: which is DRAWN
    // says which copy the width shows, since both are in the DOM at every width.
    const wantLong = width.desktop;
    const ok = m.drawnReasons.length === 2 && m.drawnReasons.every((n) => (wantLong ? n > 100 : n < 60));
    report(`${tag}: the ${wantLong ? "full" : "short"} reason is the one drawn`, ok, `drawn lengths ${m.drawnReasons.join(", ")}`);
    report(`${tag}: thumbnails 22x31`, m.thumbs.length === 4 && m.thumbs.every((t) => t.w === 22 && t.h === 31), `${m.thumbs.map((t) => `${t.w}x${t.h}`).join(" ")}`);
    report(`${tag}: the bracket flag on the card that moves it`, m.flags === 1, `${m.flags} flags`);
    if (!width.desktop) report(`${tag}: primary 44px`, m.primary?.h === 44, `read ${m.primary?.h}`);
  }
}

/** Hover a read row and then press it: neither may change what the panel draws, the address, or
 *  open anything. Read off the panel's markup and each row's computed ink and fill. */
async function pressNothing(page, tag) {
  const row = page.locator(`${PAGE} section[aria-labelledby="tuning-heading"] [data-testid="manifest-row"][data-kind="read"]`).first();
  const snap = () =>
    page.evaluate((scope) => {
      const section = document.querySelector(scope)?.querySelector('section[aria-labelledby="tuning-heading"]');
      const row = section?.querySelector('[data-testid="manifest-row"][data-kind="read"]');
      const cs = row ? getComputedStyle(row) : null;
      return {
        html: section?.innerHTML ?? "",
        ink: cs ? `${cs.backgroundColor} ${cs.color} ${cs.textDecorationLine} ${cs.opacity}` : "",
        url: location.href,
        dialogs: document.querySelectorAll('[role="dialog"]').length,
      };
    }, PAGE);
  await page.mouse.move(0, 0);
  const before = await snap();
  await row.hover();
  await page.waitForTimeout(250);
  const hovered = await snap();
  report(`${tag}: a read row does not change under the pointer`, hovered.ink === before.ink, `before "${before.ink}", hovered "${hovered.ink}"`);
  await row.click({ force: true });
  await page.waitForTimeout(400);
  const pressed = await snap();
  const same = pressed.html === before.html && pressed.url === before.url && pressed.dialogs === before.dialogs;
  report(`${tag}: pressing a read row changes nothing`, same, same ? "panel, address and dialogs unchanged" : "something moved");
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const handle = { callId: null, runId: null };
  try {
    const page = await (await browser.newContext({ viewport: WIDTHS[0].viewport })).newPage();
    await signIn(page);
    const deck = await findDeck(page);
    if (!report("an analyzed deck with no runs", deck !== null, deck ? deck.id : "none among the account's decks")) return;
    for (const width of WIDTHS) await walk(page, deck, width, "never run");
    const noGames = await findNoGamesDeck(page);
    if (report("an analyzed deck with no games and no runs", noGames !== null, noGames ? noGames.id : "none among the account's decks")) {
      for (const width of WIDTHS) await walk(page, noGames, width, "no games");
    }
    await writeFixture(deck, handle);
    for (const width of WIDTHS) await walk(page, deck, width, "results");
  } finally {
    await removeFixture(handle);
    await browser.close();
  }
}

await run().catch((error) => {
  console.error(error);
  failures += 1;
});
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
