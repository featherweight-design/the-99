// pnpm probe:phone-tabs (run: tsx scripts/probe-phone-tabs.mts): the tab rows at the top of a page or panel fill a
// phone's width with equal tabs (Hugh, 2026-11-24), in a real browser. At 390, for every row it can reach:
//   1. the row spans its container's content box (its first child starts at the content's left edge and its last
//      child ends at the right one, within 1px);
//   2. its tabs are one width (within 1px), a trailing control (Collection's `Add +`) excepted;
//   3. no horizontal page overflow.
// At 1300 it checks only that the page does not overflow (desktop is unchanged). Read-only: it signs in and loads
// pages, nothing more. Fails on main, where the tabs keep their content widths.
//   PROBE_BASE=http://localhost:3260 E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app tsx scripts/probe-phone-tabs.mts
// A row the reader's data does not draw (By deck needs two decks, a friend page needs a friend) is reported SKIP.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function signIn(page: Page): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as any).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = (window as any).Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await (window as any).Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error: any) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

type Row = { label: string; path: () => Promise<string | null>; tab: string; trailing?: string };

/** Measures the row holding the tabs `tab` matches: its span against its container, and the tabs' widths. */
async function measure(page: Page, tab: string, trailing?: string) {
  return page.evaluate(
    ({ tab, trailing }) => {
      const tabs = [...document.querySelectorAll<HTMLElement>(tab)].filter((t) => t.offsetParent !== null);
      if (tabs.length < 2) return null;
      const row = tabs[0].parentElement!;
      const kids = [...row.children].filter((k) => (k as HTMLElement).offsetParent !== null) as HTMLElement[];
      const box = row.parentElement!;
      const cs = getComputedStyle(box);
      const b = box.getBoundingClientRect();
      const left = b.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      const right = b.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
      const r = row.getBoundingClientRect();
      const rcs = getComputedStyle(row);
      const first = kids[0].getBoundingClientRect().left - parseFloat(rcs.paddingLeft) - parseFloat(rcs.borderLeftWidth);
      const last = kids[kids.length - 1].getBoundingClientRect().right + parseFloat(rcs.paddingRight) + parseFloat(rcs.borderRightWidth);
      const widths = tabs.filter((t) => !(trailing && t.matches(trailing))).map((t) => Math.round(t.getBoundingClientRect().width * 10) / 10);
      return { left, right, rowLeft: r.left, rowRight: r.right, first, last, widths };
    },
    { tab, trailing },
  );
}

async function firstHref(page: Page, path: string, selector: string): Promise<string | null> {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  return page.locator(selector).first().getAttribute("href", { timeout: 5_000 }).catch(() => null);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await clerkSetup();
    await signIn(page);
    const rows: Row[] = [
      { label: "Collection place strip", path: async () => "/collection", tab: "nav[aria-label] > [data-testid^='collection-tab-']", trailing: "[data-testid='collection-add-phone']" },
      { label: "Commanders place strip", path: async () => "/commanders", tab: "nav[aria-label] > [data-testid^='commanders-tab-']" },
      { label: "Import mode switch", path: async () => "/decks/import", tab: "[role='tablist'] > [role='tab']" },
      {
        label: "Update mode switch",
        path: async () => {
          await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
          const hrefs = await page.locator("a[href^='/decks/']").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
          const id = hrefs.map((h) => h.match(/^\/decks\/([0-9a-f-]{36})/)?.[1]).find(Boolean);
          return id ? `/decks/${id}/import` : null;
        },
        tab: "[role='tablist'] > [role='tab']",
      },
      { label: "Shopping view switch", path: async () => "/decks/shopping", tab: "[role='radiogroup'] > [id^='cart-view-']" },
      {
        label: "Friend place strip",
        path: async () => firstHref(page, "/friends", "a[href^='/friends/']:not([href='/friends/'])"),
        tab: "nav[aria-label] > [data-testid^='friend-tab-']",
      },
    ];
    for (const row of rows) {
      await page.setViewportSize({ width: 390, height: 844 });
      const path = await row.path();
      if (!path) {
        console.log(`SKIP ${row.label}: the reader's data draws no such page`);
        continue;
      }
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      const m = await measure(page, row.tab, row.trailing);
      if (!m) {
        console.log(`SKIP ${row.label}: fewer than two tabs drawn at ${path}`);
        continue;
      }
      check(`${row.label} @390 spans its container`, Math.abs(m.first - m.left) <= 1 && Math.abs(m.last - m.right) <= 1, `content ${m.left.toFixed(1)}..${m.right.toFixed(1)}, children ${m.first.toFixed(1)}..${m.last.toFixed(1)}`);
      check(`${row.label} @390 tabs equal`, Math.max(...m.widths) - Math.min(...m.widths) <= 1, `widths ${m.widths.join(", ")}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${row.label} @390 no page overflow`, overflow <= 0, `${overflow}px`);
      await page.setViewportSize({ width: 1300, height: 900 });
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${row.label} @1300 no page overflow`, wide <= 0, `${wide}px`);
    }
  } finally {
    await browser.close();
  }
  console.log(failed ? `\n${failed} FAILED` : "\nALL PASS");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
