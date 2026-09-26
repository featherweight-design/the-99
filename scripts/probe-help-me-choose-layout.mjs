// probe:help-me-choose-layout — two of Hugh's 2026-09-27 reports on Help me choose, at 1300x900 and
// 390x844. Both are facts about laid-out geometry, which jsdom does not produce.
//
// 1. THE THEME LIST IS A POPOVER. Focusing the Theme field opens its list OVER the fields below and
//    pushes nothing (ruling Q2). The probe reads the Budget field's top before the press and with the
//    list open: it must not move, the list must reach over it, and the list must be what is painted
//    there. A list left in flow moves Budget down by the list's height and passes nothing.
// 2. THE RESULTS ARE CENTERED. The results column keeps §4's 1160 box (1080 content) and centers
//    under the form (ruling Q2b (a)), and the header moves with it: at 1300 the space either side of
//    the column is equal, and the header's title starts on the column's content edge. At 390 nothing
//    is wider than the page.
//
// Needs a server with HELP_ME_CHOOSE_ENABLED=true. It writes the account's About row through
// `clearAboutSheet` and nothing else. Point it at `local-dev`, never production.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const RESULTS = "/decks/new/choose?c=g&t=dinosaurs&v=results";

const VIEWPORTS = [
  { label: 1300, width: 1300, height: 900 },
  { label: 390, width: 390, height: 844 },
];

let failures = 0;
function report(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
}

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
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

await clerkSetup();
const browser = await chromium.launch();

try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const userId = await signIn(page);
    await clearAboutSheet(page, userId);

    // ---- 1. The theme list opens over the fields and pushes nothing -------------------------------
    await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
    const combo = onPageRole(page, "combobox");
    await combo.waitFor({ timeout: 60_000 });
    const budget = onPage(page, 'input[placeholder="No cap"]');
    const before = await budget.evaluate((n) => n.getBoundingClientRect().top);
    await combo.click();
    const list = onPageRole(page, "listbox");
    await list.waitFor({ timeout: 10_000 });
    const open = await list.evaluate((ul) => {
      const box = ul.getBoundingClientRect();
      const field = document.querySelector('main input[placeholder="No cap"]').getBoundingClientRect();
      // What is painted a few pixels inside the list, over the Budget field's row.
      const y = Math.min(box.bottom - 4, Math.max(box.top + 4, field.top + field.height / 2));
      const hit = document.elementFromPoint(box.left + box.width / 2, y);
      return { top: field.top, listBottom: box.bottom, onTop: Boolean(hit && ul.contains(hit)), options: ul.children.length };
    });
    report(`${vp.label} theme list: the fields below do not move`, Math.abs(open.top - before) < 0.5,
      `Budget at ${Math.round(before)}px closed, ${Math.round(open.top)}px open`);
    report(`${vp.label} theme list: it reaches over the fields below, painted on top`,
      open.options > 0 && open.listBottom > open.top && open.onTop,
      `${open.options} options, list bottom ${Math.round(open.listBottom)}px, Budget top ${Math.round(open.top)}px, on top ${open.onTop}`);
    await page.keyboard.press("Escape");

    // ---- 2. The results column is centered, and the header moves with it --------------------------
    await page.goto(`${BASE}${RESULTS}`, { waitUntil: "networkidle" });
    await onPage(page, "h1").first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(500);
    const layout = await page.evaluate(() => {
      const main = document.querySelector("main").getBoundingClientRect();
      const header = document.querySelector("main h1").closest("header");
      const column = header.nextElementSibling;
      const col = column.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(column).paddingLeft);
      return {
        left: col.left - main.left,
        right: main.right - col.right,
        width: col.width,
        titleAt: document.querySelector("main h1").getBoundingClientRect().left,
        contentAt: col.left + pad,
        docOver: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    if (vp.width >= 768) {
      report(`${vp.label} results: the column is centered`, layout.width <= 1160.5 && Math.abs(layout.left - layout.right) < 1.5,
        `${Math.round(layout.width)}px wide, ${Math.round(layout.left)}px left, ${Math.round(layout.right)}px right`);
      report(`${vp.label} results: the title starts on the column's content edge`,
        Math.abs(layout.titleAt - layout.contentAt) < 1.5, `title ${Math.round(layout.titleAt)}px, content ${Math.round(layout.contentAt)}px`);
    }
    report(`${vp.label} results: nothing wider than the page`, layout.docOver <= 0, `${layout.docOver}px`);
    await context.close();
  }
} catch (error) {
  failures += 1;
  console.error(error);
} finally {
  await browser.close();
}

console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
