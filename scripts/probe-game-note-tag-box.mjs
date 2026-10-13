// probe:game-note-tag-box — the `[[` card tag in the log-a-game form's note (card-tags PR 3), at 1300x900, 768x900
// and 390x844. Three facts about a laid-out page and a real save, which jsdom does not produce:
//
// 1. THE LIST OPENS FROM THE NOTE and is painted on top, inside the window, with a LATER option reachable too
//    (a list clipped by an ancestor shows only its first row).
// 2. A PICK DRAWS AS THE NAME, never the stored `[[<id>|` form.
// 3. THE SAVE STORES PLAIN WORDS: the game's `note` column holds the card's name and no `[[`.
//
// Needs a dev server signed in as E2E_AUDIT_USER_EMAIL and one of that account's decks (GAME_NOTE_DECK). It WRITES one
// game on that deck and DELETES it again in its `finally`, so it FAILS CLOSED: the server must be on this machine, and
// the database the worktree's .env names must not report the production or staging Neon branch.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { Pool } from "@neondatabase/serverless";
import { chromium } from "playwright";

import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, GAME_NOTE_DECK: DECK, DATABASE_URL } =
  requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "GAME_NOTE_DECK", "DATABASE_URL"]);
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
const MARK = "probe-game-note-tag-box";
const storedNotes = async () => (await pool.query("select id, note from deck_games where deck_id = $1 and note like $2", [DECK, `%${MARK}%`])).rows;
const wipe = async () => { await pool.query("delete from deck_games where deck_id = $1 and note like $2", [DECK, `%${MARK}%`]); };
await wipe();

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
  for (const w of [{ label: 1300, width: 1300, height: 900 }, { label: 768, width: 768, height: 900 }, { label: 390, width: 390, height: 844 }]) {
    await wipe();
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
    const page = await ctx.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
    await onPageRole(page, "tab", /games/i).first().click();
    const opener = onPageRole(page, "button", /Log your first game|Log a game/).first();
    await opener.waitFor({ timeout: 30_000 }).catch(async (e) => { await page.screenshot({ path: `${process.env.PROBE_SHOTS ?? "/tmp"}/game-note-fail.png` }); throw e; });
    await opener.click();
    await onPageRole(page, "radio", "Won").first().click();
    const note = onPageRole(page, "combobox", "Note").first();
    await note.waitFor({ timeout: 60_000 });
    await note.click();
    // "Sol" offers several cards (not only Sol Ring), so a later option is far from the first.
    await page.keyboard.type(`${MARK} [[Sol`);
    // The list floats in a portal on <body> (held to the room in the window), outside <main>.
    const floating = page.locator('body > [role="listbox"]');
    const options = floating.getByRole("option");
    await options.first().waitFor({ timeout: 10_000 });
    await page.waitForTimeout(800);
    const geometry = await floating.evaluate((ul) => {
      const l = ul.getBoundingClientRect();
      const opts = [...ul.querySelectorAll('[role="option"]')];
      const hitAt = (o) => { const r = o.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 10)); return Boolean(h && ul.contains(h)); };
      return { top: Math.round(l.top), bottom: Math.round(l.bottom), left: Math.round(l.left), right: Math.round(l.right), options: opts.length, firstOnTop: hitAt(opts[0]), laterOnTop: hitAt(opts[Math.min(opts.length, 3) - 1]), viewW: window.innerWidth, viewH: window.innerHeight };
    });
    check(`${w.label} the list is inside the window with its first and a later option painted on top`,
      geometry.top >= 0 && geometry.bottom <= geometry.viewH && geometry.left >= 0 && geometry.right <= geometry.viewW && geometry.firstOnTop && geometry.laterOnTop && geometry.options >= 2, geometry);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/game-note-tag-${w.label}.png` });

    const firstName = (await options.first().locator("span").first().innerText()).trim();
    await page.keyboard.press("Enter");
    const written = await note.inputValue();
    check(`${w.label} Enter picks the card and draws its name, never the stored form`, written.includes(firstName) && !/\[\[[0-9a-f-]{36}/.test(written), written);

    await onPageRole(page, "button", "Save this game").first().click();
    let rows = await storedNotes();
    for (let i = 0; i < 100 && rows.length === 0; i += 1) { await page.waitForTimeout(100); rows = await storedNotes(); }
    check(`${w.label} the save stores the card's name as plain words`, rows.length === 1 && rows[0].note === `${MARK} ${firstName}`, rows.map((r) => r.note));
    await ctx.close();
  }
} finally {
  await browser.close();
  await wipe();
  await pool.end();
}
if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nAll checks passed.");
