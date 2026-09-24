// probe:notices-tile — the deck tile's new footer and its notice, in a real browser at 1600x900,
// 1300x900, 1000x900 and 390x844 (deck notices plan PR 5; HANDOFF §1a with readiness F5, F6, F7, F14, H5, H6).
//
// Every ruling here is a fact about laid-out geometry or resolved style, which jsdom has neither of:
//   - the footer is three FIXED rows, 92px below `md` and 94 from it, on every tile at or above the
//     330px band floor, so tiles in a row end level whatever they carry;
//   - the chips row never wraps there (its height is the chip's) and never overflows its box;
//   - the one yield: a range beside a notice draws marks only between 330 and the width that holds
//     the widest pill, the widest range and `Not legal`. That width is MEASURED here, from the
//     widest forms the code produces (`Unresolved`, `Exhibition or Core`), and asserted against
//     the threshold the tile ships, rather than trusted from the handoff's 366 (readiness F6);
//   - the count slot holds `100 / 99` at its own size (F7), and the bar is one length on every tile
//     of one width;
//   - `Not legal` reads in `--fg` with its red on the hairline (H5), and each notice is named in the
//     tile link.
//
// Its fixture is BUILT on local-dev, because no account carries these states by accident: a banned
// card sleeved into a deck with an unanswered range reading, a planted Game Changer entry touching a
// deck with a single-mark reading, and a banned card in a deck with no reading. Every write is held
// ON DISK before it is made, and the next run puts back whatever a killed run left. It refuses
// staging and production. Point it at local-dev.
//
//   PROBE_BASE=http://localhost:3210 pnpm probe:notices-tile
//   PROBE_EXPECT_OFF=1 …   against a server with NOTICES_ENABLED off: asserts no tile draws a notice
//   PROBE_KEEP=1 …   leaves the fixture for `docs/superpowers/inventories/deck-notices-tile.json`
//
// Mutations run against it are listed in the PR that added it.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const sql = neon(DATABASE_URL);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

/** The yield's band, READ from the tile's shipped classes (`deck-card.tsx`, `YIELD`), so a changed
 *  threshold is measured rather than compared with a copy of itself. */
const SHIPPED = readFileSync(new URL("../src/components/decks/deck-card.tsx", import.meta.url), "utf8");
const band = (key) => {
  const m = SHIPPED.match(new RegExp(`${key}: \\{ faced: "@min-\\[(\\d+)px\\]:@max-\\[(\\d+)px\\]:hidden"`));
  if (!m) throw new Error(`deck-card.tsx has no ${key} yield band`);
  return [Number(m[1]), Number(m[2])];
};
const [FLOOR, YIELD_TO] = band("notLegal");
const [DATA_FLOOR, YIELD_DATA_TO] = band("data");
if (DATA_FLOOR !== FLOOR) throw new Error("the two yield bands no longer share a floor");

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};

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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
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

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

async function refuseSharedDatabase() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH || process.env.VERCEL_ENV === "production") {
    throw new Error(`probe:notices-tile writes deck cards and log entries and refuses branch ${branch ?? "(unknown)"}.`);
  }
}

// What the run wrote, held ON DISK before each write, so a run killed before its `finally` is put
// right by the next one.
const HOLD = path.join(os.tmpdir(), "the99-probe-notices-tile-hold.json");
const held = { cards: [], seqs: [] };
const hold = () => writeFileSync(HOLD, JSON.stringify(held));
/** The mark on every log entry this probe plants (`detail.probe`), which the cleanup finds by. */
const PROBE_MARK = "notices-tile";
/** `PROBE_EXPECT_OFF=1`: the server runs with `NOTICES_ENABLED` off, and the fixture must draw
 *  NO notice. The layout checks still run; the notice's own checks are replaced by that one. */
const EXPECT_OFF = process.env.PROBE_EXPECT_OFF === "1";

async function restoreHeld() {
  // Every entry this probe ever planted carries its MARK, so an entry whose seq never reached the
  // hold file (a run killed between the insert and the write), or a run with no hold file at all,
  // is still found and removed.
  try {
    await sql`delete from deck_data_changes where detail->>'probe' = ${PROBE_MARK}`;
  } catch (error) {
    failures += 1;
    console.error("RESTORE FAILED: marked log entries are still there", error);
  }
  let prior;
  try {
    prior = JSON.parse(readFileSync(HOLD, "utf8"));
  } catch {
    return;
  }
  let ok = true;
  for (const c of prior.cards) {
    try {
      await sql`delete from deck_cards where deck_id = ${c.deckId}::uuid and oracle_id = ${c.oracleId}::uuid`;
    } catch (error) {
      ok = false;
      failures += 1;
      console.error(`RESTORE FAILED: deck_cards row ${c.deckId} / ${c.oracleId} is still there`, error);
    }
  }
  if (prior.seqs.length > 0) {
    try {
      await sql`delete from deck_data_changes where seq = any(${prior.seqs}::bigint[])`;
    } catch (error) {
      ok = false;
      failures += 1;
      console.error(`RESTORE FAILED: log entries ${prior.seqs.join(", ")} are still there`, error);
    }
  }
  if (ok) rmSync(HOLD, { force: true });
}

async function sleeve(deckId, oracleId) {
  held.cards.push({ deckId, oracleId });
  hold();
  await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${oracleId}::uuid, 1)`;
}

/**
 * Three decks, each carrying one state: an unanswered RANGE reading with a banned card (the widest
 * row, and the yield), a SINGLE-mark reading touched by a planted Game Changer entry (`● 1`), and a
 * deck with NO reading holding a banned card (`Not legal` in the chip's slot).
 */
async function buildFixtures(userId) {
  const [range] = await sql`
    select d.id, d.name from decks d join deck_profiles p on p.deck_id = d.id
    where d.user_id = ${userId} and cardinality(p.permits) = 2
      and (d.declared_bracket is null or not (d.declared_bracket = any(p.permits)))
    order by d.id limit 1`;
  const [data] = await sql`
    select d.id, d.name, p.analyzed_oracle_ids from decks d join deck_profiles p on p.deck_id = d.id
    where d.user_id = ${userId} and cardinality(p.permits) = 1 and cardinality(p.analyzed_oracle_ids) > 0
    order by d.id limit 1`;
  const [bare] = await sql`
    select d.id, d.name from decks d left join deck_profiles p on p.deck_id = d.id
    where d.user_id = ${userId} and p.deck_id is null
    order by d.id limit 1`;
  if (!range || !data || !bare) return null;
  const banned = async (deckId) => (await sql`
    select c.oracle_id from cards c
    where not c.commander_legal
      and not exists (select 1 from deck_cards dc where dc.deck_id = ${deckId}::uuid and dc.oracle_id = c.oracle_id)
    order by c.oracle_id limit 1`)[0]?.oracle_id;
  const rangeBan = await banned(range.id);
  const bareBan = await banned(bare.id);
  if (!rangeBan || !bareBan) return null;
  await sleeve(range.id, rangeBan);
  await sleeve(bare.id, bareBan);
  // One planted entry on a card the single-mark reading analyzed. It is past that reading's mark and
  // past its read mark by construction: the log head moves forward.
  const [{ seq }] = await sql`
    insert into deck_data_changes (kind, direction, oracle_ids, detail)
    values ('gameChanger', 'added', array[${data.analyzed_oracle_ids[0]}]::uuid[], ${JSON.stringify({ probe: PROBE_MARK })}::jsonb)
    returning seq`;
  held.seqs.push(Number(seq));
  hold();
  return { range, data, bare };
}

/** Every tile on the page: its box, the footer's rows, the chips row's fit and the notice. */
const READ_TILES = (main) => [...main.querySelectorAll("article")].filter((a) => a.querySelector(".deck-card-footer")).map((a) => {
  const footer = a.querySelector(".deck-card-footer");
  const chips = a.querySelector("[data-deck-chips]");
  const tag = a.querySelector("[data-notice-tag]");
  const count = a.querySelector("[data-deck-count]");
  const bar = a.querySelector("[data-deck-bar]");
  const shown = [...a.querySelectorAll("[data-testid='bracket-chip']")].filter((c) => c.getBoundingClientRect().width > 0);
  const link = a.querySelector("a[href^='/decks/']");
  return {
    href: link?.getAttribute("href"),
    name: link?.getAttribute("aria-label") ?? "",
    width: a.clientWidth,
    top: Math.round(a.getBoundingClientRect().top),
    footer: footer.clientHeight,
    chipsHeight: chips.getBoundingClientRect().height,
    chipsFits: chips.scrollWidth <= chips.clientWidth,
    wrap: getComputedStyle(chips).flexWrap,
    faces: shown.map((c) => c.textContent.trim().length > 0),
    tag: tag && { kind: tag.dataset.noticeTag, text: tag.textContent, color: getComputedStyle(tag).color,
      edge: getComputedStyle(tag).borderTopColor, dot: !!tag.querySelector("[data-notice-dot]"),
      // Against every DRAWN box in the row, never the previous sibling: the yield's twin wrappers
      // are `display: contents` or `none` and report an empty rect, which every build passes.
      afterChip: (() => {
        // Below the floor the row wraps, so "after" is to the left on the tag's line or on a line above.
        const t = tag.getBoundingClientRect();
        const drawn = [...chips.querySelectorAll(":scope > *, [data-testid='bracket-chip']")]
          .filter((e) => e !== tag && !tag.contains(e) && e.getBoundingClientRect().width > 0);
        return drawn.length > 0 && drawn.every((e) => {
          const r = e.getBoundingClientRect();
          return r.bottom <= t.top + 0.5 || r.right <= t.left + 0.5;
        });
      })() },
    // `--fg` RESOLVED to the colour a computed style reports, on a throwaway node in this tile.
    fg: (() => { const n = document.createElement("span"); n.style.color = "var(--fg)"; a.appendChild(n); const c = getComputedStyle(n).color; n.remove(); return c; })(),
    countWidth: count.getBoundingClientRect().width,
    bar: bar.getBoundingClientRect().width,
  };
});

/**
 * The width a chips row NEEDS in its widest forms, measured from the tile's own nodes: the pill
 * set to `Unresolved`, the range chip to `Exhibition or Core`, and the tag as it is. The clone is
 * laid out at max-content off-screen, in the tile, so it takes the tile's own type at this width.
 */
const MEASURE_WORST = (article, dataTagHtml) => {
  const row = article.querySelector("[data-deck-chips]");
  const measure = (faced, tagHtml = null) => {
    const clone = row.cloneNode(true);
    clone.style.cssText = "position:absolute;left:-9999px;top:0;width:max-content;flex-wrap:nowrap;height:auto";
    const pill = clone.firstElementChild;
    pill.textContent = "Unresolved";
    const chips = [...clone.querySelectorAll("[data-testid='bracket-chip']")];
    const faceChip = chips.find((c) => c.textContent.trim().length > 0);
    if (faceChip) faceChip.lastElementChild.textContent = "Exhibition or Core";
    // Keep only the form being measured, and show it: the twin is hidden by its container class.
    for (const c of chips) {
      const wrap = c.parentElement.dataset.deckChips === undefined ? c.parentElement : c;
      if ((c === faceChip) !== faced) wrap.remove();
      else if (wrap !== c) wrap.style.display = "contents";
    }
    if (tagHtml) {
      // The data form in the legality tag's place: the data fixture's own tag, at its widest count.
      const tag = clone.querySelector("[data-notice-tag]");
      tag.insertAdjacentHTML("afterend", tagHtml);
      tag.remove();
      const data = clone.querySelector("[data-notice-tag]");
      data.lastChild.textContent = "99";
    }
    article.appendChild(clone);
    const width = clone.getBoundingClientRect().width;
    clone.remove();
    return width;
  };
  const count = article.querySelector("[data-deck-count]");
  const c2 = count.cloneNode(true);
  c2.textContent = "100 / 99";
  c2.style.cssText = "position:absolute;left:-9999px;top:0";
  article.appendChild(c2);
  const countFits = c2.scrollWidth <= count.clientWidth;
  c2.remove();
  const pad = parseFloat(getComputedStyle(article.querySelector(".deck-card-footer")).paddingLeft) * 2;
  return { faced: measure(true) + pad, marks: measure(false) + pad, dataFaced: measure(true, dataTagHtml) + pad, countFits };
};

async function main() {
  await clerkSetup();
  await refuseSharedDatabase();
  await restoreHeld();
  const browser = await chromium.launch();
  let fixture = null;
  try {
    for (const vp of [
      // Wide enough for a tile past the yield, where the range keeps its name beside a notice.
      { label: "1600", width: 1600, height: 900 },
      { label: "1300", width: 1300, height: 900 },
      { label: "1000", width: 1000, height: 900 },
      { label: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
    ]) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile ?? false, hasTouch: vp.hasTouch ?? false });
      const page = await context.newPage();
      await signIn(page);
      if (!fixture) {
        fixture = await buildFixtures(await page.evaluate(() => window.Clerk.user.id));
        if (!fixture) {
          failures += 1;
          console.error("PREREQUISITE: the account needs a deck with an unanswered range reading, one with a single-mark reading, and one with no reading.");
          await context.close();
          break;
        }
      }
      await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
      const main = onPage(page, "article").first();
      await main.waitFor({ state: "visible" });
      const tiles = await page.locator("main").evaluate(READ_TILES);
      const md = vp.width >= 768;
      const floor = tiles.filter((t) => t.width >= FLOOR);
      console.log(`\n${vp.label}: ${tiles.length} tiles, widths ${[...new Set(tiles.map((t) => t.width))].join(", ")}`);
      const at = (deck) => tiles.find((t) => t.href === `/decks/${deck.id}`);

      if (floor.length === 0) console.log("      (no tile at or above the band floor at this width)");
      check(`${vp.label} · every tile above the floor has the ${md ? 94 : 92}px footer`,
        [...new Set(floor.map((t) => Math.round(t.footer)))], floor.length ? [md ? 94 : 92] : []);
      check(`${vp.label} · its chips row is one line, the chip's ${md ? 24 : 22}px`,
        [...new Set(floor.map((t) => Math.round(t.chipsHeight)))], floor.length ? [md ? 24 : 22] : []);
      // Read as the RESOLVED property, not only as a height: with the yield in place the row fits,
      // so a row allowed to wrap still draws one line and a height check passes over it.
      check(`${vp.label} · it may not wrap above the floor, and keeps today's wrap below it`, [
        [...new Set(floor.map((t) => t.wrap))],
        [...new Set(tiles.filter((t) => t.width < FLOOR).map((t) => t.wrap))],
      ], [floor.length ? ["nowrap"] : [], tiles.some((t) => t.width < FLOOR) ? ["wrap"] : []]);
      check(`${vp.label} · and nothing in it overflows`, floor.filter((t) => !t.chipsFits).map((t) => t.href), []);
      check(`${vp.label} · every count slot is 60px`, [...new Set(tiles.map((t) => Math.round(t.countWidth)))], [60]);
      const rows = new Map();
      for (const t of tiles) rows.set(t.top, [...(rows.get(t.top) ?? []), t]);
      check(`${vp.label} · the bar is one length along each row`,
        [...rows.values()].filter((r) => new Set(r.map((t) => Math.round(t.bar))).size > 1).length, 0);

      const range = at(fixture.range);
      const data = at(fixture.data);
      const bare = at(fixture.bare);
      check(`${vp.label} · the three fixture tiles are listed`, [!!range, !!data, !!bare], [true, true, true]);
      if (!range || !data || !bare) { await context.close(); continue; }
      if (EXPECT_OFF) {
        // The release switch: with notices off, not one tile on the page draws a tag, the three
        // fixture tiles included, whose state would draw one with the switch on.
        check(`${vp.label} · notices switched off: no tile draws a notice`, tiles.filter((t) => t.tag).map((t) => t.href), []);
        await context.close();
        continue;
      }

      // The notice, drawn after the chip (or the pill), and named in the link.
      check(`${vp.label} · range deck: Not legal with its dot, after the chip`,
        range.tag && [range.tag.kind, range.tag.text, range.tag.dot, range.tag.afterChip], ["notLegalUnread", "Not legal", true, true]);
      check(`${vp.label} · data deck: the count with its dot`, data.tag && [data.tag.kind, data.tag.text, data.tag.dot], ["unread", "1", true]);
      check(`${vp.label} · bare deck: Not legal in the chip's slot, no chip`, bare.tag && [bare.tag.kind, bare.faces.length], ["notLegalUnread", 0]);
      check(`${vp.label} · H5: Not legal's words are --fg, and its edge is not`,
        [range.tag.color === range.fg, range.tag.edge === range.fg], [true, false]);
      check(`${vp.label} · each link names its notice`, [
        /2? ?cards? not legal in this deck/.test(range.name),
        /1 notice since this deck was analyzed/.test(data.name),
        /cards? not legal in this deck/.test(bare.name),
      ], [true, true, true]);

      // The yield, by the tile's own width: marks only between the floor and the threshold.
      const yields = range.width >= FLOOR && range.width < YIELD_TO;
      check(`${vp.label} · the range chip at ${range.width}px ${yields ? "yields its name" : "keeps its name"}`,
        range.faces, [!yields]);

      // The threshold, MEASURED: the widest forms need no more than the tile ships.
      const dataTag = await onPage(page, `article:has(a[href="/decks/${fixture.data.id}"]) [data-notice-tag]`).evaluate((t) => t.outerHTML);
      const worst = await onPage(page, `article:has(a[href="/decks/${fixture.range.id}"])`).evaluate(MEASURE_WORST, dataTag);
      console.log(`      widest row: ${worst.faced.toFixed(1)}px with names (${worst.dataFaced.toFixed(1)}px beside \`● 99\`), ${worst.marks.toFixed(1)}px with marks only`);
      check(`${vp.label} · Unresolved + Exhibition or Core + Not legal fit at ${YIELD_TO}px`, worst.faced <= YIELD_TO, true);
      check(`${vp.label} · and beside \`● 99\` they fit at ${YIELD_DATA_TO}px`, worst.dataFaced <= YIELD_DATA_TO, true);
      check(`${vp.label} · and marks only fit at the ${FLOOR}px floor`, worst.marks <= FLOOR, true);
      check(`${vp.label} · 100 / 99 fits the count slot`, worst.countFits, true);
      await context.close();
    }
  } finally {
    await browser.close();
    // `PROBE_KEEP=1` leaves the fixture standing for the contact sheet to photograph; it stays held
    // on disk, so the next run of this probe puts it back before it builds anything.
    if (process.env.PROBE_KEEP === "1") console.log(`\nFixture kept for the contact sheet; held in ${HOLD}.`);
    else await restoreHeld();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .then(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
