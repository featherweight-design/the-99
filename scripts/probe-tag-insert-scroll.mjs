// probe:tag-insert-scroll — pressing a box's `[[ ]]` button must not move the page away from the box, at 1300x900
// and 390x844 (touch). Hugh, 2026-10-20: the press "scrolls the page down, often taking the field out of view".
//
// For each box that draws the button (deck Notes, the deck's description box on Analysis, Help me choose's
// "Anything else?"), the probe brings the box into view, presses the button the way the reader does (a tap on a
// phone, a click on a desktop), twice (caret already in the box, and from outside it), waits out the picker's
// reveal, and checks two facts on a laid-out page:
//
// 1. THE FIELD STAYS IN VIEW: its box is inside the visible viewport and nothing is painted over it after the press.
// 2. THE PAGE DOES NOT JUMP: with the open list's room under the field it does not move at all; without it, it
//    moves no further than bringing the field to the top of the view (K9).
// 3. THE FILLED LIST IS SEEN: after typing a name, the list (uncapped from `md`) ends inside the visible area.
//
// TAG_SCROLL_ROOM=1 adds 2000px under <main>, so a short page's end cannot cut a scroll short and hide a jump.
//
// It types into boxes and submits none (Help me choose's Find is never pressed). The description box saves on
// blur, so the probe puts back what it held before leaving it: at most it re-saves the same words. Run it against
// local-dev or a scratch branch, signed in as E2E_AUDIT_USER_EMAIL.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// The description box saves on blur, so the server must be one on this machine (pointed at local-dev or a scratch branch).
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`refusing: PROBE_BASE must be a server on this machine, got ${BASE}`);
  process.exit(2);
}
let DECK = process.env.TAG_SCROLL_DECK;
// The picker's own room rule: the open list's phone cap and its gap (`LIST_ROOM_PX` in card-tag-picker.tsx).
const LIST_ROOM_PX = 224;

const VIEWPORTS = [
  { label: "1300", width: 1300, height: 900, touch: false },
  { label: "390", width: 390, height: 844, touch: true },
];

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail === undefined ? "" : ` - ${JSON.stringify(detail)}`}`);
  if (!ok) failures += 1;
};

async function signIn(page) {
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
}

/** Where the field and the page stand: the field's box against the visible viewport, below the page's scroll padding. */
const measure = (field) =>
  field.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const vv = window.visualViewport;
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const top = (vv?.offsetTop ?? 0) + pad;
    const bottom = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight);
    // What is painted over the field's first line: the field itself, or a bar pinned over it.
    const x = r.left + Math.min(r.width / 2, 40), y = r.top + Math.min(r.height / 2, 12);
    const hit = document.elementFromPoint(x, y);
    const covered = !(hit && (el === hit || el.contains(hit) || hit.contains(el))) ? (hit?.closest("header,nav,[class*=sticky],[class*=fixed]")?.outerHTML.slice(0, 120) ?? hit?.tagName ?? "nothing") : null;
    return { covered, scrollY: Math.round(window.scrollY), top: Math.round(r.top), bottom: Math.round(r.bottom), viewTop: Math.round(top), viewBottom: Math.round(bottom), focused: document.activeElement === el };
  });

async function press(page, button, touch) {
  if (touch) await button.tap();
  else await button.click();
  // The picker's reveal waits a beat, then eases; a second is past the longest one.
  await page.waitForTimeout(1500);
}

/** Presses the button twice: once with the caret already in the box, once from outside it (cold). */
async function probeBox(page, label, field, button, touch) {
  const held = await field.inputValue();
  for (const cold of [false, true]) {
    await pressOnce(page, `${label}${cold ? " (cold)" : ""}`, field, button, touch, cold);
    await field.fill(held);
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForTimeout(300);
  }
}

async function pressOnce(page, label, field, button, touch, cold) {
  // Room under the page, so a scroll the press makes is never cut short by the page's end: a short deck page hid it.
  if (process.env.TAG_SCROLL_ROOM) await page.evaluate(() => {
    if (document.getElementById("probe-room")) return;
    const room = document.createElement("div");
    room.id = "probe-room";
    room.style.height = "2000px";
    document.querySelector("main")?.append(room);
  });
  await field.scrollIntoViewIfNeeded();
  if (cold) {
    // The reader presses the button without first going into the box: the press itself puts the caret there.
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  } else if (touch) await field.tap();
  else await field.click();
  await page.waitForTimeout(1200);
  const before = await measure(field);
  await press(page, button, touch);
  const after = await measure(field);
  const inView = after.top >= after.viewTop - 1 && after.bottom <= after.viewBottom + 1 && after.covered === null;
  check(`${label}: the field is still in view after [[ ]]`, inView, { before, after });
  // A field with the list's room under it in the visible area stays put; one without may be brought up to the top
  // of the view (K9), never past it.
  const moved = after.scrollY - before.scrollY;
  const roomy = before.bottom + LIST_ROOM_PX <= before.viewBottom;
  const allowed = roomy ? 1 : Math.max(0, before.top - before.viewTop) + 2;
  check(`${label}: the page ${roomy ? "does not move (the list has room)" : "moves no further than the field's top"}`, Math.abs(moved) <= allowed, { moved, allowed });
  check(`${label}: the field keeps focus and holds the open tag`, after.focused && (await field.inputValue()).includes("[["));
  if (!cold) {
    // A name typed in fills the list (from `md` it has no cap): it must still end inside the visible area.
    await page.keyboard.type("So");
    await page.waitForTimeout(2000);
    const list = await page.evaluate(() => {
      const ul = document.querySelector('[role="listbox"][id$="-list"]');
      const vv = window.visualViewport;
      return ul ? { bottom: Math.round(ul.getBoundingClientRect().bottom), options: ul.querySelectorAll('[role="option"]').length, viewBottom: Math.round((vv?.offsetTop ?? 0) + (vv?.height ?? innerHeight)) } : null;
    });
    check(`${label}: the filled list ends inside the visible area`, list !== null && list.options > 0 && list.bottom <= list.viewBottom + 1, list);
  }
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/tag-insert-scroll-${label.replace(/\W+/g, "-")}.png` });
}

const browser = await chromium.launch();
await clerkSetup();
try {
  for (const w of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.touch, isMobile: w.touch });
    const page = await ctx.newPage();
    await signIn(page);

    let deck = DECK;
    if (!deck) {
      await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
      await onPage(page, 'a[href^="/decks/"]').first().waitFor({ timeout: 60_000 });
      const href = await onPage(page, 'a[href^="/decks/"]').filter({ hasNot: page.locator('[href="/decks/new"]') }).evaluateAll((as) =>
        as.map((a) => a.getAttribute("href")).find((h) => /^\/decks\/[0-9a-f-]{36}/.test(h)));
      deck = href?.match(/^\/decks\/([0-9a-f-]{36})/)?.[1];
    }
    if (!deck) throw new Error("no deck to probe; set TAG_SCROLL_DECK");
    DECK = deck;

    // Deck Notes.
    await page.goto(`${BASE}/decks/${deck}`, { waitUntil: "domcontentloaded" });
    const segment = onPage(page, "button").filter({ hasText: /^Notes/ }).first();
    await segment.waitFor({ timeout: 60_000 });
    await segment.click();
    const panel = onPage(page, 'section[aria-label="Notes"]');
    await panel.waitFor({ timeout: 30_000 });
    await probeBox(page, `${w.label} deck notes`, panel.locator('[role="combobox"]').first(), panel.getByRole("button", { name: "Insert a card tag" }), w.touch);

    // The deck's description box, on the Analysis tab (the empty state, or Suggested changes' editor).
    await page.goto(`${BASE}/decks/${deck}`, { waitUntil: "domcontentloaded" });
    await onPageRole(page, "tab", /analysis/i).first().click();
    const desc = onPage(page, "#deck-description-field");
    const tile = onPage(page, "button[data-tool-tile='suggested']");
    const opener = onPageRole(page, "button", /Describe your deck →/);
    await Promise.race([tile.waitFor({ timeout: 60_000 }), desc.waitFor({ timeout: 60_000 }), opener.first().waitFor({ timeout: 60_000 })]);
    if (await tile.count()) await tile.click();
    await Promise.race([desc.waitFor({ timeout: 30_000 }), opener.first().waitFor({ timeout: 30_000 })]);
    if ((await desc.count()) === 0) await opener.first().click();
    await desc.waitFor({ timeout: 30_000 });
    const descButton = desc.locator("xpath=ancestor::*[.//button[@aria-label='Insert a card tag']][1]").getByRole("button", { name: "Insert a card tag" });
    // The box saves on blur; probeBox puts back what it held after each press, so a save writes the same words.
    await probeBox(page, `${w.label} deck description`, desc, descButton, w.touch);

    // Help me choose's "Anything else?".
    await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "domcontentloaded" });
    const extraButton = onPageRole(page, "button", "Insert a card tag").first();
    if (await extraButton.waitFor({ timeout: 30_000 }).then(() => true, () => false)) {
      const extra = extraButton.locator("xpath=ancestor::*[.//textarea or .//input[@role='combobox']][1]").locator("textarea, input[role='combobox']").first();
      await probeBox(page, `${w.label} help me choose`, extra, extraButton, w.touch);
    } else console.log(`  --   ${w.label} help me choose: no [[ ]] button drawn (switch off?)`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nAll checks passed.");
