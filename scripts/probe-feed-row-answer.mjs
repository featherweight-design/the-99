// Finding the tools G22-G24 on the real Home (plan 2026-11-23-tool-discovery §4): two incoming spare asks are waiting, so
//   G22  the NEWER ask leads even when seen (Q16 A), not a news item;
//   G23  the lead's ✕ sits in the card's top right corner, outside its action line (Q17 A);
//   G24  the OLDER ask answers in its What's new row: Yes, No and the days left, no `Answer in Friends.`, its ✕ in the
//        row's corner (Q18 A); pressing Yes there lands the receipt in the row and calls the answer action.
// At phone 390x844, desktop 1300x900 and iPad 1180x820 and 820x1180 (read-only), then a Yes press at phone, which writes
// one answer: SCRATCH BRANCH ONLY. Seed first: `scripts/seed-incoming-asks-fixture.mts`, the audit account the dev server's
// database holds (Ann asks first, Bea after).
//
//   PROBE_BASE=http://localhost:3417 node scripts/probe-feed-row-answer.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const VIEWPORTS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 }, touch: true },
  { label: "desktop 1300x900", viewport: { width: 1300, height: 900 }, touch: false },
  { label: "iPad 1180x820", viewport: { width: 1180, height: 820 }, touch: true },
  { label: "iPad 820x1180", viewport: { width: 820, height: 1180 }, touch: true },
];
let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
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
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}


// Everything the checks need, read from the page in one pass.
const read = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    const lead = document.querySelector("[data-feed-lead]");
    const x = lead?.querySelector("button[aria-label^='Hide']");
    const rows = [...document.querySelectorAll("[data-feed-item='spare-request']")].filter((r) => r.getBoundingClientRect().width > 0);
    const row = rows.find((r) => /Ann/.test(r.textContent ?? ""));
    const rowX = row?.querySelector("button[aria-label^='Hide']");
    return {
      lead: lead ? { text: lead.textContent ?? "", box: box(lead), x: x ? box(x) : null, xInActions: !!x?.closest("[data-lead-actions]") } : null,
      row: row ? { text: row.textContent ?? "", box: box(row), yes: !!row.querySelector("[data-testid=spare-yes]"), no: !!row.querySelector("[data-testid=spare-no]"), days: !!row.querySelector("[data-testid=spare-days]"), x: rowX ? box(rowX) : null } : null,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n${vp.label}`);
      const ctx = await browser.newContext({ viewport: vp.viewport, hasTouch: vp.touch });
      const page = await ctx.newPage();
      await signIn(page);
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await page.waitForSelector("[data-feed-lead]", { timeout: 120_000 }).catch(() => {});
      await page.waitForTimeout(800);
      const s = await read(page);
      if (!report("the lead is drawn", !!s.lead)) { await ctx.close(); continue; }
      report("the lead is the newer ask (Bea), not news", /Bea/.test(s.lead.text) && !/Ann/.test(s.lead.text.slice(0, 60)), s.lead.text.slice(0, 60));
      const l = s.lead;
      report("the lead's ✕ is drawn outside its action line", !!l.x && !l.xInActions);
      if (l.x) {
        const right = l.box.x + l.box.w - (l.x.x + l.x.w);
        const top = l.x.y - l.box.y;
        report("the lead's ✕ holds the card's top right corner", right >= -12 && right <= 22 && top >= 0 && top <= 22, `right ${right.toFixed(1)}, top ${top.toFixed(1)}`);
      }
      report("the older ask is a row", !!s.row);
      if (s.row) {
        report("the row has Yes, No and the days left", s.row.yes && s.row.no && s.row.days);
        report("the row no longer says `Answer in Friends.`", !/Answer in Friends/.test(s.row.text));
        if (s.row.x) {
          const right = s.row.box.x + s.row.box.w - (s.row.x.x + s.row.x.w);
          const top = s.row.x.y - s.row.box.y;
          report("the row's ✕ holds the row's top right corner", right >= -12 && right <= 16 && top >= 0 && top <= 16, `right ${right.toFixed(1)}, top ${top.toFixed(1)}`);
        } else report("the row draws its ✕", false);
      }
      report("no horizontal scroll", !s.overflow);
      // A long wrapping title never runs under the row's ✕ (the text column reserves the ✕'s width). The title is
      // swapped in the page only: the check reads where the title's lines draw against where the ✕ draws.
      const clash = await page.evaluate(() => {
        const row = [...document.querySelectorAll("[data-feed-item='spare-request']")].find((r) => r.getBoundingClientRect().width > 0 && /Ann/.test(r.textContent ?? ""));
        const x = row?.querySelector("[data-row-x] button");
        const title = row?.querySelector("p[id]");
        if (!row || !x || !title) return null;
        title.textContent = "Ann would like to borrow your spare copy of Empyrial Storm for the Commander night on Saturday, and she has two more decks to sort out beforehand";
        row.scrollIntoView({ block: "center" });
        const hit = x.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(title);
        const rects = [...range.getClientRects()];
        const worst = Math.max(0, ...rects.map((r) => Math.min(r.right, hit.right) - Math.max(r.left, hit.left)).map((w, i) => (Math.min(rects[i].bottom, hit.bottom) - Math.max(rects[i].top, hit.top) > 0 ? w : 0)));
        return { lines: new Set(rects.map((r) => Math.round(r.top))).size, overlap: worst };
      });
      report("a long wrapping title stays clear of the row's ✕", !!clash && clash.lines > 1 && clash.overlap <= 0, clash ? `${clash.lines} lines, overlap ${clash.overlap.toFixed(1)}px` : "no row");
      if (process.env.SHOTS) await page.waitForTimeout(300);
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${vp.label.replace(/\W+/g, "-")}-long.png`, fullPage: false }).catch(() => {});
      await page.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/${vp.label.replace(/\W+/g, "-")}.png` : undefined, fullPage: false }).catch(() => {});
      if (vp.label.startsWith("phone") && process.env.PRESS !== "0") {
        const row = page.locator("[data-feed-item='spare-request']", { hasText: "Ann" }).first();
        await row.locator("[data-testid=spare-yes]").click();
        await page.waitForTimeout(2500);
        const after = await page.locator("[data-feed-item='spare-request']", { hasText: "Ann" }).first().textContent();
        report("Yes in the row lands the receipt in place", !!after && /sparing|keeping|Ann/i.test(after) && (await row.locator("[data-testid=spare-yes]").count()) === 0, (after ?? "").slice(0, 70));
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
