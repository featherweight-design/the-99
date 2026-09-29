// Mana pips are painted with their symbol, not an empty box first (Hugh, 2026-09-28: "pips pop in").
//
// Every pip is a cell of ONE sprite (`src/lib/cards/mana-sprite.ts`) that the root layout preloads.
// What this proves is timing and paint, which jsdom has neither of:
//
//   1. On a cold cache, the sprite has ARRIVED before the first pip is even in the document, on
//      `/commanders` (the colour control's five pips are in the server's markup), which is before
//      that pip can paint. A MutationObserver installed before the document parses stamps the
//      moment. Every request is held 150ms by `page.route`, because on localhost everything lands
//      before the first paint whether or not it was preloaded, and that says nothing about a real
//      connection. With the preload, the sprite is asked for from the head beside the stylesheet;
//      without it, a CSS background is asked for only once style is computed, after the pip exists.
//   2. No pip asks for a per-symbol file: the old `/mana/W.svg` requests are what popped.
//   3. The card modal's cost draws from the sprite the page already holds: opened after load, the
//      sprite is not fetched again.
//   4. Each pip PAINTS its symbol, in Chromium and WebKit alike. A pip is a window onto the sheet
//      placed by percentages, and a wrong size draws the whole sheet as a thin strip with markup
//      identical to a working build: the first design (SVG `<view>` fragments) did exactly that. So
//      each pip's window is redrawn to a canvas from its own computed size and position, and must
//      cover half its box with opaque pixels (a round symbol covers about three quarters).
//   5. The deck page's commander art is asked for by its preload, not found later by style.
//
// Signs in once, then measures in a FRESH context per engine and width, so each run has an empty
// HTTP cache. Writes only the account's About row (captured and restored). Point it at `local-dev`,
// never production:
//   PROBE_BASE=http://localhost:3322 pnpm probe:pip-preload
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, webkit } from "playwright";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage, openSheet } from "./lib/surface.mjs";
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

/** Every distinct pip background the page draws: the URL, and the window's computed size and position. */
const PIPS = () => {
  const out = new Map();
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const m = cs.backgroundImage.match(/url\("?([^")]*\/mana\/[^")]*)"?\)/);
    if (!m) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const key = `${cs.backgroundSize}|${cs.backgroundPosition}`;
    if (!out.has(key)) out.set(key, { url: m[1], w: r.width, h: r.height, size: cs.backgroundSize, pos: cs.backgroundPosition });
  }
  return [...out.values()];
};

/** Redraws each pip's window onto a canvas of its own box, and returns the opaque share of it. */
const PAINTED = async (pips) => {
  const pct = (v) => parseFloat(v) / 100;
  const out = [];
  for (const p of pips) {
    out.push(await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = Math.round(p.w), h = Math.round(p.h);
        const [sx, sy] = p.size.split(" ").map(pct);
        const [px, py] = p.pos.split(" ").map(pct);
        const dw = w * sx, dh = h * sy;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, (w - dw) * px, (h - dh) * py, dw, dh);
        const data = ctx.getImageData(0, 0, w, h).data;
        let opaque = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 200) opaque += 1;
        resolve({ ...p, share: opaque / (w * h) });
      };
      img.onerror = () => resolve({ ...p, share: -1 });
      img.src = p.url;
    }));
  }
  return out;
};

async function measure(browser, storage, engine, vp) {
  const context = await browser.newContext({ storageState: storage, viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  // The first moment any element drawing from the sprite exists, stamped by an observer installed
  // before the document parses, so it sees the server's own markup arrive as well as later mounts.
  await page.addInitScript(() => {
    window.__firstPip = null;
    const hit = (n) => n.nodeType === 1 && ((n.getAttribute("style") ?? "").includes("sprite.svg") || n.querySelector?.('[style*="sprite.svg"]'));
    new MutationObserver((records) => {
      if (window.__firstPip !== null) return;
      for (const r of records) for (const n of r.addedNodes) if (hit(n)) { window.__firstPip = performance.now(); return; }
    }).observe(document, { childList: true, subtree: true });
  });
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
    // Below the rack's width the colour pips live in the filter sheet: open it, which is the first
    // time they render on the phone. The press waits for the network to settle: with every request
    // held, `load` fires before hydration, and a press before it opens nothing.
    if (vp.width < 1000) {
      await page.waitForLoadState("networkidle");
      if ((await openSheet(page)) === null) check(`${where}: the filter sheet opens`, false, "no trigger found");
    }
    await page.waitForFunction(() => window.__firstPip !== null, null, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const timing = await page.evaluate(() => {
      const sprite = performance.getEntriesByType("resource").find((e) => e.name.includes("/mana/sprite.svg"));
      return { pip: window.__firstPip, spriteEnd: sprite?.responseEnd ?? null, initiator: sprite?.initiatorType ?? null };
    });
    check(
      `${where}: the sprite has arrived before the first pip is drawn`,
      timing.pip !== null && timing.spriteEnd !== null && timing.spriteEnd <= timing.pip,
      `sprite ${timing.spriteEnd?.toFixed(0)}ms (${timing.initiator}), first pip ${timing.pip?.toFixed(0)}ms`,
    );

    const pips = await page.evaluate(PIPS);
    check(`${where}: the page draws pips from the sprite`, pips.length > 0 && pips.every((p) => p.url.endsWith("/mana/sprite.svg")),
      pips.map((p) => p.url).join(", ") || "no pip drawn — NOT a pass");
    // A round symbol covers ~78% of its square; the strip the fragment design drew covered ~2%.
    const painted = await page.evaluate(PAINTED, pips);
    const blank = painted.filter((p) => p.share < 0.5);
    check(`${where}: every pip's window paints its symbol`, pips.length > 0 && blank.length === 0,
      blank.length ? `blank: ${blank.map((p) => `${p.pos}=${p.share.toFixed(2)}`).join(", ")}`
        : `${pips.length} windows painted, min ${Math.min(...painted.map((p) => p.share)).toFixed(2)}`);

    // The modal: open any card from /collection, whose cost draws from the sprite already held.
    await page.goto(`${BASE}/collection?view=rows`, { waitUntil: "load" });
    const before = spriteFetches.length;
    const trigger = onPage(page, "button[aria-busy]").first();
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
    check(`${where}: the modal's cost draws from the sprite`, costUrls.length > 0 && costUrls.every((u) => u.endsWith("/mana/sprite.svg")),
      costUrls.join(", ") || "no cost drawn — open a costed card");
    check(`${where}: and does not fetch it again`, spriteFetches.length === before,
      `${spriteFetches.length - before} sprite request(s) after the page's own`);
    check(`${where}: no pip asks for a per-symbol file`, perFile.length === 0, perFile.join(", ") || "none");

    // The commander's art, preloaded at high priority by the deck page. Read off the art the header
    // actually paints: its URL must be a `link` request, asked for before the stylesheet that would
    // otherwise be what finds it has been applied.
    await page.goto(`${BASE}/decks`, { waitUntil: "load" });
    // The list streams in behind the route's loader, after `load` on a held connection.
    await page.waitForFunction(() => [...document.querySelectorAll("main a[href^='/decks/']")]
      .some((a) => /^\/decks\/[0-9a-f-]{36}$/.test(a.getAttribute("href"))), null, { timeout: 30_000 }).catch(() => {});
    const href = await onPage(page, 'a[href^="/decks/"]').evaluateAll((as) =>
      as.map((a) => a.getAttribute("href")).find((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h)) ?? null);
    if (!href) {
      check(`${where}: the commander's art is preloaded`, false, "no deck on the account");
    } else {
      await page.goto(`${BASE}${href}`, { waitUntil: "load" });
      await page.waitForTimeout(500);
      const art = await page.evaluate(() => {
        const urls = new Set();
        for (const el of document.querySelectorAll("main *")) {
          const m = getComputedStyle(el).backgroundImage.match(/url\("?(https:\/\/[^")]*art_crop[^")]*)"?\)/);
          if (m) urls.add(m[1]);
        }
        const entries = performance.getEntriesByType("resource");
        return [...urls].map((u) => {
          const e = entries.find((r) => r.name === u);
          return { u, initiator: e?.initiatorType ?? null, start: e?.startTime ?? null };
        });
      });
      const link = art.find((a) => a.initiator === "link");
      check(`${where}: the commander's art is preloaded`, Boolean(link),
        art.map((a) => `${a.initiator}@${a.start?.toFixed(0)}ms`).join(", ") || "no art drawn on the deck page — NOT a pass");
    }
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
