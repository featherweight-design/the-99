// probe:history-local-time (#2986): /collection/history reads in the reader's zone, not UTC.
//
// The reader's browser is put in Pacific/Auckland (UTC+13 in November), so a ledger entry written at 13:29Z reads as 02:29 the NEXT day. For
// every entry the page draws, in a phone (390) and a desktop (1280) window: its `<time>`'s text is the clock in that zone computed from its
// own `datetime` (or "Just now" / "N min ago" for a recent one), its `title` names that zone's stamp, and the day heading above it names
// that zone's date. A UTC page (the defect) puts every 13:00Z to 23:59Z entry on the previous date with a UTC clock. Read-only; needs the
// audit user to have at least one entry older than an hour (a run with none fails: it would measure nothing).
//
//   PROBE_BASE=http://localhost:3416 node scripts/probe-history-local-time.mjs
//
// Needs a browser, `E2E_AUDIT_USER_*` and `CLERK_SECRET_KEY`; never production.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";
const ZONE = "Pacific/Auckland";

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
  { label: "phone 390x844", viewport: { width: 390, height: 844 }, touch: true },
  { label: "desktop 1280x800", viewport: { width: 1280, height: 800 }, touch: false },
];

const results = [];
function check(ok, label, detail) {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const win of WINDOWS) {
    const ctx = await browser.newContext({ viewport: win.viewport, hasTouch: win.touch, isMobile: win.touch, deviceScaleFactor: 1, timezoneId: ZONE, locale: "en-US" });
    const page = await ctx.newPage();
    await signIn(page);
    await page.goto(`${BASE}/collection/history`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForSelector("main time", { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const rows = await page.evaluate((zone) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return [...document.querySelectorAll("main time")].map((t) => {
        const d = new Date(t.getAttribute("datetime"));
        const clock = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(d);
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "numeric", day: "numeric" }).formatToParts(d);
        const date = `${months[Number(parts.find((p) => p.type === "month").value) - 1]} ${parts.find((p) => p.type === "day").value}`;
        // The nearest heading above the entry: its group's day.
        let node = t.closest("li");
        let heading = null;
        while (node && !heading) {
          let prev = node.previousElementSibling;
          node = node.parentElement;
          let h = null;
          for (let el = node; el && !h; el = el.previousElementSibling) h = el.querySelector?.("h2, h3") ?? (/^H[23]$/.test(el.tagName) ? el : null);
          heading = h?.textContent?.trim() ?? null;
          if (prev === undefined) break;
        }
        return { text: t.textContent.trim(), title: t.getAttribute("title"), clock, date, heading, ageMin: (Date.now() - d.getTime()) / 60000 };
      });
    }, ZONE);
    const old = rows.filter((r) => r.ageMin >= 60);
    check(old.length > 0, `${win.label}: the audit user has entries older than an hour to measure`, `${rows.length} entries`);
    const clockBad = old.filter((r) => r.text !== r.clock);
    check(clockBad.length === 0, `${win.label}: every time reads the clock in ${ZONE}`, clockBad.length ? JSON.stringify(clockBad.slice(0, 2)) : `${old.length} entries, e.g. ${old[0]?.text}`);
    const titleBad = old.filter((r) => !r.title || !r.title.includes(r.clock) || !/(NZDT|GMT\+13|NZST|GMT\+12)/.test(r.title));
    check(titleBad.length === 0, `${win.label}: every title is the full stamp in ${ZONE}`, titleBad.length ? JSON.stringify(titleBad.slice(0, 1)) : old[0]?.title);
    const dayBad = old.filter((r) => !r.heading || !r.heading.includes(r.date));
    check(dayBad.length === 0, `${win.label}: every day heading names the date in ${ZONE}`, dayBad.length ? JSON.stringify(dayBad.slice(0, 2).map((r) => [r.date, r.heading])) : `${old[0]?.date} under "${old[0]?.heading}"`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
