// The bracket chip on the deck tile and in the deck header, in a real browser at 1300x900 and
// 390x844.
//
// What only a layout engine can answer: that the chip sits ON the status pill's line rather than
// pushing a second one (the tile's footer row and the header's badge row are both 22px lines on a phone; the chip is 24px from `md`),
// that it stays inside the tile, that the header's copy is served from the STORED analysis on a
// fresh load before any tab is pressed, and that pressing it lands on the Analysis tab.
//
// IT WRITES ONE ROW: pressing Analyze upserts this account's analysis of one deck in
// `deck_profiles`, and the `finally` puts it back as it was (or deletes it when there was none).
// It never edits a deck. The rule that an edit during the visit retires the header chip is
// `use-header-bracket.test.tsx`'s, where it needs no real deck to prove it. The About gate's
// `user_prefs` row is raised as `probe:verdict-block` raises it. Point it at `local-dev`, NEVER
// production.
//
//   PROBE_BASE=http://localhost:3047 node scripts/probe-bracket-chip.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
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
const sqlc = neon(DATABASE_URL);

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  // The narrowest multi-column grid: a tile is ~189px here, the width that cannot hold the pill,
  // a range chip, the bar and the count on one line.
  { label: 700, viewport: { width: 700, height: 900 } },
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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
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

  // CLEAR THE ABOUT GATE BEFORE ANY ROUTE IS ASKED FOR. Since #658 `proxy.ts` redirects a reader
  // below the current `ABOUT_VERSION` to `/about?next=…` — so a probe that navigates straight to
  // `/decks` scrapes the About page instead, and its specimen deck links then read as this
  // account's decks. The first run of this file did exactly that: it reported "no Analysis tab"
  // about `/decks/about-resume-edited`, a routing problem wearing a flag problem's clothes.
  //
  // Seeded rather than clicked through: the flag lives in `user_prefs` and this account may have
  // no row at all, so visiting the page does not write one. Left set afterwards on purpose —
  // "this account has seen the About page" is true once this ran.
  //
  // `greatest(...)`, which is what `lib/about/read.ts` itself writes. A bare assignment LOWERS
  // the stored value when this checkout is pinned behind the database's, putting the About page
  // back in front of a real reader on their next navigation.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await neon(DATABASE_URL)`
    insert into user_prefs (user_id, about_version_seen)
    values (${await page.evaluate(() => window.Clerk.user.id)}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, await page.evaluate(() => window.Clerk.user.id));
}


/** Every VISIBLE chip under the page scope, with its rect and the status pill beside it. */
async function chips(page, within) {
  return page.evaluate(([scope, sel]) => {
    const root = document.querySelector(scope);
    // EVERY host, never the first: both header widths stay mounted, and the first match at 390
    // is the hidden desktop copy.
    const hosts = sel ? [...(root?.querySelectorAll(sel) ?? [])] : [root];
    return hosts.flatMap((host) => [...(host?.querySelectorAll('[data-testid="bracket-chip"]') ?? [])])
      .filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden")
      .map((el) => {
        const r = el.getBoundingClientRect();
        const pill = el.closest("button")?.previousElementSibling ?? el.previousElementSibling;
        const p = pill?.getBoundingClientRect();
        // The tile is its list item: the footer is not inside the tile's link.
        const li = el.closest("li");
        const tile = li?.getBoundingClientRect();
        const box = (q) => { const b = li?.querySelector(q)?.getBoundingClientRect(); return b ? { left: b.left, right: b.right, top: b.top, bottom: b.bottom } : null; };
        // The label is the chip's last child: mono type, per the handoff's chip (§1).
        const label = el.lastElementChild;
        const marks = [...el.querySelectorAll('[data-testid="bracket-mark"]')];
        return {
          text: el.textContent,
          labelFamily: label ? getComputedStyle(label).fontFamily : "",
          markOpacity: marks.map((m) => Number(getComputedStyle(m).opacity)),
          h: r.height, top: r.top, bottom: r.bottom, right: r.right,
          pill: p ? { top: p.top, bottom: p.bottom, h: p.height, text: pill.textContent } : null,
          tileRight: tile?.right ?? null,
          left: r.left,
          bar: box("[data-deck-bar]"),
        };
      });
  }, [PAGE, within ?? null]);
}

/** The handoff's chip (Analysis tab §1): 22px below `md`, 24px from it. */
const chipPx = (width) => (width >= 768 ? 24 : 22);

/** The chip is the handoff's, not #877's: a mono label, and its first mark at full ink. What a
 *  RANGE draws (both names, the high mark at 0.65) is section 5's, which finds one to read. */
function styled(width, where, c) {
  report(`${width}px · the ${where} chip's label is mono`, /mono/i.test(c.labelFamily), c.labelFamily);
  report(`${width}px · the ${where} chip's first mark is at full ink`, Math.abs(c.markOpacity[0] - 1) < 0.01,
    `opacity ${c.markOpacity.join(", ")}`);
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let deckId = null;
  let restoreProfile = null;
  try {
    for (const { label, viewport } of WIDTHS) {
      const ctx = await browser.newContext({ viewport });
      const p = await ctx.newPage();
      await signIn(p);
      if (!deckId) {
        await p.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
        await p.waitForTimeout(1200);
        const href = await p.evaluate((scope) =>
          [...(document.querySelector(scope)?.querySelectorAll("a[href^='/decks/']") ?? [])]
            .map((a) => a.getAttribute("href"))
            .find((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2])),
        PAGE);
        if (!report("a deck to walk", !!href, href ?? "the account has no decks")) break;
        deckId = href.split("/")[2];
        // The whole row, not only whether one exists: pressing Analyze UPSERTS it, so a deck that was
        // already analyzed has its own analysis put back in the `finally` rather than left replaced.
        // Held on DISK, so a dead run or a failed restore cannot lose it (`lib/profile-hold.mjs`).
        restoreProfile = await holdProfile(sqlc, deckId);
      }
      const href = `/decks/${deckId}`;

      // 1 · Analyze, so there is something stored to draw. THE PRESS IS REQUIRED: the stored row
      // (held above, restored in the `finally`) is cleared first, so a run that found no Analyze
      // control fails here rather than drawing an old reading and passing.
      await sqlc`delete from deck_profiles where deck_id = ${deckId}::uuid`;
      await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 });
      await onPageRole(p, "tab", /Analysis/).first().click();
      await p.waitForTimeout(500);
      const invite = onPageRole(p, "button", /^Analyze$/);
      if (!report(`${label}px · the Analyze press is there`, (await invite.count()) > 0, "none: renamed or removed")) break;
      await invite.first().click();
      await onPage(p, 'section[aria-label="Your bracket"]').first()
        .waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});

      // 2 · A FRESH load draws the header chip from the stored analysis, before any tab is pressed.
      await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 });
      await p.waitForTimeout(600);
      const head = await chips(p, "button[aria-label^='Bracket:']");
      if (report(`${label}px · the header draws one chip on a fresh load`, head.length === 1,
          `${head.length} visible`)) {
        const [c] = head;
        report(`${label}px · the header chip is ${chipPx(label)}px`, Math.abs(c.h - chipPx(label)) < 0.6, `${c.h}px`);
        styled(label, "header", c);
        const pillMid = c.pill ? (c.pill.top + c.pill.bottom) / 2 : NaN;
        report(`${label}px · the header chip shares the status pill's line`,
          c.pill !== null && Math.abs((c.top + c.bottom) / 2 - pillMid) <= 1,
          c.pill ? `chip mid ${((c.top + c.bottom) / 2).toFixed(1)} vs pill mid ${pillMid.toFixed(1)} (${c.pill.text})` : "no status pill before it");
      }

      // 3 · Pressing it lands on the Analysis tab.
      if (head.length === 1) {
        await p.evaluate((scope) => {
          const btn = [...document.querySelector(scope).querySelectorAll("button[aria-label^='Bracket:']")]
            .find((b) => b.getClientRects().length > 0);
          btn?.click();
        }, PAGE);
        await p.waitForTimeout(400);
        const selected = await onPageRole(p, "tab", /Analysis/).first().getAttribute("aria-selected");
        report(`${label}px · pressing the chip lands on the Analysis tab`, selected === "true", `aria-selected ${selected}`);
      }

      // 4 · The tile.
      await p.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1500);
      const tile = await chips(p, `li:has(a[href='${href}'])`);
      if (report(`${label}px · the deck's tile draws its chip`, tile.length === 1, `${tile.length} visible`)) {
        const [c] = tile;
        report(`${label}px · the tile chip is ${chipPx(label)}px`, Math.abs(c.h - chipPx(label)) < 0.6, `${c.h}px`);
        styled(label, "tile", c);
        // On the pill's line where the tile holds both, WRAPPED onto its own line inside the cell
        // where it does not (the ~189-230px tiles of the two- and three-column grids). Never
        // painted over the bar: that is what a cell allowed to shrink below its pills did.
        // Mid-lines rather than edges: from `md` the chip is 24px beside a 22px pill.
        const sameLine = c.pill !== null && Math.abs((c.top + c.bottom) / 2 - (c.pill.top + c.pill.bottom) / 2) <= 1;
        const wrapped = c.pill !== null && c.top >= c.pill.bottom;
        report(`${label}px · the tile chip is on the pill's line or wrapped below it`, sameLine || wrapped,
          c.pill ? `chip ${c.top.toFixed(1)}-${c.bottom.toFixed(1)} vs pill ${c.pill.top.toFixed(1)}-${c.pill.bottom.toFixed(1)}${wrapped ? " (wrapped)" : ""}` : "no status pill before it");
        const overBar = c.bar !== null && c.right > c.bar.left && c.left < c.bar.right
          && c.bottom > c.bar.top && c.top < c.bar.bottom;
        report(`${label}px · the tile chip does not paint over the bar`, c.bar !== null && !overBar,
          c.bar ? `chip ${c.left.toFixed(1)}-${c.right.toFixed(1)} vs bar ${c.bar.left.toFixed(1)}-${c.bar.right.toFixed(1)}` : "no bar found");
        // The chip must not buy its room from the progress bar either.
        report(`${label}px · the tile's bar keeps its width beside the chip`,
          c.bar !== null && c.bar.right - c.bar.left >= 40,
          c.bar ? `bar ${(c.bar.right - c.bar.left).toFixed(1)}px` : "no bar found");
        report(`${label}px · the tile chip stays inside its tile`,
          c.tileRight !== null && c.right <= c.tileRight, `chip right ${c.right.toFixed(1)} vs tile ${c.tileRight?.toFixed(1)}`);
      }
      await ctx.close();
    }

    // 5 · A RANGE. The walked deck is whatever the account lists first, and on local-dev that is a
    // single bracket, where "the high mark is dimmed" and "no Split" hold on any build. So a deck
    // whose STORED reading is an unanswered range is found by query and its header read as it
    // stands. It is read-only, with no press, so nothing here needs putting back. No such deck FAILS
    // the run rather than passing it: the range is half of what the chip draws.
    for (const { label, viewport } of WIDTHS.filter((w) => w.label !== 700)) {
      const ctx = await browser.newContext({ viewport });
      const p = await ctx.newPage();
      await signIn(p);
      const userId = await p.evaluate(() => window.Clerk.user.id);
      const candidates = await sqlc`
        select dp.deck_id from deck_profiles dp join decks d on d.id = dp.deck_id
        where d.user_id = ${userId} and dp.user_id = ${userId}
          and cardinality(dp.permits) = 2 and d.declared_bracket is null
        order by dp.deck_id limit 6`;
      let range = null;
      for (const { deck_id } of candidates) {
        await p.goto(`${BASE}/decks/${deck_id}`, { waitUntil: "domcontentloaded" });
        await p.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 });
        await p.waitForTimeout(600);
        const [c] = await chips(p, "button[aria-label^='Bracket:']");
        if (c && c.markOpacity.length === 2) { range = c; break; }
      }
      if (report(`${label}px · a range deck draws its header chip`, range !== null,
          range ? range.text : `${candidates.length} stored range(s), none drew two marks`)) {
        report(`${label}px · the range chip names both brackets`, / or /.test(range.text) && !/Split|\//.test(range.text), range.text);
        report(`${label}px · the range chip dims the high mark alone`,
          Math.abs(range.markOpacity[0] - 1) < 0.01 && Math.abs(range.markOpacity[1] - 0.65) < 0.01,
          `opacity ${range.markOpacity.join(", ")}`);
        report(`${label}px · the range chip is ${chipPx(label)}px`, Math.abs(range.h - chipPx(label)) < 0.6, `${range.h}px`);
      }
      await ctx.close();
    }
  } finally {
    // EACH STEP ON ITS OWN, so one failing cannot skip the rest: a thrown profile restore used to
    // leave the browser open as well. The first failure is reported after all of them have run.
    const failed = [];
    const step = async (name, fn) => {
      try {
        await fn();
      } catch (error) {
        failed.push(`${name}: ${error?.message ?? error}`);
      }
    };
    await step("put back the prior analysis", async () => {
      if (restoreProfile) await restoreProfile();
    });
    await step("close the browser", () => browser.close());
    for (const f of failed) report("cleanup", false, f);
  }
}

await run();
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
