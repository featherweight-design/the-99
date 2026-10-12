// Deck notes in a real browser at 1300x900 and 390x844: open the Notes segment, add a note with a `[[` tag
// picked from the picker, press the tag (card details open), select the note (it moves under Done (1)),
// unselect it, edit it in place, and delete it behind the confirm. At 390 it also proves the sticky add bar
// and the tab bar step aside while the field has focus. It then empties the deck (commander only) and proves
// Notes is still reachable there: a note adds, All brings the empty state back, and the note is still kept
// after a reload.
//
// It WRITES: it creates a deck of its own under the signed-in account (three catalog cards), walks the notes
// on it, and deletes the deck (notes and cards cascade) in a `finally`. It refuses staging, production and an unknown branch before the first write by
// `neon.branch_id`. Point DATABASE_URL (and the server it names) at local-dev, never production.
// Needs the server started with DECK_NOTES_ENABLED=true.
//
// Run: PROBE_BASE=http://localhost:3201 node scripts/probe-deck-notes.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, markEveryEntrySeen, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failures += 1;
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
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
  return page.evaluate(() => window.Clerk.user.id);
}

let deckId = null;
let verified = false;
let aboutCapture = null;

async function walk(browser, label, viewport, card) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600 && !process.env.NO_TOUCH });
  const page = await context.newPage();
  try {
    await walkIn(page, label, card);
  } catch (error) {
    // PROBE_SHOTS=<dir> keeps a picture of where a step stopped.
    if (process.env.PROBE_SHOTS) {
      console.log("panel:", JSON.stringify((await page.locator('section[aria-label="Notes"]').first().innerText().catch(() => "(no panel)")).slice(0, 260)));
      console.log("deck still exists:", JSON.stringify(await sql`select count(*)::int as n from decks where id = ${deckId}::uuid`));
      console.log("db:", JSON.stringify(await sql`select left(body, 40) as body, done_at is not null as done from deck_notes where deck_id = ${deckId}::uuid`));
    }
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/deck-notes-${label}-failed.png` });
    throw error;
  } finally {
    await context.close();
  }
}

// The (i) on a phone, pressed the way a thumb does it with the field focused (the tab bar stepped aside for the
// focus): the tip opens on the press itself, with no delay, and sits fully above the field, clear of the tab bar
// the blur would otherwise bring back and of the top of the screen (Hugh, 2026-10-12: it drew below the field,
// behind the bar, a beat after the press).
async function phoneTip(page, panel, label, shot) {
  const field = panel.getByRole("combobox");
  await field.tap();
  await page.evaluate(() => {
    const w = window;
    w.__tip = { down: null, shown: null };
    const tip = document.querySelector('section[aria-label="Notes"] [role="tooltip"]');
    document.addEventListener("pointerdown", (e) => { if (e.target.closest('[aria-label="How card tags work"]')) w.__tip.down ??= performance.now(); }, { capture: true });
    new MutationObserver(() => { if (w.__tip.down !== null && !tip.hidden) w.__tip.shown ??= performance.now(); }).observe(tip, { attributes: true, attributeFilter: ["hidden"] });
  });
  check(`${label}: the tip starts closed`, await page.evaluate(() => document.querySelector('section[aria-label="Notes"] [role="tooltip"]').hidden));
  // Hold the finger down: a popover that waits for the lift (the click) is not open while the thumb is still on it.
  const cdp = await page.context().newCDPSession(page);
  const at = await panel.getByRole("button", { name: "How card tags work" }).boundingBox();
  const point = [{ x: at.x + at.width / 2, y: at.y + at.height / 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point });
  await page.waitForTimeout(150);
  const tip = panel.getByRole("tooltip");
  check(`${label}: the tip is open while the finger is still down`, await tip.isVisible());
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400);
  check(`${label}: the tip stays open after the lift`, await tip.isVisible());
  const m = await page.evaluate(() => {
    const t = document.querySelector('section[aria-label="Notes"] [role="tooltip"]').getBoundingClientRect();
    const f = document.querySelector('section[aria-label="Notes"] input[role="combobox"]').getBoundingClientRect();
    const bars = [...document.querySelectorAll("[data-hide-on-note-focus]")].filter((el) => getComputedStyle(el).display !== "none").map((el) => el.getBoundingClientRect());
    const hit = bars.some((b) => t.bottom > b.top && t.top < b.bottom && t.right > b.left && t.left < b.right);
    return { top: t.top, bottom: t.bottom, left: t.left, right: t.right, fieldTop: f.top, vw: innerWidth, vh: innerHeight, hit, delay: window.__tip.down === null || window.__tip.shown === null ? null : window.__tip.shown - window.__tip.down };
  });
  check(`${label}: the tip sits above the field`, m.bottom <= m.fieldTop + 0.5, JSON.stringify(m));
  check(`${label}: the tip is fully on screen`, m.top >= 0 && m.left >= 0 && m.right <= m.vw + 0.5 && m.bottom <= m.vh, JSON.stringify(m));
  check(`${label}: the tip is not under a bar`, !m.hit, JSON.stringify(m));
  check(`${label}: the tip opens on the press, not after the lift`, Number.isFinite(m.delay) && m.delay >= 0 && m.delay < 40, `${m.delay}ms`);
  await shot("tip-phone");
  await page.keyboard.press("Escape");
  await page.mouse.click(5, 5);
}

async function walkIn(page, label, card) {
  await signIn(page);
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const segment = onPage(page, "button").filter({ hasText: /^Notes/ }).first();
  await segment.waitFor({ timeout: 30_000 });
  await segment.click();
  const panel = onPage(page, 'section[aria-label="Notes"]');
  const field = panel.getByRole("combobox", { name: "Add a note" });
  await field.waitFor();
  check(`${label}: an empty deck draws the empty state`, (await panel.getByText("The swap you meant to try.").count()) === 1);
  const shot = (name) => process.env.PROBE_SHOTS ? page.screenshot({ path: `${process.env.PROBE_SHOTS}/deck-notes-${label}-${name}.png` }) : null;
  await shot("empty");

  // Pressing into the field must change nothing around it (Hugh, 2026-10-12): the box keeps its size and
  // place, the page keeps its height, the count and the hint are already drawn, and on a phone the sticky
  // add-card bar is not there at all while a note's panel is open.
  const geometry = () => page.evaluate(() => {
    const input = document.querySelector('section[aria-label="Notes"] input[role="combobox"]');
    const r = input.getBoundingClientRect();
    return { w: r.width, h: r.height, x: r.x, top: r.top + window.scrollY, doc: document.documentElement.scrollHeight };
  });
  const same = (a, b) => ["w", "h", "x", "top", "doc"].every((k) => Math.abs(a[k] - b[k]) <= 0.5);
  const counterShown = () => panel.getByText(/^\d+ \/ 140$/).first().isVisible();
  const hintShown = () => panel.getByText(/^Enter adds/).first().isVisible();
  const before = await geometry();
  check(`${label}: the count is drawn before the field has focus`, await counterShown());
  if (label === "1300") check("1300: the hint is drawn before the field has focus", await hintShown());
  const dock = page.getByTestId("quick-add-dock");
  if (label !== "1300") check(`${label}: the add-card bar is not drawn under Notes`, !(await dock.isVisible()));
  await field.click();
  await page.waitForTimeout(300);
  const focusedGeometry = await geometry();
  check(`${label}: focusing the field changes no size or position`, same(before, focusedGeometry), JSON.stringify({ before, focusedGeometry }));
  await field.pressSequentially("swap in a card to test then another");
  const typed = await geometry();
  check(`${label}: typing does not resize or move the field`, ["w", "h", "x", "top"].every((k) => Math.abs(before[k] - typed[k]) <= 0.5), JSON.stringify({ before, typed }));
  await field.fill("");
  await shot("focused");

  // The tip fits the viewport: on a phone it spans the field, not a box the size of the (i).
  await panel.getByRole("button", { name: "How card tags work" }).click();
  const tip = panel.getByRole("tooltip");
  await tip.waitFor({ state: "visible" });
  const box = await tip.boundingBox();
  const vw = page.viewportSize().width;
  check(`${label}: the tag tip sits inside the viewport`, box.x >= 0 && box.x + box.width <= vw + 0.5, JSON.stringify({ box, vw }));
  check(`${label}: the tag tip is wide enough to read`, box.width >= Math.min(280, vw - 40), `width ${Math.round(box.width)}`);
  await shot("tip");
  await page.keyboard.press("Escape");
  await page.mouse.click(5, 5);
  if (label !== "1300" && !process.env.SKIP_PT) await phoneTip(page, panel, label, shot);

  // [[ ]] then a pick: one finished tag and no stray `]]`.
  await panel.getByRole("button", { name: "Insert a card tag" }).click();
  // Typing before the insert has landed its focus and caret writes the letters around the brackets (`R[oad[]]`).
  await page.waitForFunction(() => { const i = document.activeElement; return i?.getAttribute("role") === "combobox" && i.value === "[[]]" && i.selectionStart === 2; });
  await field.pressSequentially(card.slice(0, 4));
  await page.getByRole("option", { name: new RegExp(card) }).first().waitFor();
  await page.keyboard.press("Enter");
  const value = await field.inputValue();
  check(`${label}: the [[ ]] button then a pick leaves one tag and no stray ]]`, (value.match(/\]\]/g) ?? []).length === 1, JSON.stringify(value));
  await field.fill("");

  await field.click();
  await field.pressSequentially(`swap in [[${card.slice(0, 4)}`);
  const option = page.getByRole("option", { name: new RegExp(card) }).first();
  await option.waitFor();
  check(`${label}: the picker offers the deck's card first`, (await page.getByRole("option").first().textContent())?.includes(card) ?? false);
  if (label !== "1300") {
    const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-hide-on-note-focus]")].every((el) => getComputedStyle(el).display === "none"));
    check(`${label}: the add bar and the tab bar step aside while the field has focus`, hidden);
  }
  await page.keyboard.press("Enter");
  await panel.getByRole("button", { name: "Add", exact: true }).click();
  const tag = panel.getByRole("button", { name: `${card}, card details` });
  await tag.waitFor({ timeout: 30_000 });
  check(`${label}: the added note draws the tag`, true);
  check(`${label}: the field cleared`, (await field.inputValue()) === "");
  check(`${label}: the mark and its pitch stay above the list once a note exists`, (await panel.getByText("The swap you meant to try.").count()) === 1);
  await shot("with-note");

  await tag.click();
  await page.locator('[role="dialog"]').last().waitFor({ timeout: 30_000 });
  check(`${label}: pressing the tag opens card details`, true);
  await page.keyboard.press("Escape");

  await panel.getByRole("checkbox").first().click();
  const doneToggle = panel.getByRole("button", { name: /Done \(1\)/ });
  await doneToggle.waitFor({ timeout: 30_000 });
  check(`${label}: selecting a note moves it under Done (1), closed`, (await panel.getByRole("checkbox").count()) === 0);
  await doneToggle.click();
  await panel.getByRole("checkbox").first().click();
  await panel.getByRole("checkbox", { checked: false }).waitFor({ timeout: 30_000 });
  check(`${label}: unselecting puts it back on the list`, true);

  const rowButtons = label !== "1300"
    ? async (name) => { await panel.getByRole("button", { name: "More for this note" }).click(); await panel.getByRole("button", { name, exact: true }).click(); }
    : async (name) => { await panel.getByRole("button", { name: name === "Edit" ? "Edit this note" : "Delete this note" }).click(); };
  await rowButtons("Edit");
  const edit = panel.getByRole("combobox", { name: "Edit this note" });
  await edit.fill("changed");
  await panel.getByRole("button", { name: "Save" }).click();
  await panel.getByText("changed", { exact: true }).waitFor({ timeout: 30_000 });
  check(`${label}: an edit saves in place`, true);

  await rowButtons("Delete");
  await panel.getByRole("button", { name: "Delete", exact: true }).click();
  // The pitch stays, so the write landing is the row leaving the list.
  await panel.getByRole("checkbox").first().waitFor({ state: "detached", timeout: 30_000 });
  check(`${label}: delete asks first, then removes the note`, (await sql`select count(*)::int as n from deck_notes where deck_id = ${deckId}::uuid`)[0].n === 0);
}

// The same deck with its cards removed: a commander-only list draws the empty state, which used to carry no
// All / Shopping / Notes control, so Notes was unreachable and kept notes hid.
async function walkEmpty(browser, label, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600 && !process.env.NO_TOUCH });
  const page = await context.newPage();
  try {
    await signIn(page);
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
    const segment = onPage(page, "button").filter({ hasText: /^Notes/ }).first();
    await segment.waitFor({ timeout: 30_000 });
    check(`${label}: an empty deck draws the Notes control`, true);
    await segment.click();
    const panel = onPage(page, 'section[aria-label="Notes"]');
    const field = panel.getByRole("combobox", { name: "Add a note" });
    await field.waitFor();
    await field.fill(`kept on an empty deck ${label}`);
    await panel.getByRole("button", { name: "Add", exact: true }).click();
    await panel.getByText(`kept on an empty deck ${label}`).waitFor({ timeout: 30_000 });
    check(`${label}: a note adds on an empty deck`, true);
    await onPage(page, "button").filter({ hasText: /^All/ }).first().click();
    check(`${label}: All swaps the empty state back`, (await panel.count()) === 0);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/deck-notes-empty-${label}.png` });
    await page.reload({ waitUntil: "domcontentloaded" });
    const again = onPage(page, "button").filter({ hasText: /^Notes/ }).first();
    await again.waitFor({ timeout: 30_000 });
    await again.click();
    await onPage(page, 'section[aria-label="Notes"]').getByText(`kept on an empty deck ${label}`).waitFor({ timeout: 30_000 });
    check(`${label}: the kept note shows after a reload, on a deck with no cards`, true);
  } finally {
    await context.close();
  }
}

async function main() {
  const branch = (await sql`select current_setting('neon.branch_id', true) as id`)[0].id;
  if (!branch || branch === PRODUCTION || branch === STAGING || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write notes to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
  }
  verified = true;
  console.log(`branch ${branch}`);
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const probe = await browser.newContext();
    const page = await probe.newPage();
    const userId = await signIn(page);
    // An unseen About entry redirects the deck to /about; the branch was verified above as not staging or production.
    aboutCapture = await captureAboutSeen(userId);
    await markEveryEntrySeen(userId);
    await probe.close();
    // Its own deck: a shared fixture deck is rewritten by other lanes' probes on the same database, and a
    // cascade from one of theirs would delete the notes this one is walking.
    const [lead] = await sql`select oracle_id from cards where type_line ~ 'Legendary Creature' and commander_legal order by oracle_id limit 1`;
    const pool = await sql`select oracle_id, name from cards where commander_legal and layout = 'normal' and type_line !~ '(Land|Token|Basic)' and oracle_id <> ${lead.oracle_id}::uuid order by oracle_id limit 3`;
    if (pool.length < 3) throw new Error("catalog is too small, seed it first");
    const [made] = await sql`insert into decks (user_id, name, commander_oracle_id) values (${userId}, ${`probe deck notes ${Date.now()}`}, ${lead.oracle_id}::uuid) returning id`;
    deckId = made.id;
    for (const c of pool) await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${c.oracle_id}::uuid, 1)`;
    const card = pool.map((c) => c.name).sort()[0];
    await walk(browser, "1300", { width: 1300, height: 900 }, card);
    await walk(browser, "390", { width: 390, height: 844 }, card);
    await walk(browser, "413", { width: 413, height: 880 }, card);
    await sql`delete from deck_cards where deck_id = ${deckId}::uuid`;
    await walkEmpty(browser, "1300", { width: 1300, height: 900 });
    await walkEmpty(browser, "390", { width: 390, height: 844 });
  } finally {
    await browser.close();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    try {
      // The deck is the probe's own, and its notes and cards cascade with it.
      if (verified && deckId) await sql`delete from decks where id = ${deckId}::uuid`;
      // Both About columns back, so the account's later runs see the announcements it had not yet seen.
      if (aboutCapture) await restoreAboutSeen(aboutCapture);
    } catch (error) {
      failures += 1;
      console.error("cleanup failed", error);
    }
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
