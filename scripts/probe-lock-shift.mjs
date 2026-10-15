// probe:lock-shift — locking the first card, and unlocking the last, move nothing on the deck page.
//
// Hugh's screenshots at 1300: with Lock cards on, the first lock moved the key line, the brass rule
// and the first group heading up 8 to 11px and left 1 to 2px. This presses the first lock and then
// the unlock on a real deck at 1300x900 and 390x844 and asserts every box the page draws above and
// around the line is where it was (0px, to a half-pixel of rounding), and that the document did not
// gain or lose a scrollbar.
//
// FIXTURE. The deck is a deck of E2E_AUDIT_USER_EMAIL's on local-dev (PROBE_DECK, default the seeded
// fixture deck), with NO locked card. The probe locks one card and unlocks it again, in a `finally`
// too. Refuses staging and production by `neon.branch_id`.
//
//   PROBE_BASE=http://localhost:3377 pnpm probe:lock-shift
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole } from "./lib/surface.mjs";

const { DATABASE_URL, E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["DATABASE_URL", "E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK ?? "d0000000-0000-4000-8000-00000000cafe";
const REFUSED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess"]);
const WIDTHS = [
  { name: "desktop", viewport: { width: 1300, height: 900 } },
  { name: "phone", viewport: { width: 390, height: 844 } },
];

let failures = 0;
function report(ok, name, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " PASS " : " FAIL "} ${name}${detail ? `  (${detail})` : ""}`);
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/** Every box worth watching: the line, the group headings, the first rows, and the document's own size. */
function read() {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  const out = {};
  const main = document.querySelector("main") ?? document.body;
  const line = main.querySelector("[data-testid=lock-mode-line]");
  if (line) out.line = box(line);
  main.querySelectorAll("h2, h3").forEach((h, i) => {
    if (i < 4) out[`heading${i}:${(h.textContent ?? "").trim().slice(0, 24)}`] = box(h);
  });
  main.querySelectorAll("li, [role=listitem]").forEach((row, i) => {
    if (i < 3) out[`row${i}`] = box(row);
  });
  const doc = document.documentElement;
  out.doc = { x: 0, y: 0, w: doc.scrollWidth, h: doc.scrollHeight };
  out.view = { x: 0, y: 0, w: doc.clientWidth, h: doc.clientHeight };
  return out;
}

function compare(label, before, after) {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const moved = [];
  for (const n of names) {
    const a = before[n];
    const b = after[n];
    if (!a || !b) {
      if (!n.startsWith("heading") && !n.startsWith("row")) moved.push(`${n} ${a ? "vanished" : "appeared"}`);
      continue;
    }
    for (const k of ["x", "y", "w", "h"]) {
      if (Math.abs(a[k] - b[k]) > 0.5) moved.push(`${n}.${k} ${Math.round(a[k] * 10) / 10} to ${Math.round(b[k] * 10) / 10}`);
    }
  }
  report(moved.length === 0, label, moved.join("; "));
}

async function main() {
  const branch = (await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as b`)[0]?.b;
  if (!branch || REFUSED.has(branch)) throw new Error(`Refusing to write to ${branch ?? "an unreadable database"}.`);
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const w of WIDTHS) {
      const context = await browser.newContext({ viewport: w.viewport });
      const page = await context.newPage();
      try {
        await signIn(page);
        await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
        const main = onPageRole(page, "button", "Lock cards");
        await main.click();
        await page.waitForSelector("[data-testid=lock-mode-line]", { state: "visible" });
        const toggle = onPageRole(page, "button", /^Lock .+/).and(page.locator("[aria-pressed=false]")).first();
        await toggle.waitFor({ state: "visible" });
        await page.waitForTimeout(400);
        const zero = await page.evaluate(read);
        await toggle.click();
        await page.waitForFunction(() => document.querySelector("[data-testid=lock-mode-line]")?.textContent?.includes("1 locked"));
        await page.waitForTimeout(600);
        const one = await page.evaluate(read);
        compare(`${w.name}: the first lock moves nothing`, zero, one);
        const unlock = onPageRole(page, "button", /^Lock .+/).and(page.locator("[aria-pressed=true]")).first();
        await unlock.click();
        await page.waitForFunction(() => document.querySelector("[data-testid=lock-mode-line]")?.textContent?.includes("0 locked"));
        await page.waitForTimeout(600);
        const back = await page.evaluate(read);
        compare(`${w.name}: the unlock moves nothing`, one, back);
        compare(`${w.name}: and the page is back where it began`, zero, back);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (failures > 0) {
    console.log(`\n${failures} failed`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
