// probe:notices-sheet — the deck header's notice tag and the Notices sheet, in a real browser at
// 1300x900 and 390x844 (deck notices plan PR 6; HANDOFF §1, §2, §3, with readiness F2, F18 and D12).
//
// What only a browser answers:
//   - the tag sits after the bracket chip at both widths, and at 390 the widest row stays ONE line
//     (F18): the range yields its name first, below a threshold MEASURED here from the widest forms
//     the code produces (`Unresolved`, `Exhibition or Core`, `● 99 notices`);
//   - the sheet's groups are in order, and a card name stacks the card sheet on it, with Escape
//     closing the card first and the sheet second;
//   - opening the sheet quiets the tag (the dot off), and a new entry brings the dot back;
//   - the foot's Re-analyze shows busy on ITS OWN button with no Analysis tab banner (F2), writes
//     no overview and spends nothing (D12);
//   - a dirty deck's foot offers the Analysis tab and no second Re-analyze.
//
// Its fixture is BUILT on local-dev: a deck with an unanswered RANGE reading gets a banned card (the
// legality group) and a planted Game Changer entry on a card its reading analyzed (a data group).
// Every write is held ON DISK before it is made, and the next run puts back what a killed run
// left. It refuses staging and production. Point it at local-dev.
//
//   PROBE_BASE=http://localhost:3220 pnpm probe:notices-sheet
//   PROBE_KEEP=1 …   leaves the fixture for `docs/superpowers/inventories/deck-notices-sheet.json`

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
import { onPage } from "./lib/surface.mjs";
// Run under tsx for this one import: the fixture restamps the reading with the app's own
// fingerprint of its new list, never a copy of the hash.
import { listFingerprint } from "../src/lib/profile/fingerprint.ts";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const sql = neon(DATABASE_URL);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

/** F18's threshold, as `spine-mobile.tsx` ships it. */
const F18_AT = 344;

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
    throw new Error(`probe:notices-sheet writes deck cards, log entries and read marks and refuses branch ${branch ?? "(unknown)"}.`);
  }
}

// What the run wrote, held ON DISK before each write: the rows it adds, the entries it plants, and
// the marks and flags it moves (put back as they were).
const HOLD = path.join(os.tmpdir(), "the99-probe-notices-sheet-hold.json");
const held = { cards: [], removed: [], seqs: [], marks: null };
const hold = () => writeFileSync(HOLD, JSON.stringify(held));

/**
 * The mark on every log entry this probe plants (`detail.probe`). The sweep finds entries by it, so
 * an entry committed by a run killed before its seq reached the hold file is still found.
 */
const PROBE_MARK = "notices-sheet";

async function restoreHeld() {
  // First, and whatever the hold file says: the log is global, and an orphaned entry touches every
  // reading that shares its card.
  try {
    await sql`delete from deck_data_changes where detail->>'probe' = ${PROBE_MARK}`;
  } catch (error) {
    failures += 1;
    console.error("RESTORE FAILED", error);
  }
  let prior;
  try {
    prior = JSON.parse(readFileSync(HOLD, "utf8"));
  } catch {
    return;
  }
  const steps = [
    ...prior.cards.map((c) => () => sql`delete from deck_cards where deck_id = ${c.deckId}::uuid and oracle_id = ${c.oracleId}::uuid`),
    ...(prior.removed ?? []).map((c) => () => sql`
      insert into deck_cards (deck_id, oracle_id, quantity) values (${c.deckId}::uuid, ${c.oracleId}::uuid, ${c.quantity})
      on conflict (deck_id, oracle_id) do update set quantity = excluded.quantity`),
    ...(prior.seqs.length ? [() => sql`delete from deck_data_changes where seq = any(${prior.seqs}::bigint[])`] : []),
    ...(prior.marks
      ? [
          () => sql`update decks set notices_legal_seen = ${prior.marks.legalSeen}::uuid[] where id = ${prior.marks.deckId}::uuid`,
        ]
      : []),
  ];
  let ok = true;
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      ok = false;
      failures += 1;
      console.error("RESTORE FAILED", error);
    }
  }
  if (ok) rmSync(HOLD, { force: true });
}

async function plant(oracleId) {
  const [{ seq }] = await sql`
    insert into deck_data_changes (kind, direction, oracle_ids, detail)
    values ('gameChanger', 'added', array[${oracleId}]::uuid[], ${JSON.stringify({ probe: PROBE_MARK })}::jsonb) returning seq`;
  held.seqs.push(Number(seq));
  hold();
  return Number(seq);
}

let releaseProfile = null;

async function buildFixture(userId) {
  const [deck] = await sql`
    select d.id, p.analyzed_oracle_ids, p.notices_read_seq::int as read_seq, p.dirty, p.fingerprint,
           d.notices_legal_seen::text as legal_seen, d.commander_oracle_id, d.partner_oracle_id
    from decks d join deck_profiles p on p.deck_id = d.id
    where d.user_id = ${userId} and cardinality(p.permits) = 2 and cardinality(p.analyzed_oracle_ids) > 0
      and (d.declared_bracket is null or not (d.declared_bracket = any(p.permits)))
    order by d.id limit 1`;
  if (!deck) return null;
  const [ban] = await sql`
    select c.oracle_id from cards c
    where not c.commander_legal
      and not exists (select 1 from deck_cards dc where dc.deck_id = ${deck.id}::uuid and dc.oracle_id = c.oracle_id)
    order by c.oracle_id limit 1`;
  if (!ban) return null;
  // The WHOLE reading is held on disk before anything moves: the foot's press re-analyzes, which
  // rewrites every column of the row, not only the marks.
  releaseProfile = await holdProfile(sql, deck.id);
  // A SWAP, not an add: an add makes the body 100, and a changed list reads stale, which is the
  // dirty foot. So one analyzed card leaves, the banned card takes its place, and the reading is
  // restamped with the new list's fingerprint, the state of a deck analyzed with the ban in it.
  // One COPY leaves, so a deck padded with 98 Wastes swaps as readily as a deck of singletons.
  const [out] = await sql`
    select oracle_id, quantity from deck_cards
    where deck_id = ${deck.id}::uuid
    order by quantity desc, oracle_id limit 1`;
  if (!out) return null;
  held.marks = { deckId: deck.id, readSeq: deck.read_seq, dirty: deck.dirty, fingerprint: deck.fingerprint, legalSeen: deck.legal_seen };
  held.removed.push({ deckId: deck.id, oracleId: out.oracle_id, quantity: out.quantity });
  held.cards.push({ deckId: deck.id, oracleId: ban.oracle_id });
  hold();
  if (out.quantity > 1) await sql`update deck_cards set quantity = quantity - 1 where deck_id = ${deck.id}::uuid and oracle_id = ${out.oracle_id}::uuid`;
  else await sql`delete from deck_cards where deck_id = ${deck.id}::uuid and oracle_id = ${out.oracle_id}::uuid`;
  await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${ban.oracle_id}::uuid, 1)`;
  const rows = await sql`select oracle_id, quantity from deck_cards where deck_id = ${deck.id}::uuid`;
  const fingerprint = listFingerprint({
    commanderOracleId: deck.commander_oracle_id,
    partnerOracleId: deck.partner_oracle_id,
    cards: rows.map((r) => ({ oracleId: r.oracle_id, quantity: r.quantity })),
  });
  await sql`update deck_profiles set fingerprint = ${fingerprint} where deck_id = ${deck.id}::uuid`;
  // The planted entry names the COMMANDER, which every reading analyzes, so the swap above is free
  // to take any card in the list.
  await plant(deck.commander_oracle_id);
  // Whatever the account did before, the fixture starts unread and clean.
  await sql`update deck_profiles set dirty = false where deck_id = ${deck.id}::uuid`;
  await sql`update decks set notices_legal_seen = null where id = ${deck.id}::uuid`;
  return { id: deck.id, card: deck.commander_oracle_id };
}

/** The visible header's chips row: its boxes in order, whether it is one line, and the tag. */
const READ_HEADER = () => {
  const rows = [...document.querySelectorAll("main [data-spine-chips]")].filter((r) => r.getBoundingClientRect().width > 0);
  const row = rows[0];
  if (!row) return null;
  const tag = row.querySelector("[data-notice-tag]");
  const chips = [...row.querySelectorAll("[data-testid='bracket-chip']")].filter((c) => c.getBoundingClientRect().width > 0);
  const boxes = [...row.children].flatMap((c) => (getComputedStyle(c).display === "contents" ? [...c.children] : [c]))
    .filter((e) => e.getBoundingClientRect().width > 0);
  // Lines by GAPS, never by exact tops: the 22px pill and the 24px chip centre on one line a pixel
  // apart, which counts as two lines to a `Set` of tops.
  const tops = boxes.map((b) => b.getBoundingClientRect().top).sort((x, y) => x - y);
  const lines = tops.length === 0 ? 0 : 1 + tops.slice(1).filter((t, i) => t - tops[i] > 8).length;
  return {
    width: row.clientWidth,
    lines,
    boxes: boxes.map((b) => `${b.textContent.trim().slice(0, 18)}@${Math.round(b.getBoundingClientRect().top)}/${Math.round(b.getBoundingClientRect().width)}`),
    tag: tag && { kind: tag.dataset.noticeTag, text: tag.textContent, dot: !!tag.querySelector("[data-notice-dot]") },
    tagLast: tag ? boxes[boxes.length - 1] === tag : false,
    chipFaces: chips.map((c) => c.textContent.trim().length > 0),
  };
};

/** The widest row this header can be asked for, measured from its own nodes (F18). */
const MEASURE_WIDEST = () => {
  const row = [...document.querySelectorAll("main [data-spine-chips]")].find((r) => r.getBoundingClientRect().width > 0);
  const clone = row.cloneNode(true);
  clone.style.cssText = "position:absolute;left:-9999px;top:0;width:max-content;flex-wrap:nowrap;container-type:normal";
  const pill = clone.firstElementChild;
  pill.textContent = "Unresolved";
  for (const wrap of [...clone.children].filter((c) => c.tagName === "SPAN" && c.className.includes("contents"))) {
    const chip = wrap.querySelector("[data-testid='bracket-chip']");
    if (chip && chip.textContent.trim().length === 0) wrap.remove();
    else wrap.style.display = "contents";
  }
  const face = clone.querySelector("[data-testid='bracket-chip'] > span:last-child");
  if (face) face.textContent = "Exhibition or Core";
  const tag = clone.querySelector("[data-notice-tag]");
  if (tag) tag.lastChild.textContent = "99 notices";
  row.parentElement.appendChild(clone);
  const width = clone.getBoundingClientRect().width;
  clone.remove();
  return width;
};

async function main() {
  await clerkSetup();
  await refuseSharedDatabase();
  await restoreHeld();
  const browser = await chromium.launch();
  let fixture = null;
  try {
    for (const vp of [
      { label: "1300", width: 1300, height: 900 },
      { label: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
    ]) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile ?? false, hasTouch: vp.hasTouch ?? false });
      const page = await context.newPage();
      await signIn(page);
      if (!fixture) {
        fixture = await buildFixture(await page.evaluate(() => window.Clerk.user.id));
        if (!fixture) {
          failures += 1;
          console.error("PREREQUISITE: the account needs a deck whose stored reading is an unanswered range.");
          await context.close();
          break;
        }
      } else {
        // Each width starts unread.
        await sql`update deck_profiles set notices_read_seq = ${held.marks.readSeq}, dirty = false where deck_id = ${fixture.id}::uuid`;
        await sql`update decks set notices_legal_seen = null where id = ${fixture.id}::uuid`;
      }
      await page.goto(`${BASE}/decks/${fixture.id}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => [...document.querySelectorAll("main [data-notice-tag]")].some((t) => t.getBoundingClientRect().width > 0), null, { timeout: 20_000 });

      // 1 · The tag after the chip, legality winning, unread.
      const h = await page.evaluate(READ_HEADER);
      check(`${vp.label} · the header tag is Not legal, unread, last in the chips row`, h && [h.tag?.kind, h.tag?.text, h.tag?.dot, h.tagLast], ["notLegalUnread", "Not legal", true, true]);
      // ONE LINE is the phone's rule (F18), where the art band's ramp counts the row as one. The
      // desktop row wraps by design (Analysis tab handoff §1), so there the tag need only follow.
      if (vp.width < 768) {
        check(`${vp.label} · the chips row is one line`, h?.lines, 1);
        if (h?.lines !== 1) console.log(`      row ${h?.width}px: ${h?.boxes.join(", ")}`);
      } else {
        console.log(`      desktop row ${h?.width}px, ${h?.lines} line(s): ${h?.boxes.join(", ")}`);
      }
      if (vp.width < 768) {
        // F18: the range yields its name below the measured width, and the widest row fits it.
        const widest = await page.evaluate(MEASURE_WIDEST);
        console.log(`      widest phone row: ${widest.toFixed(1)}px against a ${h.width}px row`);
        check(`${vp.label} · F18: the widest row needs no more than ${F18_AT}px`, widest <= F18_AT, true);
        check(`${vp.label} · F18: at ${h.width}px the range ${h.width < F18_AT ? "yields its name" : "keeps its name"}`, h.chipFaces, [!(h.width < F18_AT)]);
      }

      // 2 · Opening the sheet: groups in order, and the tag goes quiet at once. Opened over the
      // Analysis tab, pressed first, because F2 (step 4) is about the banner that tab draws: with
      // the tab unmounted no banner can draw on any build, and the check measures nothing.
      await onPage(page, '[role="tab"]').filter({ hasText: /analysis/i }).first().click();
      const panel = await onPage(page, 'section[aria-label="Your bracket"]').first()
        .waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
      check(`${vp.label} · the Analysis tab shows the reading under the sheet`, panel, true);
      await onPage(page, "[data-notice-tag]").filter({ visible: true }).first().click();
      const body = onPage(page, "[data-testid='notices-body']");
      await body.waitFor({ state: "visible" });
      const groups = await body.evaluate((b) => [...b.querySelectorAll("[data-notice-group]")].map((g) => g.getAttribute("data-notice-group")));
      check(`${vp.label} · the groups are legality first, then the data`, [groups[0], groups.includes("gameChangers")], ["notLegal", true]);
      // `openNotices` answers after the sheet draws, so wait for the dot to go rather than read now.
      await page.waitForFunction(() => {
        const t = [...document.querySelectorAll("main [data-notice-tag]")].find((e) => e.getBoundingClientRect().width > 0);
        return t && !t.querySelector("[data-notice-dot]");
      }, null, { timeout: 10_000 }).catch(() => {});
      const quiet = await page.evaluate(READ_HEADER);
      check(`${vp.label} · opening quiets the tag: legality keeps its words and loses its dot`, quiet && [quiet.tag?.text, quiet.tag?.dot], ["Not legal", false]);
      // The quiet tag is the client's own state, drawn from the action's reply, so it reads the same
      // whether or not the marks were written. The marks themselves are what a reload reads.
      const [marks] = await sql`
        select d.notices_legal_seen as legal, p.notices_read_seq as "readSeq",
               ${Math.max(...held.seqs)}::int as "maxSeq"
        from decks d join deck_profiles p on p.deck_id = d.id where d.id = ${fixture.id}::uuid`;
      check(`${vp.label} · opening wrote both marks`, [Array.isArray(marks?.legal) && marks.legal.length > 0, Number(marks?.readSeq) >= Number(marks?.maxSeq)], [true, true]);

      // 3 · A card name stacks the card sheet; Escape closes the card, then the sheet.
      await body.locator("[data-notice-group='gameChangers'] button").first().click();
      await page.waitForFunction(() => document.querySelectorAll("[role='dialog']").length >= 2, null, { timeout: 10_000 });
      const stacked = await page.evaluate(() => document.querySelectorAll("[role='dialog']").length);
      check(`${vp.label} · a card name stacks the card on the sheet`, stacked >= 2, true);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      check(`${vp.label} · Escape closes the card first`, await body.isVisible(), true);

      // 4 · The foot's Re-analyze: busy on its own button, no banner, no overview, nothing spent.
      const [before] = await sql`
        select (select count(*) from deck_synopses where deck_id = ${fixture.id}::uuid)::int as overviews,
               (select count(*) from model_calls mc join decks d on d.user_id = mc.user_id where d.id = ${fixture.id}::uuid)::int as calls`;
      const foot = body.locator("xpath=..").locator("[data-notices-foot='reanalyze']");
      check(`${vp.label} · a clean deck's foot offers Re-analyze`, await foot.count(), 1);
      const button = foot.getByRole("button");
      await button.click();
      const busy = await button.getAttribute("aria-busy").catch(() => null);
      const bannerDuring = await onPage(page, "[data-testid='analysis-banner']").filter({ visible: true }).count();
      check(`${vp.label} · F2: the press shows on its own button and draws no banner`, [busy, bannerDuring], ["true", 0]);
      await page.waitForFunction(() => {
        const b = document.querySelector("[data-notices-foot='reanalyze'] button");
        return !b || b.getAttribute("aria-busy") !== "true";
      }, null, { timeout: 30_000 });
      await page.waitForTimeout(1500);
      const [after] = await sql`
        select (select count(*) from deck_synopses where deck_id = ${fixture.id}::uuid)::int as overviews,
               (select count(*) from model_calls mc join decks d on d.user_id = mc.user_id where d.id = ${fixture.id}::uuid)::int as calls`;
      check(`${vp.label} · D12: the press wrote no overview and spent nothing`, after, before);
      // The open sheet re-reads with the reading: the entry the new reading absorbed leaves the list
      // while the sheet is still open, rather than on the next open.
      await page.waitForFunction(() => !document.querySelector("[data-notice-group='gameChangers']"), null, { timeout: 10_000 }).catch(() => {});
      check(`${vp.label} · the open sheet drops the entry the new reading absorbed`, await body.locator("[data-notice-group='gameChangers']").count(), 0);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      check(`${vp.label} · Escape then closes the sheet`, await body.isVisible(), false);

      // 5 · A new entry brings the dot back; a dirty deck's foot sends the player to the tab.
      await plant(fixture.card);
      await sql`update decks set notices_legal_seen = null where id = ${fixture.id}::uuid`;
      await sql`update deck_profiles set dirty = true where deck_id = ${fixture.id}::uuid`;
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForFunction(() => [...document.querySelectorAll("main [data-notice-tag]")].some((t) => t.getBoundingClientRect().width > 0), null, { timeout: 20_000 });
      check(`${vp.label} · a new entry brings the dot back`, (await page.evaluate(READ_HEADER))?.tag?.dot, true);
      await onPage(page, "[data-notice-tag]").filter({ visible: true }).first().click();
      await body.waitFor({ state: "visible" });
      const dirtyFoot = await page.evaluate(() => {
        const f = document.querySelector("[data-notices-foot]");
        return f && { kind: f.getAttribute("data-notices-foot"), reanalyze: [...f.querySelectorAll("button")].some((b) => /Re-analyze/.test(b.textContent)) };
      });
      check(`${vp.label} · a dirty deck's foot offers the Analysis tab and no Re-analyze`, dirtyFoot, { kind: "toTab", reanalyze: false });
      // Closed at once, the sheet STAYS closed: `openNotices` answers after the sheet draws, and its
      // reply landing after the close must not open it again.
      await page.keyboard.press("Escape");
      await body.waitFor({ state: "hidden" });
      await onPage(page, "[data-notice-tag]").filter({ visible: true }).first().click();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(2500);
      check(`${vp.label} · a sheet closed before its read lands stays closed`, await body.isVisible(), false);
      await context.close();
    }
  } finally {
    await browser.close();
    // `PROBE_KEEP=1` leaves the fixture standing for the contact sheet to photograph; both holds
    // stay on disk, so the next run of this probe puts everything back before it builds anything.
    if (process.env.PROBE_KEEP === "1") console.log(`\nFixture kept for the contact sheet; held in ${HOLD}.`);
    else {
      await restoreHeld();
      if (releaseProfile) await releaseProfile().catch((e) => { failures += 1; console.error("reading not restored", e); });
    }
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
