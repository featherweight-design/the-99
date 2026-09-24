// What the deck is for, in the deck header, and the Games tab's pointer to Suggested changes,
// measured in a real browser at 1300x900 and 390x844 (placement addendum r3 E2/E2b; r1 C1/C2).
//
// THE HEADER LINE: drawn SECOND, between the deck's name and the commander line, by geometry
// rather than document order, since both widths' headers stay mounted and only one is drawn. It
// WRAPS AND NEVER TRUNCATES: the fixture line is long enough to need two lines at 390, and the
// check is that the drawn box holds all of it (no `scrollHeight` past `clientHeight`, no ellipsis)
// and that it took more than one line. A deck with no line draws no row at all.
//
// THE POINTER: on the Games tab, after the findings, only over a reading and a game. Pressing
// its link lands on the Analysis tab with Suggested changes drawn.
//
// It writes the fixture deck's `intent` and one game, capturing the intent first and restoring
// it, and deleting the game, in a `finally`. The deck is one with a stored reading. Needs a server
// with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`, NEVER production.
//
//   PROBE_BASE=http://localhost:3047 node scripts/probe-intent-line.mjs
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
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];
// 105 characters, under the 120 cap and long enough to need two lines at 390.
const LINE = "Grind a four-person table out, keep the removal for whoever is ahead, and win late once the board runs dry";

async function findDeck(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`${PAGE} a[href^='/decks/']`, { timeout: 20_000 }).catch(() => {});
  const ids = await page.evaluate((scope) =>
    [...(document.querySelector(scope)?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href").split("/")[2])
      .filter((id) => /^[0-9a-f-]{36}$/.test(id)), PAGE);
  if (ids.length === 0) return null;
  const rows = await sql`
    select d.id, d.user_id, d.intent, d.intent_seeded from decks d join deck_profiles p on p.deck_id = d.id
    where d.id = any(${ids}::uuid[]) order by d.id limit 1`;
  return rows[0] ?? null;
}

/** Both widths' headers stay mounted and only one is drawn, so wait for a DRAWN match. */
const waitDrawn = (page, selector) =>
  page.waitForFunction(
    ([scope, sel]) => [...(document.querySelector(scope)?.querySelectorAll(sel) ?? [])]
      .some((el) => el.getBoundingClientRect().width > 0),
    [PAGE, selector],
    { timeout: 30_000 },
  );

const readHeader = (page) =>
  page.evaluate((scope) => {
    const root = document.querySelector(scope);
    const drawn = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).display !== "none"
      && el.getBoundingClientRect().width > 0;
    const line = [...root.querySelectorAll("[data-deck-intent]")].find(drawn);
    const title = [...root.querySelectorAll("[data-deck-title]")].find(drawn);
    const meta = [...root.querySelectorAll("[data-spine-meta]")].find(drawn);
    if (!line) return { line: null };
    const text = line.querySelector("span:not([role]):not(.font-mono)") ?? line;
    const r = line.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
    return {
      line: { top: Math.round(r.top), bottom: Math.round(r.bottom) },
      title: title ? Math.round(title.getBoundingClientRect().bottom) : null,
      meta: meta ? Math.round(meta.getBoundingClientRect().top) : null,
      clipped: text.scrollHeight > text.clientHeight + 1 || getComputedStyle(text).textOverflow === "ellipsis",
      lines: Math.round(text.getBoundingClientRect().height / lineHeight),
      text: text.textContent,
    };
  }, PAGE);

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let deck = null;
  const handle = { gameId: null, restoreIntent: false };
  try {
    const page = await (await browser.newContext({ viewport: WIDTHS[0].viewport })).newPage();
    await signIn(page);
    deck = await findDeck(page);
    if (!report("an analyzed deck", deck !== null, deck ? deck.id : "none")) return;
    handle.restoreIntent = true;
    await sql`update decks set intent = null, intent_seeded = false where id = ${deck.id}`;
    for (const width of WIDTHS) {
      await page.setViewportSize(width.viewport);
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded" });
      await waitDrawn(page, "[data-deck-title]");
      const none = await readHeader(page);
      report(`${width.label}: no line, no row`, none.line === null, none.line ? "a row drawn" : "absent");
    }
    await sql`update decks set intent = ${LINE}, intent_seeded = false where id = ${deck.id}`;
    const [g] = await sql`
      insert into deck_games (deck_id, user_id, result, pod_size) values (${deck.id}, ${deck.user_id}, 'win', 4) returning id`;
    handle.gameId = g.id;
    for (const width of WIDTHS) {
      await page.setViewportSize(width.viewport);
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded" });
      await waitDrawn(page, "[data-deck-intent]");
      const h = await readHeader(page);
      const tag = `${width.label}`;
      if (!report(`${tag}: the line is drawn`, h.line !== null, h.line ? `at ${h.line.top}px` : "not drawn")) continue;
      report(`${tag}: second, under the name`, h.title !== null && h.line.top >= h.title - 1, `name ends ${h.title}px, line starts ${h.line.top}px`);
      // 4px under the name on desktop and 5px on a phone (V2:141, :154). The phone column already
      // spaces its rows 6px apart, so a line adding its own margin on top reads 11.
      const gap = h.title === null ? null : h.line.top - h.title;
      const want = width.label === 390 ? 5 : 4;
      report(`${tag}: ${want}px under the name`, gap !== null && Math.abs(gap - want) <= 1, `${gap}px`);
      report(`${tag}: above the commander line`, h.meta !== null && h.line.bottom <= h.meta + 1, `line ends ${h.line.bottom}px, commander line ${h.meta}px`);
      report(`${tag}: whole, never truncated`, !h.clipped && h.text === LINE, h.clipped ? "clipped" : "whole");
      if (width.label === 390) report(`${tag}: wraps rather than truncating`, h.lines >= 2, `${h.lines} lines`);

      const games = onPageRole(page, "tab", /games/i).first();
      await games.click();
      const link = onPageRole(page, "button", "It is on the Analysis tab \u2192").first();
      const shown = await link.waitFor({ timeout: 15_000 }).then(() => true, () => false);
      if (report(`${tag}: the Games tab points at Suggested changes`, shown, shown ? "drawn" : "absent")) {
        await link.click();
        const landed = await page.waitForFunction(
          (scope) => [...(document.querySelector(scope)?.querySelectorAll('[role="tab"][aria-selected="true"]') ?? [])]
            .some((t) => /analysis/i.test(t.textContent ?? "")),
          PAGE,
          { timeout: 15_000 },
        ).then(() => true, () => false);
        report(`${tag}: the pointer lands on the Analysis tab`, landed, landed ? "Analysis selected" : "not reached");
      }
    }
  } finally {
    if (handle.gameId) await sql`delete from deck_games where id = ${handle.gameId}`.catch((e) => console.error("cleanup game:", e));
    if (handle.restoreIntent && deck) {
      await sql`update decks set intent = ${deck.intent}, intent_seeded = ${deck.intent_seeded} where id = ${deck.id}`
        .catch((e) => console.error("cleanup intent:", e));
    }
    await browser.close();
  }
}

await run().catch((error) => {
  console.error(error);
  failures += 1;
});
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
