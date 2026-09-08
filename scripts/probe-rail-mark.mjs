// Gate for the rail-mark change: the 62px rail's head is the crowned numeral,
// not a bare diamond (design/design_handoff_the99_rail_mark/CHROME-rail-mark.md).
//
// JSDOM has no layout, so `marks.test.tsx` can prove the SVG's geometry and say
// nothing about whether the three diamonds are visibly separate once the browser
// has rasterised them, or where the nav block ends up underneath. That is what
// this probe measures. It also walks the six themes to confirm the crown is the
// only accented part of the mark.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-rail-mark.mjs
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

// Read from the stylesheet rather than the TS registry, so a seventh theme is
// walked the day it is declared — the same source `probe-themes.mjs` uses.
const SHEET = new URL("../src/app/globals.css", import.meta.url);
const THEMES = [
  ...new Set([...readFileSync(SHEET, "utf8").matchAll(/\[data-theme="([a-z]+)"\]/g)].map((m) => m[1])),
];
if (THEMES.length < 6) throw new Error(`Read ${THEMES.length} themes from ${SHEET.pathname}.`);

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
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor?.emailAddressId,
          });
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

// The head, measured off the page: its own box, each diamond's painted extent,
// the air between them, and where the nav starts relative to the rail's top.
const READ_HEAD = `() => {
  const round = (n) => Math.round(n * 100) / 100;
  const rail = document.querySelector('aside');
  const head = rail?.querySelector('svg[role="img"]');
  const nav = rail?.querySelector('nav[aria-label="Primary"]');
  if (!rail || !head || !nav) return { error: 'rail, head or nav not found' };
  const railBox = rail.getBoundingClientRect();
  const headBox = head.getBoundingClientRect();
  const navBox = nav.getBoundingClientRect();
  // getBoundingClientRect on a rotated <rect> reports the *painted* box, which
  // is the diamond itself rather than the unrotated square — exactly the
  // measurement the flex-gap bug got wrong.
  const diamonds = [...head.querySelectorAll('rect')].map((r) => {
    const b = r.getBoundingClientRect();
    return { left: round(b.left), right: round(b.right), width: round(b.width), fill: getComputedStyle(r).fill };
  });
  const air = diamonds.slice(1).map((d, i) => round(d.left - diamonds[i].right));
  return {
    railWidth: round(railBox.width),
    railPaddingTop: getComputedStyle(rail).paddingTop,
    head: {
      name: head.getAttribute('aria-label'),
      role: head.getAttribute('role'),
      width: round(headBox.width),
      height: round(headBox.height),
      topOffset: round(headBox.top - railBox.top),
      marginBottom: getComputedStyle(head).marginBottom,
    },
    diamonds,
    air,
    numeralFill: getComputedStyle(head.querySelector('text')).fill,
    navTopOffset: round(navBox.top - railBox.top),
    // The rule the refresh set and this change keeps: one mark, at the top.
    marksInRail: rail.querySelectorAll('svg[role="img"][aria-label="The 99"]').length,
    markPrecedesNav: Boolean(
      head.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  };
}`;

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  const layout = await page.evaluate(`(${READ_HEAD})()`);

  // Crown accented, numerals not: the two have to differ under every theme, or
  // the mark is one flat colour somewhere.
  const byTheme = {};
  for (const theme of THEMES) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
    }, theme);
    byTheme[theme] = await page.evaluate(() => {
      const head = document.querySelector('aside svg[role="img"]');
      return {
        crown: getComputedStyle(head.querySelector("rect")).fill,
        numerals: getComputedStyle(head.querySelector("text")).fill,
      };
    });
    await page.screenshot({ path: `/tmp/rail-mark-${theme}.png`, clip: { x: 0, y: 0, width: 200, height: 220 } });
  }

  await browser.close();

  const flat = Object.entries(byTheme).filter(([, v]) => v.crown === v.numerals);
  console.log(JSON.stringify({ layout, byTheme }, null, 2));
  console.log(
    flat.length
      ? `FAIL: crown and numerals share a colour under ${flat.map(([t]) => t).join(", ")}`
      : `OK: crown and numerals differ under all ${THEMES.length} themes`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
