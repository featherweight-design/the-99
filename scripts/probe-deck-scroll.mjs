// #348: the deck detail screen must have exactly one scrolling context — the
// document. Walks the rendered tree at several viewport heights and reports any
// element that both overflows and is allowed to scroll, plus where the sticky
// quick-add dock actually sits relative to the viewport bottom.
//
// Run by hand: `node scripts/probe-deck-scroll.mjs` (optionally PROBE_DECK=<id>).
// Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop short · 1300x620", width: 1300, height: 620 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
  { label: "desktop tall · 1440x1400", width: 1440, height: 1400 },
];

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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

async function inspect(page) {
  return page.evaluate(() => {
    const overflowing = [];
    for (const node of document.querySelectorAll("body *")) {
      const s = getComputedStyle(node);
      const scrolls = (axis) => axis === "auto" || axis === "scroll";
      if (!scrolls(s.overflowY) && !scrolls(s.overflowX)) continue;
      const dy = node.scrollHeight - node.clientHeight;
      const dx = node.scrollWidth - node.clientWidth;
      if (dy <= 1 && dx <= 1) continue;
      if (node.getClientRects().length === 0) continue;
      const cls = (node.className ?? "").toString().slice(0, 90);
      overflowing.push({
        el: `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}.${cls}`,
        overflowY: s.overflowY,
        overflowX: s.overflowX,
        dy,
        dx,
      });
    }
    const dock = document.querySelector('[data-testid="quick-add-dock"]');
    const r = dock?.getBoundingClientRect();
    return {
      overflowing,
      docScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      dock: r
        ? {
            bottom: Math.round(r.bottom),
            viewportH: window.innerHeight,
            gapFromBottom: Math.round(window.innerHeight - r.bottom),
            position: getComputedStyle(dock).position,
          }
        : null,
    };
  });
}

await clerkSetup();
const browser = await chromium.launch();

let deckId = process.env.PROBE_DECK;
if (!deckId) {
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  deckId = await page.evaluate(() => {
    // `/decks/new` and `/decks/import` are routes, not decks — match a UUID.
    const uuid = /^\/decks\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const a = [...document.querySelectorAll('a[href^="/decks/"]')].find((n) =>
      uuid.test(n.getAttribute("href") ?? ""),
    );
    return a?.getAttribute("href")?.split("/")[2] ?? null;
  });
  await context.close();
  if (!deckId) throw new Error("No deck found on /decks — set PROBE_DECK.");
}
console.log(`deck: ${deckId}`);

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const seen = await inspect(page);
  console.log(`\n########## ${label}`);
  console.log(`  document scroll overflow: ${seen.docScroll}px`);
  console.log(
    `  dock: ${seen.dock ? `${seen.dock.position}, ${seen.dock.gapFromBottom}px above viewport bottom` : "ABSENT"}`,
  );
  if (seen.overflowing.length === 0) {
    console.log("  nested scrollports: none");
  } else {
    for (const o of seen.overflowing) {
      console.log(`  NESTED SCROLLPORT y=${o.overflowY} x=${o.overflowX} dy=${o.dy} dx=${o.dx}`);
      console.log(`    ${o.el}`);
    }
  }
  await context.close();
}

await browser.close();
