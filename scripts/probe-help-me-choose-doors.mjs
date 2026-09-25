// probe:help-me-choose-doors — Help me choose's two doors and its hand-off, in a real browser at
// 1300x900 and 390x844, each reached by a PRESS (HANDOFF §1, §6). Per width:
//
//   1. The create picker's door: first in the list column, never in the dock, its press 38px tall
//      on desktop and a full-width 44px on the phone, and pressing it lands on the intake.
//   2. Discover's link: at the result line's right end on the wide rack, and on its own 44px line
//      under it on the compact one. Pressing it lands on the intake carrying the colors lit on
//      Discover and nothing else.
//   3. A result into deck creation: a row's press draws *Built from your answers* with a row per
//      answer, every way back names the results, and Create writes the answers onto the deck
//      (budget, bracket and the seeded intent). The deck is deleted in a `finally`.
//
// It writes: one deck per width under the account it signs in as, and that account's `user_prefs`
// About row (the gate every signed-in probe clears, and `clearAboutSheet`'s seen ids), both put back
// in the `finally`: the decks deleted, and the whole About row restored to what it read first. It
// refuses staging and production.
//
//   PROBE_TARGET_URL=<scratch> E2E_AUDIT_USER_EMAIL=... PROBE_BASE=http://localhost:3230 \
//     node scripts/probe-help-me-choose-doors.mjs
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, PROBE_TARGET_URL: TARGET } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "PROBE_TARGET_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(TARGET);

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const ABOUT_VERSION = JSON.parse(readFileSync(new URL("../src/lib/copy/about.version.json", import.meta.url), "utf8")).version;

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
}

const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width }; });

async function run() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:help-me-choose-doors refuses branch ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch.`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  const decks = [];
  let userId = null;
  // The account's WHOLE About row as it was before this run touched it (the gate's version and
  // `clearAboutSheet`'s seen ids alike), restored in the `finally`: undefined until read, null when
  // there was no row.
  let aboutBefore;
  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      await signIn(page);
      userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
      if (!userId) throw new Error("no signed-in user id");
      if (aboutBefore === undefined) {
        const [prior] = await sql`select to_jsonb(u) as row from user_prefs u where user_id = ${userId}`;
        aboutBefore = prior ? prior.row : null;
      }
      await sql`insert into user_prefs (user_id, about_version_seen) values (${userId}, ${ABOUT_VERSION})
        on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${ABOUT_VERSION})`;
      await clearAboutSheet(page, userId);
      const at = (s) => `${s} @ ${width}`;

      // 1. The create picker's door.
      await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
      const door = page.locator(`${PAGE} [data-testid='help-me-choose-door']`);
      await door.waitFor({ timeout: 30_000 });
      const placed = await door.evaluate((el) => ({
        first: el.parentElement?.firstElementChild === el,
        inDock: !!el.closest("[data-testid='create-picker-dock']"),
      }));
      report(at("the door is first in the list column, never in the dock"), placed.first && !placed.inDock, JSON.stringify(placed));
      const press = door.getByRole("link", { name: "Help me choose →" });
      const [doorBox, pressBox] = [await rect(door), await rect(press)];
      const pressOk = width === 390
        ? Math.round(pressBox.height) === 44 && pressBox.width >= doorBox.width - 2 * 14 - 2
        : Math.round(pressBox.height) === 38 && pressBox.right <= doorBox.right;
      report(at(width === 390 ? "its press is a full-width 44px" : "its press is 38px, inside the box"), pressOk,
        `press ${Math.round(pressBox.width)}x${Math.round(pressBox.height)} in a ${Math.round(doorBox.width)}px box`);
      await press.click();
      await page.waitForURL((u) => u.pathname === "/decks/new/choose", { timeout: 30_000 });
      report(at("pressing the door lands on the intake"), true, new URL(page.url()).pathname);

      // 2. Discover's link, carrying the colors lit there.
      await page.goto(`${BASE}/discover?c=R,G&m=exact&q=a`, { waitUntil: "networkidle" });
      const line = page.locator(`${PAGE} [data-testid='discover-choose-link']`);
      await line.waitFor({ timeout: 30_000 });
      const row = page.locator(`${PAGE} [data-chassis-row='result']`).first();
      const [lineBox, rowBox] = [await rect(line), await rect(row)];
      const inRow = await line.evaluate((el) => !!el.closest("[data-chassis-row='result']"));
      const placedOk = width === 1300
        ? inRow && Math.abs(lineBox.right - rowBox.right) <= 1
        : !inRow && lineBox.top >= rowBox.bottom - 0.5 && Math.round(lineBox.height) >= 44;
      report(at(width === 1300 ? "the link ends the result line" : "the link has its own 44px line under the count"), placedOk,
        `in row ${inRow}, link ${Math.round(lineBox.left)}–${Math.round(lineBox.right)} × ${Math.round(lineBox.height)}, row ${Math.round(rowBox.left)}–${Math.round(rowBox.right)}`);
      await line.getByRole("link").click();
      await page.waitForURL((u) => u.pathname === "/decks/new/choose", { timeout: 30_000 });
      const carried = Object.fromEntries(new URL(page.url()).searchParams);
      report(at("pressing it carries the colors and Exactly, and nothing else"), JSON.stringify(carried) === JSON.stringify({ c: "r,g", m: "exact" }), JSON.stringify(carried));

      // 3. A result into deck creation.
      await page.goto(`${BASE}/decks/new/choose?t=dinosaurs&b=150&k=2&v=results`, { waitUntil: "networkidle" });
      const results = page.url();
      const hand = page.locator(`${PAGE} [data-testid='row-hand-off']`).first();
      await hand.waitFor({ timeout: 60_000 });
      await hand.click();
      const block = page.locator(`${PAGE} [data-testid='hand-off-answers']`);
      await block.waitFor({ timeout: 30_000 });
      const rows = await block.locator("[data-testid='hand-off-row']").count();
      report(at("the create page draws a row per answer"), rows === 3, `${rows} row(s)`);
      const backs = await page.locator(`${PAGE} a`).evaluateAll((as) => as
        .filter((a) => a.offsetParent !== null && /Back to results|Help me choose · results/.test(a.textContent + (a.getAttribute("aria-label") ?? "")))
        .map((a) => a.getAttribute("href")));
      const resultsQs = new URL(results).search;
      report(at("every drawn way back names these results"), backs.length >= 2 && backs.every((h) => h === `/decks/new/choose${resultsQs}`),
        JSON.stringify(backs));
      const name = `Doors probe ${width} ${Date.now()}`;
      await page.locator(`${PAGE} #deck-name-input`).fill(name);
      await page.locator(`${PAGE} button`, { hasText: "Create deck" }).first().click();
      await page.waitForURL((u) => /^\/decks\/[0-9a-f-]{36}/.test(u.pathname), { timeout: 90_000 });
      const deckId = new URL(page.url()).pathname.split("/")[2];
      decks.push(deckId);
      const [deck] = await sql`select answer_budget_cents, answer_bracket, intent, intent_seeded from decks where id = ${deckId} and user_id = ${userId}`;
      report(at("Create writes the answers onto the deck"),
        deck?.answer_budget_cents === 15000 && deck?.answer_bracket === 2 && deck?.intent_seeded === true && /Dinosaurs/.test(deck?.intent ?? ""),
        JSON.stringify(deck));
      await context.close();
    }
  } finally {
    await browser.close();
    // Each deck on its own: one failed delete must not leave the next width's deck behind.
    for (const id of decks) {
      try {
        await sql`delete from decks where id = ${id} and user_id = ${userId}`;
      } catch (error) {
        report("cleanup deletes the deck it made", false, `${id}: ${error}`);
      }
    }
    if (userId && aboutBefore !== undefined) {
      // Every column back as it was, whatever the row holds: deleted and the captured row re-inserted
      // in ONE transaction, so a failed insert rolls the delete back rather than losing the row.
      await sql.transaction([
        sql`delete from user_prefs where user_id = ${userId}`,
        ...(aboutBefore !== null
          ? [sql`insert into user_prefs select * from jsonb_populate_record(null::user_prefs, ${JSON.stringify(aboutBefore)}::jsonb)`]
          : []),
      ]);
    }
    if (decks.length) console.log(`deleted ${decks.length} deck(s) this run made`);
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
