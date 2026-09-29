// Mana pips are painted with their symbol, not an empty box first (Hugh, 2026-09-28: "pips pop in").
//
// Every pip is a view in ONE sprite (`src/lib/cards/mana-sprite.ts`) that the root layout preloads.
// What this proves is timing and paint, which jsdom has neither of:
//
//   1. On a cold cache, the sprite has ARRIVED before the page's first contentful paint, on
//      `/commanders` (the colour control's five pips are in the server's markup). Every request is
//      held 150ms by `page.route`, because on localhost everything lands before the first paint
//      whether or not it was preloaded, and that says nothing about a real connection. With the
//      preload, the sprite is asked for from the head beside the stylesheet; without it, a CSS
//      background is asked for only once style is computed, and lands after the paint.
//   2. No pip asks for a per-symbol file: the old `/mana/W.svg` requests are what popped.
//   3. The card modal's cost draws from the sprite the page already holds: opened after load, the
//      sprite is not fetched again.
//   4. The fragment PAINTS, in Chromium and WebKit alike: a `<view>` fragment in a CSS background
//      is the part of this design an engine could get wrong silently, so each symbol the page
//      draws is drawn to a canvas through the same URL and must leave opaque pixels.
//
// Signs in once, then measures in a FRESH context per engine and width, so each run has an empty
// HTTP cache. Writes only the account's About row (captured and restored). Point it at `local-dev`,
// never production:
//   PROBE_BASE=http://localhost:3322 pnpm probe:pip-preload
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, webkit } from "playwright";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY", "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DELAY_MS = 150;
const WIDTHS = [
  { label: "390", width: 390, height: 844 },
  { label: "1300", width: 1300, height: 900 },
];
const ENGINES = [["chromium", chromium], ["webkit", webkit]];

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
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
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/** Every distinct pip URL the page draws, read off computed backgrounds. */
const PIP_URLS = () => {
  const urls = new Set();
  for (const el of document.querySelectorAll("*")) {
    const bg = getComputedStyle(el).backgroundImage;
    for (const m of bg.matchAll(/url\("?([^")]*\/mana\/[^")]*)"?\)/g)) urls.add(m[1]);
  }
  return [...urls];
};

/** Draws each URL to a canvas through an <img>, and counts opaque pixels. */
const PAINTED = async (urls) => {
  const out = {};
  for (const url of urls) {
    out[url] = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let opaque = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 200) opaque += 1;
        resolve(opaque);
      };
      img.onerror = () => resolve(-1);
      img.src = url;
    });
  }
  return out;
};

async function measure(browser, storage, engine, vp) {
  const context = await browser.newContext({ storageState: storage, viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const where = `${engine} @${vp.label}`;
  const perFile = [];
  const spriteFetches = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(BASE).origin) {
      if (/^\/mana\/(?!sprite\.svg)/.test(url.pathname)) perFile.push(url.pathname);
      if (url.pathname === "/mana/sprite.svg") spriteFetches.push(Date.now());
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    await route.continue();
  });
  try {
    await page.goto(`${BASE}/commanders`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    const timing = await page.evaluate(() => {
      const fcp = performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint");
      const sprite = performance.getEntriesByType("resource").find((e) => e.name.includes("/mana/sprite.svg"));
      return { fcp: fcp?.startTime ?? null, spriteEnd: sprite?.responseEnd ?? null, initiator: sprite?.initiatorType ?? null };
    });
    check(
      `${where}: the sprite has arrived by the first contentful paint`,
      timing.fcp !== null && timing.spriteEnd !== null && timing.spriteEnd <= timing.fcp,
      `sprite ${timing.spriteEnd?.toFixed(0)}ms (${timing.initiator}), first paint ${timing.fcp?.toFixed(0)}ms`,
    );

    const urls = await page.evaluate(PIP_URLS);
    check(`${where}: the page draws pips from the sprite`, urls.length > 0 && urls.every((u) => u.includes("/mana/sprite.svg#m-")),
      urls.join(", ") || "no pip drawn — NOT a pass");
    const painted = await page.evaluate(PAINTED, urls);
    const blank = Object.entries(painted).filter(([, n]) => n <= 50);
    check(`${where}: every pip's view paints its symbol`, urls.length > 0 && blank.length === 0,
      blank.length ? `blank: ${blank.map(([u, n]) => `${u.split("#")[1]}=${n}`).join(", ")}` : `${urls.length} views painted`);

    // The modal: open any card from /collection, whose cost draws from the sprite already held.
    await page.goto(`${BASE}/collection?view=rows`, { waitUntil: "load" });
    const before = spriteFetches.length;
    const trigger = onPage(page, 'button[aria-label^="View details for"]').first();
    await trigger.click();
    const cost = page.locator('[data-testid="modal-mana-cost"]').first();
    await cost.waitFor({ state: "visible", timeout: 15_000 });
    const costUrls = await cost.evaluate((el) => {
      const urls = [];
      for (const n of el.querySelectorAll("*")) {
        const m = getComputedStyle(n).backgroundImage.match(/url\("?([^")]*)"?\)/);
        if (m) urls.push(m[1]);
      }
      return urls;
    });
    check(`${where}: the modal's cost draws from the sprite`, costUrls.length > 0 && costUrls.every((u) => u.includes("/mana/sprite.svg#m-")),
      costUrls.join(", ") || "no cost drawn — open a costed card");
    check(`${where}: and does not fetch it again`, spriteFetches.length - before <= 1,
      `${spriteFetches.length - before} sprite request(s) after the page's own`);
    check(`${where}: no pip asks for a per-symbol file`, perFile.length === 0, perFile.join(", ") || "none");
  } finally {
    await context.close();
  }
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  const signInContext = await browser.newContext();
  const page = await signInContext.newPage();
  const userId = await signIn(page);
  const about = await captureAboutSeen(userId);
  try {
    await clearAboutSheet(page, userId);
    const storage = await signInContext.storageState();
    await signInContext.close();
    for (const [engine, launcher] of ENGINES) {
      const b = engine === "chromium" ? browser : await launcher.launch();
      try {
        for (const vp of WIDTHS) await measure(b, storage, engine, vp);
      } finally {
        if (b !== browser) await b.close();
      }
    }
  } finally {
    await restoreAboutSeen(about);
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  return failures;
}

main().then(
  (n) => process.exit(n === 0 ? 0 : 1),
  (error) => { console.error(error); process.exit(1); },
);
