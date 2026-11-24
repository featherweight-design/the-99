// Probe for the on-page copy editor overlay (admin + staging only). Presses the real controls at phone and desktop
// width on two pages and prints PASS/FAIL per assertion.
//
//   1 mode off: only the door (desktop pill text "Edit copy"; phone pencil aria-label "Edit copy")
//   2 press the door: the bar appears and outlines are drawn ([data-copy-outline] inside [data-copy-editor])
//   3 hover (desktop) / first tap (phone) targets a text: [data-copy-target] + [data-copy-tag]
//   4 a real click on a link does not navigate (URL unchanged)
//   5 Esc clears the target, Esc again ends the mode; Done ends it and returns focus to the door
//   6 (PROBE_GATE=closed) no door, no request to /api/copy-edit/rows. Restart the dev server WITHOUT ADMIN_USER_IDS
//     (or with ADMIN_ENV_LABEL unset) and run `PROBE_GATE=closed node scripts/probe-copy-editor.mjs`.
//
// Run (dev server started with ADMIN_USER_IDS=<audit user id> ADMIN_ENV_LABEL=staging):
//   PROBE_BASE=http://localhost:3107 E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app node scripts/probe-copy-editor.mjs
// SHOTS_DIR=<dir> also writes the per-state screenshots of /commanders/choose used for the contact sheet.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3107";
const CLOSED = process.env.PROBE_GATE === "closed";
const SHOTS = process.env.SHOTS_DIR;
const PAGES = ["/commanders/choose", "/decks"];
const VIEWPORTS = [
  { label: "phone", width: 390, height: 844, touch: true },
  { label: "desktop", width: 1300, height: 900, touch: false },
];
const SHOT_VIEWPORTS = [
  { label: "phone-390x844", width: 390, height: 844, touch: true },
  { label: "desktop-1300x900", width: 1300, height: 900, touch: false },
  { label: "ipad-1180x820", width: 1180, height: 820, touch: false },
  { label: "ipad-820x1180", width: 820, height: 1180, touch: false },
];

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : detail ? `  (${detail})` : ""}`);
};

// Email-code path: a +clerk_test address has no password we hold, and always accepts 424242.
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
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

const doorOf = (page, vp) =>
  vp.touch ? page.locator('button[aria-label="Edit copy"]:visible') : page.locator('button:visible', { hasText: "Edit copy" });

async function openPage(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
}

// The centre of the first outline of the given kind that is inside the viewport and not under the bar or header.
async function pickOutline(page, kind) {
  return page.evaluate((k) => {
    const bar = document.querySelector('[data-copy-editor] [role="region"]')?.getBoundingClientRect();
    for (const el of document.querySelectorAll(`[data-copy-editor] [data-copy-outline="${k}"]`)) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.top < 70 || r.bottom > innerHeight - 90) continue;
      if (bar && r.right > bar.left && r.left < bar.right && r.bottom > bar.top && r.top < bar.bottom) continue;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }
    return null;
  }, kind);
}

async function target(page, vp, pt) {
  if (vp.touch) await page.touchscreen.tap(pt.x, pt.y);
  else await page.mouse.move(pt.x, pt.y);
  await page.waitForTimeout(250);
}

async function runGateClosed(browser) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
    const page = await ctx.newPage();
    const requests = [];
    page.on("request", (r) => r.url().includes("/api/copy-edit/rows") && requests.push(r.url()));
    await signIn(page);
    for (const path of PAGES) {
      await openPage(page, path);
      await page.waitForTimeout(800);
      const doors = await doorOf(page, vp).count();
      check(`6 ${vp.label} ${path}: no door (gate closed)`, doors === 0, `doors=${doors}`);
      check(`6 ${vp.label} ${path}: no [data-copy-editor]`, (await page.locator("[data-copy-editor]").count()) === 0);
    }
    check(`6 ${vp.label}: no request to /api/copy-edit/rows`, requests.length === 0, `${requests.length} requests`);
    await ctx.close();
  }
}

async function runOpen(browser) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
    const page = await ctx.newPage();
    const requests = [];
    page.on("request", (r) => r.url().includes("/api/copy-edit/rows") && requests.push(r.url()));
    await signIn(page);
    for (const path of PAGES) {
      const tag = `${vp.label} ${path}`;
      requests.length = 0;
      await openPage(page, path);
      const door = doorOf(page, vp);
      await door.first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});

      // 1 mode off
      check(`1 ${tag}: exactly one visible door`, (await door.count()) === 1, `count=${await door.count()}`);
      check(`1 ${tag}: no bar, no outlines while off`, (await page.locator('[data-copy-editor] [role="region"], [data-copy-outline]').count()) === 0);
      if (vp.touch) {
        const order = await page.evaluate(() => {
          const pencil = document.querySelector('header button[aria-label="Edit copy"]');
          const search = document.querySelector('header [aria-label*="earch" i]');
          if (!pencil || !search) return { pencil: !!pencil, search: !!search };
          return { leftOfSearch: pencil.getBoundingClientRect().right <= search.getBoundingClientRect().left + 1 };
        });
        check(`1 ${tag}: pencil in header, left of search`, order.leftOfSearch === true, JSON.stringify(order));
      }
      check(`1 ${tag}: no rows request before the door`, requests.length === 0, `${requests.length}`);

      // 2 press the door
      await door.first().click();
      const bar = page.locator('[data-copy-editor] [role="region"][aria-label="Copy editor"]');
      await bar.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
      const barText = (await bar.innerText().catch(() => "")).replace(/\s+/g, " ");
      check(`2 ${tag}: bar shows Editing copy, staging, Done`, /Editing copy/.test(barText) && /staging/.test(barText) && /Done/.test(barText), barText);
      await page.waitForSelector("[data-copy-editor] [data-copy-outline]", { timeout: 10_000 }).catch(() => {});
      const hint = (await bar.innerText().catch(() => "")).replace(/\s+/g, " ");
      check(`2 ${tag}: hint present`, /Click any text|Tap any text/.test(hint), hint);
      const n = await page.locator("[data-copy-editor] [data-copy-outline]").count();
      const nRo = await page.locator('[data-copy-editor] [data-copy-outline="read-only"]').count();
      check(`2 ${tag}: outlines drawn (${n}, ${nRo} read-only)`, n > 0);
      const styles = await page.evaluate(() => {
        const e = document.querySelector('[data-copy-editor] [data-copy-outline="editable"]:not([data-copy-target])');
        const r = document.querySelector('[data-copy-editor] [data-copy-outline="read-only"]:not([data-copy-target])');
        const f = (el) => el && (getComputedStyle(el).outlineStyle !== "none" ? getComputedStyle(el).outlineStyle : getComputedStyle(el).boxShadow.includes("inset") ? "inset-shadow" : "none");
        return { editable: f(e), readOnly: f(r) };
      });
      check(`2 ${tag}: editable dashed (or inset when clipped)`, styles.editable === "dashed" || styles.editable === "inset-shadow" || styles.editable === null, JSON.stringify(styles));
      check(`2 ${tag}: read-only dotted (or inset when clipped)`, styles.readOnly === "dotted" || styles.readOnly === "inset-shadow" || styles.readOnly === null, JSON.stringify(styles));
      // clipped outlines draw inset, never as an outline
      const clip = await page.evaluate(() => {
        const all = [...document.querySelectorAll("[data-copy-editor] [data-copy-outline]")];
        const inset = all.filter((el) => getComputedStyle(el).boxShadow.includes("inset"));
        const bad = inset.filter((el) => getComputedStyle(el).outlineStyle !== "none");
        const outOfView = all.filter((el) => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; });
        return { inset: inset.length, bad: bad.length, outOfView: outOfView.length };
      });
      check(`4b ${tag}: clipped outlines inset (${clip.inset}), none also outlined, none past viewport sides`, clip.bad === 0 && clip.outOfView === 0, JSON.stringify(clip));

      // 3 target
      const ed = await pickOutline(page, "editable");
      check(`3 ${tag}: found an editable outline to target`, !!ed);
      if (ed) {
        await target(page, vp, ed);
        check(`3 ${tag}: ${vp.touch ? "first tap" : "hover"} sets [data-copy-target]`, (await page.locator("[data-copy-editor] [data-copy-target]").count()) === 1);
        const tagText = (await page.locator("[data-copy-tag]").innerText().catch(() => "")).replace(/\s+/g, " ");
        const want = vp.touch ? "Tap again to edit" : "Click to edit";
        check(`3 ${tag}: tag has "file · key" and "${want}"`, tagText.includes(" · ") && tagText.includes(want), tagText);
      }
      const ro = await pickOutline(page, "read-only");
      if (ro) {
        await target(page, vp, ro);
        const tagText = (await page.locator("[data-copy-tag]").innerText().catch(() => "")).replace(/\s+/g, " ");
        check(`3 ${tag}: read-only tag shows a reason (not an edit prompt)`, tagText.length > 0 && !/to edit|again to edit/.test(tagText), tagText);
      } else console.log(`SKIP  3 ${tag}: no read-only line on screen`);

      // 4 a real click on a link does not navigate or press
      const before = page.url();
      const link = await page.evaluate(() => {
        for (const a of document.querySelectorAll("a[href]")) {
          if (a.closest("[data-copy-editor]")) continue;
          const r = a.getBoundingClientRect();
          if (r.width < 10 || r.height < 10 || r.top < 70 || r.bottom > innerHeight - 90 || r.left < 0 || r.right > innerWidth) continue;
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          if (a.contains(document.elementFromPoint(cx, cy))) return { x: cx, y: cy, href: a.getAttribute("href") };
        }
        return null;
      });
      if (link) {
        if (vp.touch) await page.touchscreen.tap(link.x, link.y);
        else await page.mouse.click(link.x, link.y);
        await page.waitForTimeout(900);
        check(`4 ${tag}: click on link ${link.href} does not navigate`, page.url() === before, `${before} -> ${page.url()}`);
      } else console.log(`SKIP  4 ${tag}: no clickable link on screen`);
      // a button: aria-expanded/pressed must not flip
      const btn = await page.evaluate(() => {
        for (const b of document.querySelectorAll("button[aria-expanded], button[aria-pressed]")) {
          if (b.closest("[data-copy-editor]") || b.getAttribute("aria-label") === "Edit copy") continue;
          const r = b.getBoundingClientRect();
          if (r.width < 10 || r.top < 70 || r.bottom > innerHeight - 90 || r.right > innerWidth || r.left < 0) continue;
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          if (b.contains(document.elementFromPoint(cx, cy))) {
            b.dataset.probeBtn = "1";
            return { x: cx, y: cy, state: b.getAttribute("aria-expanded") ?? b.getAttribute("aria-pressed") };
          }
        }
        return null;
      });
      if (btn) {
        if (vp.touch) await page.touchscreen.tap(btn.x, btn.y);
        else await page.mouse.click(btn.x, btn.y);
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => { const b = document.querySelector("[data-probe-btn]"); return b?.getAttribute("aria-expanded") ?? b?.getAttribute("aria-pressed"); });
        check(`4 ${tag}: click on a toggle button does not press it`, after === btn.state, `${btn.state} -> ${after}`);
      } else console.log(`SKIP  4 ${tag}: no toggle button on screen`);

      // 5 Esc, Esc, Done
      if (ed) {
        await target(page, vp, ed);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
        check(`5 ${tag}: Esc once clears target, mode stays on`, (await page.locator("[data-copy-target]").count()) === 0 && (await bar.count()) === 1);
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      check(`5 ${tag}: Esc again turns mode off`, (await page.locator("[data-copy-editor] [role=region]").count()) === 0 && (await page.locator("[data-copy-outline]").count()) === 0);
      await doorOf(page, vp).first().click();
      await bar.waitFor({ state: "visible" }).catch(() => {});
      await bar.getByRole("button", { name: "Done" }).click();
      await page.waitForTimeout(300);
      check(`5 ${tag}: Done turns mode off`, (await bar.count()) === 0);
      const focusOk = await page.evaluate(() => {
        const a = document.activeElement;
        return !!a && a.tagName === "BUTTON" && /Edit copy/.test(a.getAttribute("aria-label") ?? a.textContent ?? "");
      });
      check(`5 ${tag}: focus returns to the door`, focusOk);
    }
    await ctx.close();
  }
}

async function shots(browser) {
  const { default: sharp } = await import("sharp");
  const path = "/commanders/choose";
  const files = {};
  for (const vp of SHOT_VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
    const page = await ctx.newPage();
    await signIn(page);
    await openPage(page, path);
    await doorOf(page, vp).first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    const out = [];
    const snap = async (state) => {
      const f = `${SHOTS}/${vp.label}-${state}.png`;
      await page.screenshot({ path: f });
      out.push([state, f]);
    };
    await snap("off");
    await doorOf(page, vp).first().click();
    await page.waitForSelector("[data-copy-editor] [data-copy-outline]", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(400);
    await snap("on");
    const ed = await pickOutline(page, "editable");
    if (ed) { await target(page, vp, ed); await snap("targeted"); }
    const ro = await pickOutline(page, "read-only");
    if (ro) { await target(page, vp, ro); await snap("readonly"); }
    files[vp.label] = out;
    await ctx.close();
  }
  // contact sheet: one row per viewport, a column per state, labeled
  const rows = [];
  for (const vp of SHOT_VIEWPORTS) {
    const cellH = 520;
    const cells = [];
    for (const [state, f] of files[vp.label]) {
      const img = await sharp(f).resize({ height: cellH - 28 }).png().toBuffer();
      const meta = await sharp(img).metadata();
      const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="28"><rect width="100%" height="100%" fill="#222"/><text x="6" y="19" font-family="monospace" font-size="14" fill="#fff">${vp.label} · ${state}</text></svg>`);
      const cell = await sharp({ create: { width: meta.width, height: cellH, channels: 3, background: "#222" } })
        .composite([{ input: label, top: 0, left: 0 }, { input: img, top: 28, left: 0 }]).png().toBuffer();
      cells.push({ buf: cell, w: meta.width });
    }
    let x = 0;
    const comps = cells.map((c) => { const o = { input: c.buf, left: x, top: 0 }; x += c.w + 8; return o; });
    const row = await sharp({ create: { width: x, height: cellH, channels: 3, background: "#555" } }).composite(comps).png().toBuffer();
    const f = `${SHOTS}/contact-sheet-${vp.label}.png`;
    await sharp(row).toFile(f);
    rows.push(f);
  }
  console.log("contact sheets:\n" + rows.join("\n"));
}

const browser = await chromium.launch();
try {
  await clerkSetup();
  if (CLOSED) await runGateClosed(browser);
  else {
    await runOpen(browser);
    if (SHOTS) await shots(browser);
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
