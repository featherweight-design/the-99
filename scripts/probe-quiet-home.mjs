// Quiet Home (tool-discovery addendum, design PR #3269), at 390, 1300, 1180x820 and 820x1180. Needs `pnpm dev` and the audit
// account on a Home with fewer than two heading cards (no open table or game to log, at most the lead story), which is
// local-dev's audit account as seeded: PROBE_BASE names the server (a localhost, pk_test instance). It reads the Home's
// heads first and refuses a busy Home rather than measuring the wrong state.
//   Q1  from 1180, What's new is in the main column, not the rail: below the resume block and aligned with it
//   Q2  from 768, its rows draw wide (three tracks: art, text, actions), the rail's compact rows only on a busy Home
//   Q3  below 1180, it keeps its place above the decks
// It fails on `main`, where What's new tops the rail from 1180 in compact two-track rows.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv(["E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error(`refusing: PROBE_BASE must be a server on this machine, got ${BASE}`);
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failures.push(what); };

await clerkSetup();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await ctx.newPage();
await setupClerkTestingToken({ page });
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 120000 });
const failure = await page.evaluate(async ([email, password]) => {
  try {
    const signIn = window.Clerk.client.signIn;
    let a = await signIn.create({ identifier: email, password });
    if (a.status === "needs_client_trust") {
      const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
      a = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    }
    if (a.status !== "complete") return `status ${a.status}`;
    await window.Clerk.setActive({ session: a.createdSessionId });
    return null;
  } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
}, [EMAIL, PASSWORD]);
if (failure) throw new Error(`sign-in failed: ${failure}`);

for (const [w, h] of [[390, 844], [1300, 900], [1180, 820], [820, 1180]]) {
  await page.setViewportSize({ width: w, height: h });
  const at = `${w}x${h}`;
  try {
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 240000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.locator("[data-whats-new]").first().waitFor({ state: "visible", timeout: 120000 });
    const m = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, b: r.bottom + scrollY }; };
      const wn = document.querySelectorAll("[data-whats-new]");
      const resume = [...document.querySelectorAll("h2")].find((x) => /left off/i.test(x.textContent ?? ""));
      const row = wn[0]?.querySelector("[data-feed-item]");
      return {
        count: wn.length,
        heads: document.querySelectorAll("[data-lead-story]").length + document.querySelectorAll('[data-testid="home-log-card"]').length + document.querySelectorAll("[data-table-id], [data-rule-zero-table]").length,
        inRail: wn[0]?.closest("[class*='min-[1180px]:w-[316px]']") !== null && getComputedStyle(wn[0].closest("[class*='min-[1180px]:w-[316px]']")).display !== "contents",
        wn: wn[0] ? box(wn[0]) : null,
        resume: resume ? box(resume.closest("section") ?? resume) : null,
        tracks: row ? getComputedStyle(row).gridTemplateColumns.split(" ").length : 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    if (m.heads >= 2) throw new Error(`the Home is busy (${m.heads} heading cards): this probe needs a quiet one`);
    check(m.count === 1, `${at} one What's new on the page (${m.count})`);
    check(!!m.wn && !!m.resume, `${at} What's new and the resume block both draw`);
    check(m.overflow <= 0, `${at} nothing overflows (${m.overflow}px)`);
    if (m.wn && m.resume) {
      if (w >= 1180) {
        check(!m.inRail, `${at} Q1 What's new is not in the rail`);
        check(m.wn.y >= m.resume.b - 1 && Math.abs(m.wn.x - m.resume.x) <= 2, `${at} Q1 under the resume block and aligned with it (top ${Math.round(m.wn.y)} vs resume bottom ${Math.round(m.resume.b)}, x ${Math.round(m.wn.x)} vs ${Math.round(m.resume.x)})`);
      } else {
        check(m.wn.b <= m.resume.y + 1, `${at} Q3 above the decks (bottom ${Math.round(m.wn.b)} vs resume top ${Math.round(m.resume.y)})`);
      }
      check(m.tracks === (w >= 768 ? 3 : 2), `${at} Q2 rows draw ${w >= 768 ? "wide, three tracks" : "the phone's two tracks"} (${m.tracks})`);
    }
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/quiet-home-${w}.png`, fullPage: true });
  } catch (e) { check(false, `${at}: ${String(e.message).split("\n")[0]}`); }
}
await browser.close();
if (failures.length) { console.error(`${failures.length} failed`); process.exit(1); }
console.log("all passed");
