// #288 on screen, driven rather than read. Opens a deck's Shopping filter at
// three viewports and reports what the price work actually rendered: the buy
// tag's tail, the strip's two arrangements, the tile scrim's composited colour,
// and whether the worst row overflows at 320px.
//
// The unit tests prove the branches; this proves they reach a screen. The tag
// spent an earlier life nested inside a button whose `aria-label` swallowed it,
// and every unit test passed throughout.
//
// Run by hand: `node scripts/probe-price-ui.mjs`. Not part of `pnpm test` — it
// needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";

const VIEWPORTS = [
  { label: "narrowest supported · 320x700", width: 320, height: 700 },
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1280x900", width: 1280, height: 900 },
];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });

  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
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

async function report(page, label) {
  console.log(`\n=== ${label}`);

  // The strip. One subtree, so a doubled count here is the duplication defect.
  const provenance = page.getByText(/prices from ManaPool/);
  const stripCount = await provenance.count();
  console.log(`  strip provenance lines: ${stripCount}`);
  if (stripCount > 0) {
    console.log(`    text: ${JSON.stringify((await provenance.first().textContent())?.trim())}`);
    const plate = await provenance.first().evaluate((n) => {
      const box = n.closest("div");
      const s = getComputedStyle(box);
      const r = box.getBoundingClientRect();
      const kids = [...box.children].map((c) => c.textContent.trim().slice(0, 28));
      return {
        direction: s.flexDirection,
        justify: s.justifyContent,
        radius: s.borderRadius,
        border: s.borderTopWidth + " " + s.borderTopColor,
        background: s.backgroundColor,
        width: Math.round(r.width),
        height: Math.round(r.height),
        domOrder: kids,
        // Painted order is what a sighted reader sees; DOM order is what a
        // screen reader hears. `flex-row-reverse` makes them differ on purpose.
        paintedOrder: [...box.children]
          .map((c) => ({ x: c.getBoundingClientRect().left, t: c.textContent.trim().slice(0, 28) }))
          .sort((a, b) => a.x - b.x)
          .map((c) => c.t),
      };
    });
    console.log(`    plate: ${JSON.stringify(plate, null, 6)}`);
  }

  // The tag's tail. A figure that never reaches a screen is the whole risk.
  const tails = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("span.font-mono")) {
      const t = el.textContent.trim();
      if (!/^buy/.test(t)) continue;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      out.push({
        text: t,
        width: Math.round(r.width),
        background: s.backgroundColor,
        fontSize: s.fontSize,
        // The tile plate is positioned; the row plate is not.
        variant: s.position === "absolute" ? "tile" : "row",
      });
    }
    return out;
  });
  console.log(`  buy tags on screen: ${tails.length}`);
  for (const t of tails.slice(0, 8)) {
    console.log(
      `    [${t.variant}] ${JSON.stringify(t.text)} w=${t.width} size=${t.fontSize} bg=${t.background}`,
    );
  }

  // The 58px slot, and whether the worst row overflows the narrowest phone.
  const rows = await page.evaluate(() => {
    const doc = document.scrollingElement;
    return {
      overflows: doc.scrollWidth > doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  console.log(`  horizontal overflow: ${rows.overflows} (${rows.scrollWidth}/${rows.clientWidth})`);
}

await clerkSetup();
const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  const deckHref = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href"))
      .find((href) => /^\/decks\/[0-9a-f-]{36}$/.test(href ?? "")),
  );
  if (!deckHref) {
    console.log("  no deck on this account");
    await context.close();
    continue;
  }

  await page.goto(`${BASE}${deckHref}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const shopping = page.getByRole("button", { name: /^Shopping \d+$/ });
  if ((await shopping.count()) === 0) {
    console.log("  no Shopping pill on this deck");
    await context.close();
    continue;
  }
  console.log(`  pill: ${JSON.stringify(await shopping.first().textContent())}`);
  await shopping.first().click();
  await page.waitForTimeout(500);
  await report(page, `shopping ${deckHref}`);

  // The tile variant lives on the Consider tab, where the tag sits on card art
  // and the scrim is the only thing holding the warning ink off it.
  const tab = page.getByRole("tab", { name: /cards to consider/i });
  if ((await tab.count()) > 0) {
    await tab.first().click();
    await page.waitForTimeout(900);
    await report(page, `consider ${deckHref}`);

    // The scrim, composited. `color-mix(… var(--bg) 92%, transparent)` over art
    // is what a reader actually sees; the declaration alone proves nothing.
    const scrim = await page.evaluate(() => {
      for (const el of document.querySelectorAll("span.font-mono")) {
        if (!/^buy/.test(el.textContent.trim())) continue;
        if (getComputedStyle(el).position !== "absolute") continue;
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, color: s.color, ring: s.boxShadow };
      }
      return null;
    });
    console.log(`  tile scrim: ${JSON.stringify(scrim)}`);
  }

  await context.close();
}

await browser.close();
