// The version comparison row (Round 3 §E), walked in a real browser at 1300x900 and 390x844.
//
// WHY A BROWSER, AND WHY A DATABASE. The row is drawn only when the deck IS a committed version —
// the draft holding no change since — and the version before it recorded a reading that differs.
// Both halves are facts no component test reaches: `hasChanges` over a real draft diff decides
// the first, and `listVersions` reading `deck_versions.permits` and `declared_bracket` back out of
// Postgres decides the second. A component test hands the row its props and proves neither.
//
// And its geometry: the arrow is TIME, seated level with the marks above their labels; the marks
// are 24px chips; the labels are 8px mono caps. jsdom lays none of that out.
//
// THREE FIXTURES, built and deleted in a `finally` (versions and cards cascade):
//
//   single   v1 permitted [4,5] and was declared cEDH; v2 holds one game changer, [3], and the
//            deck still carries cEDH — a declaration the commit refused to copy. Both the row
//            and the draft's drift line are TRUE, and the row must win: one sentence, no drift
//            line, no chips.
//   range    v1 read [3]; v2 is empty, [1,2]. The row says PERMITS, and the ask follows.
//   edited   `single` with one card added since v2. A draft is not a version, so no row — and
//            with the row gone, the drift line is what states the old answer.
//
// THREE MUTATIONS WERE RUN AGAINST IT AND ALL THREE FAIL: the row's branch removed (16 checks),
// the arrow's `pb-[13px]` removed, which drops the glyph 13px below the marks it is meant to sit
// level with (2), and the predecessor looked up on ANY committed deck rather than an unedited one,
// which draws the row over an edited draft and suppresses the drift line there (4). Its own first
// run failed a correct-looking build: the marks sat on an inline strut that made each one's box
// taller than the mark, so the arrow read 10px low. The wrapper is a flex box now.
//
// It also seeds `user_prefs.about_version_seen` forward, as every probe on this surface does.
// Needs a server with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3021 node scripts/probe-version-comparison.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { padToWhole } from "./lib/whole-deck.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
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

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

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
  const userId = await page.evaluate(() => window.Clerk.user.id);
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, userId);
  return userId;
}

/** Ids are pushed BEFORE the insert that makes each deck exist, so a throw part-way through
 *  still cleans up what it made. */
async function buildFixtures(userId, made) {
  const [commander] = await sql`
    select oracle_id from cards
    where type_line ilike '%legendary creature%' and not game_changer
    order by name limit 1`;
  if (!commander) throw new Error("the catalog cannot build these fixtures: no legend to lead them");
  const gcs = await sql`
    select oracle_id from cards where game_changer and type_line not ilike '%legendary creature%'
    order by name limit 4`;
  const [plain] = await sql`
    select oracle_id from cards
    where not game_changer and type_line ilike 'Creature%' and oracle_id <> ${commander.oracle_id}
    order by name limit 1`;
  if (!commander || gcs.length < 4 || !plain) throw new Error("the catalog cannot build these fixtures");
  const C = commander.oracle_id;
  const specs = [
    { key: "single", declared: 5, cards: [gcs[0]], v1: { permits: [4, 5], declared: 5, cards: gcs }, v2: { permits: [3], cards: [gcs[0]] } },
    { key: "range", declared: null, cards: [], v1: { permits: [3], declared: null, cards: [gcs[0]] }, v2: { permits: [1, 2], cards: [] } },
    { key: "edited", declared: 5, cards: [gcs[0], plain], v1: { permits: [4, 5], declared: 5, cards: gcs }, v2: { permits: [3], cards: [gcs[0]] } },
  ];
  const decks = {};
  for (const s of specs) {
    const id = crypto.randomUUID();
    made.push(id);
    await sql`
      insert into decks (id, user_id, name, commander_oracle_id, declared_bracket)
      values (${id}, ${userId}, ${`Version comparison probe · ${s.key}`}, ${C}, ${s.declared})`;
    for (const c of s.cards) {
      await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${id}, ${c.oracle_id}, 1)`;
    }
    // Whole, or the press is refused (ruling 1). Wastes moves no bracket fact.
    await padToWhole(sql, id, s.cards.length);
    for (const [n, v] of [[1, s.v1], [2, s.v2]]) {
      const [row] = await sql`
        insert into deck_versions (deck_id, number, commander_oracle_id, declared_bracket, permits, committed_at)
        values (${id}, ${n}, ${C}, ${v.declared ?? null}, ${v.permits}, now() - make_interval(days => ${3 - n}))
        returning id`;
      for (const c of v.cards) {
        await sql`insert into deck_version_cards (version_id, oracle_id, quantity) values (${row.id}, ${c.oracle_id}, 1)`;
      }
      // The version is padded exactly as the draft is, or every draft reads as edited against it.
      const [wastes] = await sql`select oracle_id from cards where name = 'Wastes' limit 1`;
      await sql`insert into deck_version_cards (version_id, oracle_id, quantity) values (${row.id}, ${wastes.oracle_id}, ${99 - v.cards.length})`;
    }
    decks[s.key] = id;
  }
  return decks;
}

/** The deck page, the Analysis tab by a PRESS, and the profile asked for. */
async function openAnalysis(p, deckId, label) {
  await p.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const up = await p.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 25_000 }).then(() => true, () => false);
  if (!report(`${label}px · the deck page rendered`, up, up ? "tablist is up" : "no tablist")) return false;
  const tab = onPageRole(p, "tab", /Analysis/);
  if (!report(`${label}px · the Analysis tab is drawn`, (await tab.count()) > 0,
      "absent means ANALYSIS_TAB_ENABLED is off on this server")) return false;
  await tab.first().click();
  await onPageRole(p, "button", /^(Re-)?[Aa]nalyze$/).first().click();
  const ready = await onPage(p, 'section[aria-label="Your bracket"]')
    .first().waitFor({ state: "visible", timeout: 25_000 }).then(() => true, () => false);
  return report(`${label}px · the verdict is drawn`, ready, ready ? "ready" : "no verdict after 25s");
}

const block = (p) => onPage(p, 'section[aria-label="Your bracket"]').first();

/** The row, read off the page: its sentence, its marks, its labels and where the arrow sits. */
async function readRow(p) {
  return block(p).evaluate((el) => {
    const sentence = [...el.querySelectorAll("p")].find((x) => /^This version /.test(x.textContent));
    const row = el.querySelector("[aria-hidden='true'].flex");
    const arrow = row ? [...row.children].find((c) => c.textContent === "→") : null;
    const marks = row ? [...row.querySelectorAll('[data-testid="bracket-mark"]')] : [];
    const labels = row ? [...row.querySelectorAll("span.font-mono")].filter((s) => s.textContent !== "→") : [];
    // CENTRES, on the arrow's CONTENT box: its `padding-bottom` is what lifts the glyph, so the
    // border box's foot sits on the row's foot by construction and proves nothing.
    const markMid = marks.length
      ? marks.map((m) => { const r = m.getBoundingClientRect(); return (r.top + r.bottom) / 2; })[0]
      : null;
    const arrowMid = arrow
      ? (() => { const r = arrow.getBoundingClientRect(); const pb = parseFloat(getComputedStyle(arrow).paddingBottom); return (r.top + r.bottom - pb) / 2; })()
      : null;
    const style = sentence ? getComputedStyle(sentence) : null;
    return {
      sentence: sentence?.textContent ?? null,
      bold: sentence?.querySelector("b")?.textContent ?? null,
      marks: marks.map((m) => ({ b: m.dataset.bracket, w: Math.round(m.getBoundingClientRect().width) })),
      labels: labels.map((l) => ({ text: l.textContent, size: parseFloat(getComputedStyle(l).fontSize),
        transform: getComputedStyle(l).textTransform })),
      arrowGap: arrowMid !== null && markMid !== null ? Math.round(arrowMid - markMid) : null,
      sentenceColor: style?.color ?? null,
      drift: el.textContent.includes("was declared, and this deck has since moved out of it"),
      chips: el.querySelectorAll('[role="group"] button').length,
      buttons: [...el.querySelectorAll("button")].map((b) => b.textContent.trim()),
    };
  });
}

async function walk(p, { label }, decks) {
  // ── single: the row wins over the drift line, and asks nothing ──────────────────────────
  if (await openAnalysis(p, decks.single, label)) {
    const r = await readRow(p);
    report(`${label}px · a later version states both readings`,
      r.sentence === "This version reads as Upgraded. Version 1 read as Optimized or cEDH and was declared cEDH.",
      r.sentence ?? "no row");
    report(`${label}px · the current reading carries the weight`, r.bold === "Upgraded", `bold "${r.bold}"`);
    report(`${label}px · version 1's declared mark, then this version's`,
      r.marks.map((m) => m.b).join(",") === "5,3" && r.marks.every((m) => m.w === 24),
      r.marks.map((m) => `${m.b}@${m.w}`).join(" "));
    report(`${label}px · labelled version 1 and this version, 8px caps`,
      r.labels.map((l) => l.text).join("|") === "version 1|this version"
        && r.labels.every((l) => l.size === 8 && l.transform === "uppercase"),
      r.labels.map((l) => `${l.text}@${l.size}/${l.transform}`).join(" "));
    // THE ARROW SITS LEVEL WITH THE MARKS, above the labels. The figures do not add up by
    // themselves: the label and its gap are 11px, and it is the glyph's own inherited line box
    // (about 19.5px) that brings `pb-[13px]` to the marks' centre, 8 + 3 + 12 = 23px up. So it is
    // measured centre to centre, and a change to the label, the gap or the line height fails here.
    report(`${label}px · the arrow is seated with the marks, not the labels`,
      r.arrowGap !== null && Math.abs(r.arrowGap) <= 2, `arrow centre ${r.arrowGap}px from the marks' centre`);
    report(`${label}px · the row suppresses the drift line`, !r.drift, r.drift ? "drift line drawn too" : "one statement");
    report(`${label}px · and draws no control`, r.chips === 0 && !r.buttons.includes("change"),
      r.buttons.join(", ") || "no buttons");
  }

  // ── range: permits, and the ask follows ─────────────────────────────────────────────────
  if (await openAnalysis(p, decks.range, label)) {
    const r = await readRow(p);
    report(`${label}px · a range permits`,
      r.sentence === "This version permits Exhibition or Core. Version 1 read as Upgraded.", r.sentence ?? "no row");
    report(`${label}px · this version's side draws both members`,
      r.marks.map((m) => m.b).join(",") === "3,1,2", r.marks.map((m) => m.b).join(","));
    report(`${label}px · and the ask follows`, r.chips === 2, `${r.chips} chips`);
  }

  // ── edited: a draft is not a version ────────────────────────────────────────────────────
  if (await openAnalysis(p, decks.edited, label)) {
    const r = await readRow(p);
    report(`${label}px · an edited draft draws no row`, r.sentence === null, r.sentence ?? "no row");
    report(`${label}px · so the drift line states the old answer`, r.drift, r.drift ? "drift line" : "nothing");
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const made = [];
  let decks = null;
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: width.viewport });
      const p = await ctx.newPage();
      const userId = await signIn(p);
      decks ??= await buildFixtures(userId, made);
      await walk(p, width, decks);
      await ctx.close();
    }
  } finally {
    await browser.close();
    if (made.length) await sql`delete from decks where id = any(${made})`;
    console.log(`       (cleaned up ${made.length} fixture deck${made.length === 1 ? "" : "s"})`);
  }
}

await run();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
