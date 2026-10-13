// probe:tuning-settings — a "Kept for this deck" choice in Suggested changes holds from the press,
// through its save, and after it (Hugh, 2026-10-12: "Cards to add" flipped back to "Any card" for a
// moment and then returned).
//
// Presses "Only cards I own" with every server-action POST (`next-action` header) held, asserts the
// choice reads at once, then lets the save through and samples the toggle every 50ms for 8s: it
// must never read "Any card" in that window. The deck is put back as it was found, and that
// restore is sampled the same way. At 1300x900 and 390x844.
//
// Needs a running server (`PROBE_BASE`) signed in as E2E_AUDIT_USER_EMAIL and one of that
// account's decks with Suggested changes offered (SETTINGS_DECK). It WRITES the deck's owned-only
// limit, so it FAILS CLOSED: the server must be on this machine, and the database the worktree's
// .env names must not report the production or staging Neon branch, by `neon.branch_id`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { Pool } from "@neondatabase/serverless";
import { chromium } from "playwright";

import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, SETTINGS_DECK: DECK, DATABASE_URL } =
  requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "SETTINGS_DECK", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const FORBIDDEN = new Set(["br-noisy-violet-a6vw4ess", "br-polished-pond-a6e63y0b"]);
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`refusing: PROBE_BASE must be a server on this machine, got ${BASE}`);
  process.exit(2);
}
const pool = new Pool({ connectionString: DATABASE_URL });
{
  const branch = (await pool.query("select current_setting('neon.branch_id', true) as b")).rows[0]?.b ?? null;
  if (!branch || FORBIDDEN.has(branch)) {
    console.error(`refusing: the database .env names reports branch ${branch ?? "unknown"}, which this probe never writes`);
    await pool.end();
    process.exit(2);
  }
}
const storedOwnedOnly = async () => (await pool.query("select tuning_owned_only as v from decks where id = $1", [DECK])).rows[0]?.v ?? null;

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} - ${JSON.stringify(detail)}`);
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
}

/** Hold server-action POSTs until `release`. */
async function holdActions(page) {
  const held = [];
  let mode = "hold";
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || !req.headers()["next-action"] || mode === "pass") return route.fallback();
    held.push(route);
  });
  return {
    count: () => held.length,
    async caught() { for (let i = 0; i < 150 && held.length === 0; i += 1) await page.waitForTimeout(100); return held.length; },
    async release() { mode = "pass"; for (const r of held.splice(0)) await r.fallback(); await page.unroute("**/*"); },
  };
}

/** Press `name`, hold its save, assert it reads at once, then release and sample for a flip-back. */
async function pressAndWatch(page, label, name, other) {
  const radio = onPageRole(page, "radio", name).first();
  const gate = await holdActions(page);
  await radio.click();
  await gate.caught();
  const held = await radio.getAttribute("aria-checked");
  check(`${label}: "${name}" reads chosen while its save is held`, held === "true" && gate.count() >= 1, { held: gate.count(), checked: held });
  await gate.release();
  const flips = [];
  for (let i = 0; i < 160; i += 1) {
    if ((await onPageRole(page, "radio", other).first().getAttribute("aria-checked")) === "true") flips.push(i * 50);
    await page.waitForTimeout(50);
  }
  check(`${label}: "${name}" never flips back to "${other}" through and after its save`, flips.length === 0, { flipsAtMs: flips.slice(0, 5) });
}

const original = await storedOwnedOnly();
const browser = await chromium.launch();
try {
  for (const w of [{ label: 1300, width: 1300, height: 900 }, { label: 390, width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
    const page = await ctx.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
    await onPageRole(page, "tab", /analysis/i).first().click();
    // The hub draws a tile per tool (two or more on); one tool on mounts it directly.
    const tile = onPage(page, "button[data-tool-tile='suggested']");
    const any = onPageRole(page, "radio", "Any card").first();
    await Promise.race([tile.waitFor({ timeout: 60_000 }), any.waitFor({ timeout: 60_000 })]);
    if (await tile.count()) await tile.click();
    await onPageRole(page, "radio", "Any card").first().waitFor({ timeout: 60_000 });
    // Start from "Any card", whatever the deck held.
    if ((await onPageRole(page, "radio", "Any card").first().getAttribute("aria-checked")) !== "true") {
      await pressAndWatch(page, `${w.label} reset`, "Any card", "Only cards I own");
    }
    await pressAndWatch(page, `${w.label}`, "Only cards I own", "Any card");
    check(`${w.label}: the save reached the deck`, (await storedOwnedOnly()) === true, null);
    await pressAndWatch(page, `${w.label} back`, "Any card", "Only cards I own");
    await ctx.close();
  }
} finally {
  await browser.close();
  // Leave the deck as it was found.
  await pool.query("update decks set tuning_owned_only = $2 where id = $1", [DECK, original]);
  await pool.end();
}
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
