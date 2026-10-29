// probe:tour — the first-run tour (discovery R3·1b), run through in a real browser at 390x844 and 1300x900.
//
// It proves what jsdom cannot: every step's cutout sits on its real control (the ring's box is the control's box plus
// its room), nothing under the scrim takes a press (the app is inert, so a click on a locked slot opens no note), the
// tour is spent once as step 1 appears (`tour_seen_at` written, and a reload shows nothing), a theme selected at step 5
// survives a skip, and step 6 stands centred with no cutout when Home draws no About line (R3 gap 6).
//
// FIXTURE. The dedicated empty account on Clerk's development instance (`onboard-probe+clerk_test@the99.app`), which
// first-run Home is drawn for. The server must run with FIRST_RUN_TOUR_ENABLED=true. Each width resets the account's
// `tour_seen_at` to null and writes nothing else of the account's but its About seen-state, which it captures first and
// restores after. It refuses staging and production by `neon.branch_id`, and refuses an account that holds cards or
// decks (`assertDisposableAccount`), whose first run it would not see.
//
// PROBE_SHOTS=<dir> also photographs every step at each width, and step 6's fallback: the tour's contact sheet, since
// the shared one signs in as an account with data, which never sees a first run.
//
// THE TOUR TAKEN AGAIN (R3·2, plan decision 6), at both widths:
//   - a first-run account whose tour is spent: `Take the tour →` at About's head lands on `/?tour=1`, which runs the
//     first-run tour itself, strips the parameter and moves no stamp;
//   - a dashboard account with cards (`E2E_AUDIT_USER_EMAIL`, the nav unlocked), through the account menu's row: step 1
//     lights the Collection slot with no precon line, Commanders and Decks are lit where the shell draws them, the
//     replay's captions show, step 6 lights the banner or nothing, and a second replay moves no stamp. The only write to
//     that account is the tour's own spend, which writes `tour_seen_at` only while it is null;
//   - a decks-only account (the dedicated account above, given one empty deck for the leg and deleted after, so its nav
//     is locked on a dashboard Home): the `once your cards are in` captions;
//   - with the switch off for the dedicated account (an ACCOUNT override on `flag_overrides`, waited past the
//     resolver's 30-second memo and deleted after): no press at About's head, no menu row, and `/?tour=1` runs nothing.
//
//   PROBE_BASE=http://localhost:3311 pnpm probe:tour
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertDisposableAccount, ONBOARD_PROBE_EMAIL } from "./lib/probe-account.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { DATABASE_URL, E2E_AUDIT_USER_EMAIL: DASHBOARD_EMAIL } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY", "E2E_AUDIT_USER_EMAIL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);
const SHOTS = process.env.PROBE_SHOTS;
const shot = async (page, vp, name) => SHOTS && page.screenshot({ path: `${SHOTS}/tour-${name}-${vp.width < 768 ? "phone" : "desktop"}.png` });
const REFUSED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess"]);

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page, email = ONBOARD_PROBE_EMAIL) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 90_000 });
  const result = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return { error: `sign-in status: ${attempt.status}` };
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return { userId: window.Clerk.user?.id };
    } catch (error) {
      return { error: error?.errors?.[0]?.longMessage ?? String(error) };
    }
  }, email);
  if (result.error) throw new Error(`Clerk sign-in failed: ${result.error}`);
  return result.userId;
}

const seenAt = async (userId) => (await sql`select tour_seen_at from user_prefs where user_id = ${userId}`)[0]?.tour_seen_at ?? null;
/** The stamp once it has committed: the tour spends itself without waiting on the write, so step 1 can show first. */
async function committedSeenAt(userId, ms = 10_000) {
  for (const end = Date.now() + ms; ; ) {
    const at = await seenAt(userId);
    if (at || Date.now() > end) return at;
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * Each step's real control at this width, and the room its cutout keeps around it. At 390 step 1 lights the card's
 * controls under the fan, and the header's account button is its 38px square inside a 3px pad (1px past the button).
 */
const controls = (phone) => ({
  collection: phone ? { sel: "[data-step1-controls]", pad: 8 } : { sel: "[data-step1-card]", pad: 8 },
  // The slots by their own label, not by the target they register, so a target on the wrong slot fails here.
  commanders: { sel: '[data-locked-slot="Commanders"]', pad: 5 },
  decks: { sel: '[data-locked-slot="Decks"]', pad: 5 },
  buying: { sel: '[data-locked-slot="Decks"]', pad: 5 },
  // The account button has one target, a box over the button (`TargetBox`).
  look: { sel: '[data-target="tour:account"]', pad: phone ? 1 : 4 },
  whatsNew: { sel: "[data-arrivals-banner] section", pad: 8 },
});

/** The ring's box against the first drawn match of the step's control, padded by its room. */
async function ringOnControl(page, key, phone) {
  const { sel, pad } = controls(phone)[key];
  // The ring glides for 240ms; read it settled.
  await page.waitForTimeout(400);
  return page.evaluate(
    ({ sel, pad }) => {
      const ring = document.querySelector("[data-tour-ring]")?.getBoundingClientRect();
      const el = [...document.querySelectorAll(sel)].find((e) => e.checkVisibility() && !e.closest("[data-tour]"));
      if (!ring || !el) return { ok: false, why: ring ? "no control drawn" : "no ring" };
      const r = el.getBoundingClientRect();
      const off = Math.max(Math.abs(ring.x - (r.x - pad)), Math.abs(ring.y - (r.y - pad)), Math.abs(ring.width - (r.width + pad * 2)), Math.abs(ring.height - (r.height + pad * 2)));
      return { ok: off <= 2, why: `off by ${off.toFixed(1)}px` };
    },
    { sel, pad },
  );
}

async function walk(browser, vp) {
  console.log(`\n${vp.label}`);
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const userId = await signIn(page);
  await assertDisposableAccount(sql, { email: ONBOARD_PROBE_EMAIL, userId, what: "probe:tour" });
  const [{ cards }] = await sql`select count(*)::int as cards from collection_items where user_id = ${userId}`;
  if (cards > 0) throw new Error(`probe:tour: ${ONBOARD_PROBE_EMAIL} holds ${cards} cards, so Home is not its first run`);
  const about = await captureAboutSeen(userId, sql);
  try {
    // About's line stays on Home for step 6.
    // A brand-new account's About state, so Home draws About's first-run line for step 6. Restored in the `finally`.
    await sql`update user_prefs set tour_seen_at = null, about_version_seen = 0, about_seen_ids = '{}' where user_id = ${userId}`;
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const card = page.locator("[data-tour-card]");
    report("the tour opens on a first-run Home", await card.waitFor({ timeout: 15_000 }).then(() => true, () => false));
    const first = await committedSeenAt(userId);
    report("tour_seen_at is written as step 1 appears", first !== null);
    // The card is hidden until measured; focus must still land on Next once it shows, so Enter advances at once.
    await page.waitForTimeout(300);
    report("Next holds focus as step 1 appears", await page.evaluate(() => document.activeElement?.closest("[data-tour-card]") !== null && document.activeElement?.textContent === "Next"));
    report("the app is inert under the scrim", await page.evaluate(() => document.querySelector("main")?.closest("[inert]") !== null));

    for (const key of ["collection", "commanders", "decks", "buying", "look", "whatsNew"]) {
      await page.waitForFunction((k) => document.querySelector(`[data-tour-card="${k}"]`), key, { timeout: 5_000 });
      const at = await ringOnControl(page, key, vp.width < 768);
      await shot(page, vp, key);
      if (key === "collection" && vp.width < 768) {
        // At 390 the page scrolls so the lit controls clear the docked card.
        const clear = await page.evaluate(() => {
          const ring = document.querySelector("[data-tour-ring]")?.getBoundingClientRect();
          const box = document.querySelector("[data-tour-card]")?.getBoundingClientRect();
          return !!ring && !!box && ring.bottom <= box.top;
        });
        report("step 1 at 390: the lit controls clear the docked card", clear);
      }
      report(`step ${key}: the cutout sits on its control`, at.ok, at.why);
      if (key === "commanders") {
        // A press where the locked slot is: the scrim and the inert app take nothing, so no note opens.
        const slot = page.locator('[data-locked-slot="Commanders"]').filter({ visible: true }).first();
        const box = await slot.boundingBox();
        if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        report("a press under the scrim does nothing", (await page.locator('[data-lock-note="open"]').count()) === 0 && (await card.count()) === 1);
      }
      if (key === "look") {
        const pick = card.getByRole("radio", { name: /^Canopy/ });
        await pick.click();
        report("step 5 applies a theme at once", (await page.evaluate(() => document.documentElement.dataset.theme)) === "ixalan");
        // The tallest step on a short screen (a phone on its side): the card stays on screen and scrolls inside.
        await page.setViewportSize({ width: vp.width, height: 375 });
        await page.waitForTimeout(300);
        const fits = await page.evaluate(() => {
          const el = document.querySelector("[data-tour-card]");
          const r = el?.getBoundingClientRect();
          return !!r && r.top >= 0 && r.bottom <= window.innerHeight && (el.scrollHeight <= el.clientHeight || getComputedStyle(el).overflowY === "auto");
        });
        report("on a 375-tall screen the card stays on screen and scrolls inside", fits);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(300);
      }
      if (key !== "whatsNew") await card.getByRole("button", { name: "Next", exact: true }).click();
    }
    // Skip from step 6; the theme chosen at step 5 stays.
    await card.getByRole("button", { name: "Skip the tour" }).click();
    report("✕ ends the tour", (await card.count()) === 0);
    report("a theme selected then skipped keeps the theme", (await page.evaluate(() => document.documentElement.dataset.theme)) === "ixalan");
    // Back to a Home the router kept from before the spend: the tab's spent mark keeps the tour from running again.
    // A client navigation, so Back restores the router's kept Home rather than loading a fresh one.
    await page.evaluate(() => window.next.router.push("/collection"));
    await page.waitForURL(/\/collection/, { timeout: 15_000 });
    await page.goBack({ waitUntil: "networkidle" });
    await page.waitForTimeout(2_000);
    report("Back to Home shows no tour", (await page.locator("[data-tour-card]").count()) === 0);
    // The tab's own spent mark would hide the tour on its own; clear it, so the reload proves the server's stamp.
    await page.evaluate((id) => sessionStorage.removeItem(`the99.tour.spent:${id}`), userId);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2_000);
    report("a reload shows no tour", (await page.locator("[data-tour-card]").count()) === 0);
    const after = await seenAt(userId);
    report("tour_seen_at is written once", after !== null && first !== null && after.getTime() === first.getTime());

    // Home with no About line: step 6 stands centred with no cutout.
    await sql`update user_prefs set tour_seen_at = null where user_id = ${userId}`;
    await clearAboutSheet(page, userId);
    // A new tour in the same tab: the tab's spent mark goes too, as a new tab would start without it.
    await page.evaluate((id) => sessionStorage.removeItem(`the99.tour.spent:${id}`), userId);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await card.waitFor({ timeout: 15_000 });
    for (let i = 0; i < 5; i++) await card.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(300);
    await shot(page, vp, "whatsNew-fallback");
    report("with no About line, step 6 lights nothing", (await page.locator("[data-tour-ring]").count()) === 0 && (await page.locator('[data-tour-card="whatsNew"]').count()) === 1);
    await page.keyboard.press("Escape");
    report("Esc ends the tour", (await card.count()) === 0);

    // Two tabs on one first-run Home, both waiting: only the tab whose claim stamps the tour opens it.
    await sql`update user_prefs set tour_seen_at = null where user_id = ${userId}`;
    await page.evaluate((id) => sessionStorage.removeItem(`the99.tour.spent:${id}`), userId);
    const second = await context.newPage();
    await Promise.all([page.goto(`${BASE}/`, { waitUntil: "networkidle" }), second.goto(`${BASE}/`, { waitUntil: "networkidle" })]);
    await Promise.all([page.bringToFront(), second.bringToFront()]);
    await page.waitForTimeout(6_000);
    const open = (await page.locator("[data-tour-card]").count()) + (await second.locator("[data-tour-card]").count());
    report("two tabs on one first-run Home open the tour once between them", open === 1, `${open} open`);
    await second.close();
  } finally {
    await restoreAboutSeen(about, sql);
    await context.close();
  }
}

// ---- The tour taken again (R3·2) ----------------------------------------------------------------------------------

/** The resolver's per-reader memo: an override is seen once it has passed. */
const MEMO_MS = 31_000;
const OVERRIDE_NOTE = "probe:tour";

/**
 * A nav slot by its own label or route, locked or live, in the rail or the tab bar: never through the target it
 * registers, so a target on the wrong slot fails here. The tab bar's live slots carry no name, so they go by route.
 */
const slot = (href, label) => `[data-locked-slot="${label}"], [data-rail-nav] a[href="${href}"], nav[data-hide-on-note-focus] a[href="${href}"]`;
const replayControls = (phone) => ({
  ...controls(phone),
  collection: { sel: slot("/collection", "Collection"), pad: 5 },
  commanders: { sel: slot("/commanders", "Commanders"), pad: 5 },
  decks: { sel: slot("/decks", "Decks"), pad: 5 },
  buying: { sel: slot("/decks", "Decks"), pad: 5 },
});

async function replayRing(page, key, phone) {
  const { sel, pad } = replayControls(phone)[key];
  await page.waitForTimeout(400);
  return page.evaluate(
    ({ sel, pad }) => {
      const ring = document.querySelector("[data-tour-ring]")?.getBoundingClientRect();
      const el = [...document.querySelectorAll(sel)].find((e) => e.checkVisibility() && !e.closest("[data-tour]"));
      if (!ring || !el) return { ok: false, why: ring ? "no control drawn" : "no ring" };
      const r = el.getBoundingClientRect();
      const off = Math.max(Math.abs(ring.x - (r.x - pad)), Math.abs(ring.y - (r.y - pad)), Math.abs(ring.width - (r.width + pad * 2)), Math.abs(ring.height - (r.height + pad * 2)));
      return { ok: off <= 2, why: `off by ${off.toFixed(1)}px` };
    },
    { sel, pad },
  );
}

const accountButton = (page) => page.getByRole("button", { name: /^Account: / }).filter({ visible: true }).first();
const stripped = (page) => page.evaluate(() => !new URLSearchParams(location.search).has("tour"));

/** Opens the account menu and reports whether `Take the tour` sits directly under About The 99. */
async function menuRow(page) {
  await accountButton(page).click();
  const items = page.getByRole("menuitem").filter({ visible: true });
  await items.first().waitFor({ timeout: 5_000 });
  const names = await items.allTextContents();
  const at = names.findIndex((n) => n.trim() === "Take the tour");
  return { present: at !== -1, underAbout: at > 0 && names[at - 1].trim() === "About The 99", names };
}

/** Starts the replay by one of the two presses and waits for step 1. */
async function startReplay(page, via) {
  if (via === "about") {
    await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Take the tour →" }).filter({ visible: true }).first().click();
  } else {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const { present, underAbout, names } = await menuRow(page);
    report("the account menu's Take the tour sits directly under About The 99", present && underAbout, names.join(" / "));
    await page.getByRole("menuitem", { name: "Take the tour" }).filter({ visible: true }).first().click();
  }
  const card = page.locator("[data-tour-card]");
  const opened = await card.waitFor({ timeout: 20_000 }).then(() => true, () => false);
  return { card, opened };
}

/** A dashboard Home (`locked`: the shell's nav, as the account's cards decide it), walked through all six stops. */
async function replayDashboard(page, vp, userId, { locked, via }) {
  const phone = vp.width < 768;
  const before = await seenAt(userId);
  const { card, opened } = await startReplay(page, via);
  if (!report(`${locked ? "decks-only" : "dashboard"}: ${via === "about" ? "About's press" : "the menu row"} opens the tour on Home`, opened)) return;
  report("the parameter is stripped", await stripped(page));
  report("the shell draws the nav as expected", (await page.locator("[data-locked-slot]").filter({ visible: true }).count() > 0) === locked);
  const captions = locked
    ? { collection: "Drop in a file from ManaBox", commanders: "Commanders, once your cards are in", decks: "A deck, once you build one" }
    : { collection: "Drop in a new file whenever it changes.", commanders: "Commanders, on someone else’s cards", decks: "A deck, built by someone else" };
  for (const key of ["collection", "commanders", "decks", "buying", "look", "whatsNew"]) {
    await page.waitForFunction((k) => document.querySelector(`[data-tour-card="${k}"]`), key, { timeout: 5_000 });
    await shot(page, vp, `again-${locked ? "locked" : "open"}-${key}`);
    const text = (await card.textContent()) ?? "";
    if (key === "whatsNew") {
      const banner = await page.locator("[data-arrivals-banner] section").filter({ visible: true }).count();
      if (banner > 0) {
        const at = await ringOnControl(page, key, phone);
        report("step 6 lights the banner", at.ok, at.why);
      } else {
        await page.waitForTimeout(400);
        report("step 6 with no banner lights nothing", (await page.locator("[data-tour-ring]").count()) === 0);
      }
      report("step 6 lights one thing at most", (await page.locator("[data-tour-ring]").count()) <= 1);
    } else {
      const at = await replayRing(page, key, phone);
      report(`step ${key}: the cutout sits on its real-app control`, at.ok, at.why);
    }
    if (key === "collection") report("step 1 drops the precon line", !text.includes("Precons I own"));
    if (captions[key]) report(`step ${key} says "${captions[key]}"`, text.includes(captions[key]), text.slice(0, 160));
    if (key !== "whatsNew") await card.getByRole("button", { name: "Next", exact: true }).click();
  }
  await card.getByRole("button", { name: "Finish" }).click();
  report("Finish ends the replay", (await card.count()) === 0);
  const after = await committedSeenAt(userId);
  // The spend writes only while the stamp is null, so a stamp that was set stays exactly where it was.
  if (before !== null) report("the replay moves no stamp", after !== null && after.getTime() === before.getTime());
  return after;
}

async function replays(browser, vp) {
  console.log(`\n${vp.label}: the tour taken again`);

  // A first-run account whose tour is spent: the replay is the first-run tour, from About's head.
  {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const userId = await signIn(page);
    await assertDisposableAccount(sql, { email: ONBOARD_PROBE_EMAIL, userId, what: "probe:tour" });
    const about = await captureAboutSeen(userId, sql);
    try {
      await clearAboutSheet(page, userId);
      await sql`update user_prefs set tour_seen_at = '2026-01-01T00:00:00Z' where user_id = ${userId}`;
      const before = await seenAt(userId);
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2_000);
      report("first run, spent: Home opens no tour by itself", (await page.locator("[data-tour-card]").count()) === 0);
      const { card, opened } = await startReplay(page, "about");
      report("first run: About's Take the tour → runs the tour again", opened);
      if (opened) {
        report("first run: the parameter is stripped", await stripped(page));
        report("first run: the replay is the first-run tour (step 1 on its card)", (await ringOnControl(page, "collection", vp.width < 768)).ok);
        await card.getByRole("button", { name: "Skip the tour" }).click();
      }
      const after = await seenAt(userId);
      report("first run: the replay moves no stamp", after !== null && after.getTime() === before.getTime());
    } finally {
      await restoreAboutSeen(about, sql);
      await context.close();
    }
  }

  // A decks-only account: a dashboard Home under a locked nav. The dedicated account, given one empty deck.
  {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const userId = await signIn(page);
    await assertDisposableAccount(sql, { email: ONBOARD_PROBE_EMAIL, userId, what: "probe:tour" });
    const about = await captureAboutSeen(userId, sql);
    const [{ oracle }] = await sql`select oracle_id as oracle from cards where type_line like 'Legendary Creature%' order by name limit 1`;
    const [{ id: deckId }] = await sql`insert into decks (user_id, name, commander_oracle_id) values (${userId}, 'probe:tour decks-only', ${oracle}) returning id`;
    try {
      await clearAboutSheet(page, userId);
      await sql`update user_prefs set tour_seen_at = '2026-01-01T00:00:00Z' where user_id = ${userId}`;
      await replayDashboard(page, vp, userId, { locked: true, via: "about" });
    } finally {
      await sql`delete from decks where id = ${deckId} and user_id = ${userId}`;
      await restoreAboutSeen(about, sql);
      await context.close();
    }
  }

  // A dashboard account with cards: the nav unlocked, through the account menu. Its only write is the tour's spend.
  {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const userId = await signIn(page, DASHBOARD_EMAIL);
    const [{ cards }] = await sql`select count(*)::int as cards from collection_items where user_id = ${userId}`;
    if (cards === 0) throw new Error(`probe:tour: ${DASHBOARD_EMAIL} holds no cards, so its nav is locked`);
    try {
      const first = await replayDashboard(page, vp, userId, { locked: false, via: "menu" });
      // Taken again once more: the stamp, written by the first spend if it was null, does not move.
      const { card, opened } = await startReplay(page, "about");
      // The stamp check means nothing unless the second replay ran: an unopened tour writes nothing either.
      report("dashboard: a second replay opens", opened);
      if (opened) await card.getByRole("button", { name: "Skip the tour" }).click();
      const second = await seenAt(userId);
      report("dashboard: a second replay moves no stamp", opened && !!first && !!second && first.getTime() === second.getTime());
    } finally {
      await context.close();
    }
  }
}

/**
 * The switch off for the dedicated account, by an ACCOUNT override waited past the resolver's memo and deleted after:
 * no press at About's head, no menu row, and `?tour=1` runs nothing, at each width.
 */
async function switchedOff(browser, widths) {
  const signer = await browser.newContext();
  const userId = await signIn(await signer.newPage());
  await signer.close();
  await assertDisposableAccount(sql, { email: ONBOARD_PROBE_EMAIL, userId, what: "probe:tour" });
  await sql`insert into flag_overrides (switch, scope, user_id, value, note, updated_by)
            values ('FIRST_RUN_TOUR_ENABLED', 'user', ${userId}, 'off', ${OVERRIDE_NOTE}, ${OVERRIDE_NOTE})
            on conflict do nothing`;
  try {
    await new Promise((r) => setTimeout(r, MEMO_MS));
    for (const vp of widths) {
      console.log(`\n${vp.label}: FIRST_RUN_TOUR_ENABLED off`);
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await signIn(page);
      // Held before the clear and put back after, as every other leg does: the fixture's About state is not this leg's.
      const about = await captureAboutSeen(userId, sql);
      try {
        await clearAboutSheet(page, userId);
        await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
        report("off: no Take the tour → at About's head", (await page.getByRole("link", { name: "Take the tour →" }).count()) === 0);
        const { present } = await menuRow(page);
        report("off: no Take the tour row in the account menu", !present);
        await page.keyboard.press("Escape");
        // The phone's menu sheet closes on a history step that can land after Escape returns and abort a goto started
        // on the same page (net::ERR_ABORTED), so the address is asked for in a page of its own.
        const fresh = await context.newPage();
        await fresh.goto(`${BASE}/?tour=1`, { waitUntil: "networkidle" });
        await fresh.waitForTimeout(3_000);
        report("off: /?tour=1 runs no tour", (await fresh.locator("[data-tour-card]").count()) === 0);
      } finally {
        await restoreAboutSeen(about, sql);
        await context.close();
      }
    }
  } finally {
    await sql`delete from flag_overrides where note = ${OVERRIDE_NOTE} and user_id = ${userId}`;
  }
}

const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
if (!branch || REFUSED.has(branch)) throw new Error(`probe:tour refuses branch ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch.`);
await clerkSetup();
const browser = await chromium.launch();
try {
  await walk(browser, { label: "desktop 1300x900", width: 1300, height: 900 });
  await walk(browser, { label: "phone 390x844", width: 390, height: 844 });
  await replays(browser, { label: "desktop 1300x900", width: 1300, height: 900 });
  await replays(browser, { label: "phone 390x844", width: 390, height: 844 });
  await switchedOff(browser, [
    { label: "desktop 1300x900", width: 1300, height: 900 },
    { label: "phone 390x844", width: 390, height: 844 },
  ]);
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nprobe:tour passed" : `\nprobe:tour: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
