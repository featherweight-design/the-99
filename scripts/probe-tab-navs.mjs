// The two tab navs fill the phone's width and Deck Details counts only Your deck (Hugh, 2026-11-15).
//   - Commanders (`/commanders`): four tabs share the strip's width at 390 (the last tab's right edge reaches the strip's, no tab is
//     under half the widest), the strip does not scroll, and no tab carries a count (Hidden included).
//   - Deck Details (a deck's own page): five tabs fill the row at 390 with no sideways scroll, and a count draws on Your deck alone.
// Windows: phone 390x844 for the fill claims; desktop 1280x800 for the count claims (the tabs keep their own width there).
//
// Run by hand against a dev server on a free port: `PROBE_BASE=http://localhost:3414 node scripts/probe-tab-navs.mjs`.
// Needs a browser and the audit user (`E2E_AUDIT_USER_*`) with a deck, plus `CLERK_SECRET_KEY`; read-only, never production.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const WINDOWS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 }, touch: true, phone: true },
  { label: "desktop 1280x800", viewport: { width: 1280, height: 800 }, touch: false, phone: false },
];

const results = [];
function check(ok, label, detail) {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

// Each tab's box, the strip's box and whether the strip scrolls sideways.
const MEASURE = (sel) => {
  const strip = document.querySelector(sel.strip);
  const tabs = [...document.querySelectorAll(sel.tabs)];
  const s = strip.getBoundingClientRect();
  return {
    scrolls: strip.scrollWidth > strip.clientWidth + 1,
    stripRight: Math.round(s.right),
    lastRight: Math.round(Math.max(...tabs.map((t) => t.getBoundingClientRect().right))),
    widths: tabs.map((t) => Math.round(t.getBoundingClientRect().width)),
    labels: tabs.map((t) => t.textContent.trim()),
    countOn: tabs.filter((t) => /\d/.test(t.textContent)).map((t) => t.textContent.trim()),
  };
};

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const win of WINDOWS) {
    const ctx = await browser.newContext({ viewport: win.viewport, hasTouch: win.touch, isMobile: win.touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await signIn(page);
    await page.goto(`${BASE}/commanders`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForSelector("[data-testid=commanders-tab-hidden]", { timeout: 60_000 });
    await page.waitForTimeout(1500);
    const c = await page.evaluate(MEASURE, { strip: "nav:has([data-testid=commanders-tab-hidden])", tabs: "[data-testid^=commanders-tab-]" });
    check(c.countOn.length === 0, `${win.label}: Commanders tabs carry no count`, `tabs ${JSON.stringify(c.labels)}`);
    if (win.phone) {
      check(!c.scrolls, `${win.label}: the Commanders strip does not scroll`, `widths ${c.widths}`);
      check(c.stripRight - c.lastRight <= 6, `${win.label}: the Commanders tabs reach the strip's right edge`, `strip ${c.stripRight} last ${c.lastRight}`);
      check(Math.min(...c.widths) * 2 >= Math.max(...c.widths), `${win.label}: no Commanders tab is under half the widest`, `widths ${c.widths}`);
    }

    await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForFunction(() => [...document.querySelectorAll("a[href^='/decks/']")].some((a) => /^\/decks\/[0-9a-f-]{20,}/.test(a.getAttribute("href") ?? "")), null, { timeout: 60_000 }).catch(() => {});
    const href = await page.evaluate(() => [...document.querySelectorAll("a[href^='/decks/']")].map((a) => a.getAttribute("href")).find((h) => /^\/decks\/[0-9a-f-]{20,}/.test(h)));
    if (!href) { check(false, `${win.label}: the audit user has a deck`, "no deck link on /decks"); await ctx.close(); continue; }
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForSelector("[role=tablist] [role=tab]", { timeout: 60_000 });
    await page.waitForTimeout(1500);
    const d = await page.evaluate(MEASURE, { strip: "[role=tablist]:has(#tab-deck)", tabs: "[role=tablist]:has(#tab-deck) > [role=tab]" });
    check(d.countOn.length === 1 && /deck/i.test(d.labels[d.labels.findIndex((l) => /\d/.test(l))] ?? ""), `${win.label}: only Your deck carries a count`, `counts ${JSON.stringify(d.countOn)} tabs ${JSON.stringify(d.labels)}`);
    if (win.phone) {
      check(!d.scrolls, `${win.label}: the Deck Details tab row does not scroll`, `widths ${d.widths}`);
      check(d.stripRight - d.lastRight <= 6, `${win.label}: the Deck Details tabs fill the row`, `strip ${d.stripRight} last ${d.lastRight}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
