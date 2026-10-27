// The picker's partner slot, walked in a real browser at 1300x900 and 390x844.
//
// Picking a commander that can take a partner draws "Add a partner". On a phone the slot sits in
// the scrolling flow above the list (partners handoff decision 20), so a commander picked far down
// the list drew it above the fold, where nothing said a partner could be added. This probe picks
// the LAST partner-able commander the account owns on /decks/new, and on /decks/import from a
// pasted list of legends, and asserts the slot's button is inside the visible window: below the
// shell's header and above the dock, which covers the foot of a phone's window.
//
// It writes nothing but the About gate (captured and put back). Point it at `local-dev`, never
// production. Run: `node scripts/probe-partner-slot-in-view.mjs` (PROBE_BASE picks the server).

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? null;
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}: ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

let restorePrefs = null;

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
  if (!restorePrefs) {
    const prior = await captureAboutSeen(userId);
    restorePrefs = () => restoreAboutSeen(prior);
  }
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, userId);
  return userId;
}

/** The owned legends, in name order, and which of them can take a partner. */
async function ownedLegends(userId) {
  return sql`
    select distinct c.oracle_id, c.name,
      ('Partner' = any(c.keywords) or c.oracle_text ilike '%friends forever%') as pairs
    from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${userId} and c.commander_legal and c.type_line ilike 'Legendary Creature%'
    order by c.name`;
}

/**
 * Where the slot's button lands once the row is pressed, against the window the reader can see:
 * the top of `<main>`'s visible area (the phone header is fixed above it) and the top of the dock.
 */
async function measure(page, oracleId) {
  const row = onPage(page, `[data-picker-row="${oracleId}"]`);
  await row.scrollIntoViewIfNeeded();
  await row.click();
  // The reveal waits a beat and then eases, capped at 700ms (`MOTION`).
  await page.waitForTimeout(1200);
  const slot = page.getByRole("button", { name: /^Add a partner for / }).locator("visible=true");
  const count = await slot.count();
  if (count === 0) return { drawn: false };
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll("button[aria-label^='Add a partner for']")].find(
      (b) => b.getBoundingClientRect().width > 0,
    );
    const r = visible.getBoundingClientRect();
    // The returned phone header's room is the page's scroll padding, as the picker reads it.
    const headerBottom = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const dock = document.querySelector("[data-testid='create-picker-dock']");
    const dockTop = dock && dock.getBoundingClientRect().height > 0 ? dock.getBoundingClientRect().top : window.innerHeight;
    return { drawn: true, top: Math.round(r.top), bottom: Math.round(r.bottom), headerBottom: Math.round(headerBottom), dockTop: Math.round(dockTop), scrollY: Math.round(window.scrollY), innerHeight: window.innerHeight };
  });
}

function judge(label, m) {
  if (!m.drawn) return report(label, false, "no Add a partner control drawn");
  const inView = m.top >= m.headerBottom && m.bottom <= m.dockTop;
  return report(label, inView, `slot ${m.top}..${m.bottom}, visible window ${m.headerBottom}..${m.dockTop} (scrollY ${m.scrollY})`);
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const { label, viewport } of WIDTHS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const userId = await signIn(page);
      const legends = await ownedLegends(userId);
      const pairing = legends.filter((l) => l.pairs);
      if (pairing.length === 0) throw new Error("the account owns no partner-able commander");
      const last = pairing[pairing.length - 1];

      // /decks/new: the whole owned list, the last partner-able legend picked.
      await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
      await onPage(page, "[data-picker-row]").first().waitFor();
      const m = await measure(page, last.oracle_id);
      judge(`${label} /decks/new, ${last.name}`, m);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/new-${label}.png` });

      // Pressing it re-heads the list to the legal partners; picking the last one fills the slot,
      // which must come back into view the same way.
      await page.getByRole("button", { name: /^Add a partner for / }).locator("visible=true").click();
      await page.waitForTimeout(400);
      const partners = onPage(page, "[data-picker-row]");
      const lastPartner = partners.nth((await partners.count()) - 1);
      await lastPartner.scrollIntoViewIfNeeded();
      await lastPartner.click();
      await page.waitForTimeout(1200);
      const filled = await page.evaluate(() => {
        const phone = document.querySelector("[data-partner-slot]");
        const el = phone && phone.getClientRects().length > 0
          ? phone
          : [...document.querySelectorAll("[role='group'][aria-label]")].find((g) => g.getClientRects().length > 0);
        const r = el.getBoundingClientRect();
        const dock = document.querySelector("[data-testid='create-picker-dock']");
        const dockTop = dock && dock.getBoundingClientRect().height > 0 ? dock.getBoundingClientRect().top : window.innerHeight;
        return { drawn: true, top: Math.round(r.top), bottom: Math.round(r.bottom), headerBottom: Math.round(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0), dockTop: Math.round(dockTop), scrollY: Math.round(window.scrollY) };
      });
      judge(`${label} /decks/new, the filled slot after picking a partner`, filled);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/new-filled-${label}.png` });

      // /decks/import: a pasted list of every owned legend, so the picker is long too.
      await page.goto(`${BASE}/decks/import`, { waitUntil: "networkidle" });
      const paste = legends.slice(0, 40).concat(pairing).map((l) => `1 ${l.name}`).join("\n");
      await onPage(page, "textarea").first().fill(paste);
      await onPage(page, "#import-deck-name").fill("probe partner slot");
      await onPage(page, "button:has-text('Import')").last().click();
      await onPage(page, "[data-picker-row]").first().waitFor({ timeout: 30_000 });
      const mi = await measure(page, last.oracle_id);
      judge(`${label} /decks/import, ${last.name}`, mi);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/import-${label}.png` });
      await context.close();
    }
  } finally {
    await browser.close();
    if (restorePrefs) await restorePrefs();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch(async (error) => {
  console.error(error);
  if (restorePrefs) await restorePrefs();
  process.exit(1);
});
