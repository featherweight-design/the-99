// probe:description-tag-box — the `[[` card tag in a deck's description box (card-tags PR 3), at 1300x900 and 390x844.
// Three facts about a laid-out page and a real save, which jsdom does not produce:
//
// 1. THE LIST OPENS FROM THE BOX and is painted on top, inside the window. Typing `[[Sol Ri` offers Sol Ring.
// 2. A PICK DRAWS AS THE NAME, never the stored form: the box holds `Sol Ring`, not `[[<id>|Sol Ring]]`.
// 3. THE SAVE STORES PLAIN WORDS. Blurring the box (or pressing Save in the Suggested changes editor) saves; the
//    deck's `intent` column then holds the card's name and no `[[`.
//
// Needs a server with TUNING_ENABLED, ANALYSIS_TAB_ENABLED true, signed in as E2E_AUDIT_USER_EMAIL, and one of that
// account's decks (DESCRIPTION_DECK) on which the description box is offered (no analysis run yet, or one that has the
// "Describe your deck" row). It WRITES the deck's `intent` and puts it back, so it FAILS CLOSED: the server must be on
// this machine, and the database the worktree's .env names must not report the production or staging Neon branch.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { Pool } from "@neondatabase/serverless";
import { chromium } from "playwright";

import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DESCRIPTION_DECK: DECK, DATABASE_URL } =
  requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DESCRIPTION_DECK", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const FORBIDDEN = new Set(["br-noisy-violet-a6vw4ess", "br-polished-pond-a6e63y0b"]);
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`refusing: PROBE_BASE must be a server on this machine, got ${BASE}`);
  process.exit(2);
}
const pool = new Pool({ connectionString: DATABASE_URL });
const [{ branch }] = (await pool.query("select current_setting('neon.branch_id', true) as branch")).rows;
if (!branch || FORBIDDEN.has(branch)) {
  console.error(`refusing: DATABASE_URL names ${branch ?? "(unknown)"}; point it at local-dev or a scratch branch`);
  process.exit(2);
}
const owner = (await pool.query("select user_id as u from decks where id = $1", [DECK])).rows[0]?.u;
const stored = async () => (await pool.query("select intent as v, intent_seeded as s, last_edited_at as e from decks where id = $1", [DECK])).rows[0];
const original = await stored();
if (!original) { console.error(`refusing: deck ${DECK} is not in this database`); process.exit(2); }

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail === undefined ? "" : ` - ${JSON.stringify(detail)}`}`);
  if (!ok) failures += 1;
};

async function signIn(page) {
  await clerkSetup();
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  await page.evaluate(async (email) => {
    const s = window.Clerk.client.signIn;
    let a = await s.create({ identifier: email });
    const f = a.supportedFirstFactors.find((x) => x.strategy === "email_code");
    await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f.emailAddressId });
    a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    await window.Clerk.setActive({ session: a.createdSessionId });
  }, EMAIL);
  const me = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (me !== owner) throw new Error(`${EMAIL} is ${me}, but deck ${DECK} belongs to ${owner}; name one of that account's decks`);
}

const browser = await chromium.launch();
try {
  for (const w of [{ label: 1300, width: 1300, height: 900 }, { label: 390, width: 390, height: 844 }]) {
    await pool.query("update decks set intent = null, intent_seeded = false where id = $1", [DECK]);
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
    const page = await ctx.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
    await onPageRole(page, "tab", /analysis/i).first().click();
    // The empty state draws the field itself; a deck with a run draws a "Describe your deck →" row that opens an editor.
    const field = onPageRole(page, "combobox", /Describe your deck|Deck description/);
    const opener = onPageRole(page, "button", /Describe your deck →/);
    // The hub draws a tile per tool when two or more are on; the description lives under Suggested changes.
    const tile = onPage(page, "button[data-tool-tile='suggested']");
    await Promise.race([tile.waitFor({ timeout: 60_000 }), field.first().waitFor({ timeout: 60_000 }), opener.first().waitFor({ timeout: 60_000 })]);
    if (await tile.count()) await tile.click();
    await Promise.race([field.first().waitFor({ timeout: 60_000 }), opener.first().waitFor({ timeout: 60_000 })]).catch(async (e) => {
      await page.screenshot({ path: process.env.PROBE_SHOT ?? "/tmp/description-tag-box-fail.png", fullPage: true });
      throw e;
    });
    const viaEditor = (await field.count()) === 0;
    if (viaEditor) await opener.first().click();
    const box = field.first();
    await box.waitFor({ timeout: 30_000 });

    await box.click();
    await page.keyboard.type("Rocks: [[Sol Ri");
    const option = onPageRole(page, "option", /Sol Ring/);
    await option.first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(800);
    const geometry = await onPageRole(page, "listbox").evaluate((ul) => {
      const l = ul.getBoundingClientRect();
      const first = ul.querySelector('[role="option"]').getBoundingClientRect();
      const hit = document.elementFromPoint(first.left + first.width / 2, first.top + Math.min(first.height / 2, 10));
      return { top: Math.round(l.top), bottom: Math.round(l.bottom), onTop: Boolean(hit && ul.contains(hit)), viewH: window.innerHeight };
    });
    check(`${w.label} the list opens from [[ and its first option is painted on top`, geometry.onTop && geometry.top >= 0 && geometry.bottom <= geometry.viewH, geometry);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/description-tag-box-${w.label}.png` });

    await option.first().dispatchEvent("mousedown");
    const written = await box.inputValue();
    check(`${w.label} a pick draws the card's name, never the stored form`, written.includes("Sol Ring") && !/\[\[[0-9a-f-]{36}/.test(written), written);

    if (viaEditor) await onPageRole(page, "button", "Save").first().click();
    else await page.keyboard.press("Tab");
    let row = await stored();
    for (let i = 0; i < 100 && row.v === null; i += 1) { await page.waitForTimeout(100); row = await stored(); }
    check(`${w.label} the save stores the card's name as plain words`, typeof row.v === "string" && row.v.includes("Sol Ring") && !row.v.includes("[["), row.v);
    await ctx.close();
  }
} finally {
  await browser.close();
  await pool.query("update decks set intent = $2, intent_seeded = $3, last_edited_at = $4 where id = $1", [DECK, original.v, original.s, original.e]);
  await pool.end();
}
if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nAll checks passed.");
