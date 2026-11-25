// Probe for the on-page copy editor overlay (admin + staging only). Presses the real controls at phone and desktop
// width on two pages and prints PASS/FAIL per assertion.
//
//   1 mode off: only the door (desktop pill text "Edit copy"; phone pencil aria-label "Edit copy")
//   2 press the door: the bar appears and outlines are drawn ([data-copy-outline] inside [data-copy-editor])
//   3 hover (desktop) / first tap (phone) targets a text: [data-copy-target] + [data-copy-tag]
//   4 a real click on a link does not navigate (URL unchanged)
//   5 Esc clears the target, Esc again ends the mode; Done ends it and returns focus to the door
//   6 (PROBE_GATE=closed) no door, no request to /api/copy-edit/rows. Restart the dev server with ONE leg missing at a
//     time (no ADMIN_USER_IDS; ADMIN_ENV_LABEL unset; VERCEL_PROJECT_PRODUCTION_URL unset) and run
//     `PROBE_GATE=closed node scripts/probe-copy-editor.mjs` for each, so each leg is proven shut on its own.
//
// Run (dev server started with ADMIN_USER_IDS=<audit user id> ADMIN_ENV_LABEL=staging
// VERCEL_PROJECT_PRODUCTION_URL=staging.the-99.dev; the last is the gate's project leg, which Vercel sets on staging):
//   PROBE_BASE=http://localhost:3107 E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app node scripts/probe-copy-editor.mjs
//   7+ the editor (PR 4): press a line open, the dialog (popover 420px / bottom sheet), word count, em dash refusal,
//     chips that cannot be deleted, variation fields, Add to edits / reload / Update / Remove, Esc + focus return, Tab
//     wrap, read-only panel, the which-key picker. PROBE_ONLY=editor runs just this part (use it under --webpack).
//     Every assertion needs the dialog, so each FAILS on main (no editor): the door and outlines exist there, a click
//     on a line opens nothing, and `[role=dialog]` never appears.
// SHOTS_DIR=<dir> also writes the per-state screenshots of /commanders/choose used for the contact sheet.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { readFileSync } from "node:fs";
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


// Read-only target + inset ring. Walks routes that render read-only copy (About pages: card names in the rule diagrams;
// the Landing's example rows) and long clamped/truncated copy, scrolling for an on-screen hit. When no real route yields
// one the probe injects a labelled FIXTURE node on a real page and says so.
const STATE_ROUTES = ["/about", ...["home", "collection", "commanders", "decks", "shopping", "friends"].map((a) => `/about/${a}`), "/decks", "/commanders/choose", "/preview/landing"];

async function findOnScroll(page, probeFn) {
  for (let step = 0; step < 14; step++) {
    const hit = await page.evaluate(probeFn);
    if (hit) return hit;
    const more = await page.evaluate(() => {
      const before = scrollY;
      scrollBy(0, Math.round(innerHeight * 0.7));
      return scrollY !== before;
    });
    await page.waitForTimeout(350);
    if (!more) break;
  }
  return null;
}

const readOnlyOnScreen = () => {
  for (const el of document.querySelectorAll('[data-copy-editor] [data-copy-outline="read-only"]')) {
    const r = el.getBoundingClientRect();
    if (r.width >= 8 && r.height >= 8 && r.top > 70 && r.bottom < innerHeight - 90 && r.left >= 0 && r.right <= innerWidth) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
};
const insetOnScreen = () => {
  for (const el of document.querySelectorAll("[data-copy-editor] [data-copy-outline]")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.boxShadow.includes("inset") && r.width >= 8 && r.top > 70 && r.bottom < innerHeight - 90) return { x: r.left + r.width / 2, y: r.top + r.height / 2, outline: cs.outlineStyle, shadow: cs.boxShadow.slice(0, 60) };
  }
  return null;
};

async function runStates(browser) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
    const page = await ctx.newPage();
    await signIn(page);
    let roDone = false;
    let insetDone = false;
    const barOf = () => page.locator('[data-copy-editor] [role="region"][aria-label="Copy editor"]');
    const turnOn = async () => {
      await doorOf(page, vp).first().click();
      await barOf().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      await page.waitForSelector("[data-copy-editor] [data-copy-outline]", { timeout: 10000 }).catch(() => {});
    };
    const assertReadOnly = async (src, hit) => {
      await target(page, vp, hit);
      const tagText = (await page.locator("[data-copy-tag]").innerText().catch(() => "")).replace(/\s+/g, " ");
      const tgt = await page.locator('[data-copy-editor] [data-copy-target][data-copy-outline="read-only"]').count();
      check(`7 ${vp.label} read-only [${src}]: ${vp.touch ? "first tap" : "hover"} targets a read-only outline`, tgt === 1, `targets=${tgt}`);
      check(`7 ${vp.label} read-only [${src}]: tag shows the reason, not an edit prompt`, /edit in code|data, not copy/i.test(tagText) && !/to edit/i.test(tagText), tagText);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${vp.label}-readonly-targeted.png` });
    };
    const assertInset = async (src, hit) => {
      check(`8 ${vp.label} inset ring [${src}]: inset box-shadow and no outline`, hit.outline === "none" || hit.outline === "", JSON.stringify(hit));
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${vp.label}-inset-ring.png` });
    };
    for (const path of STATE_ROUTES) {
      if (roDone && insetDone) break;
      const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      if (!res || res.status() >= 400) { console.log(`INFO  ${vp.label} ${path}: status ${res?.status()}`); continue; }
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      if (!(await doorOf(page, vp).count())) { console.log(`INFO  ${vp.label} ${path}: no door (redirected to ${page.url()})`); continue; }
      await turnOn();
      if (!roDone) {
        const hit = await findOnScroll(page, readOnlyOnScreen);
        if (hit) { roDone = true; console.log(`INFO  ${vp.label}: real read-only line on ${path}`); await assertReadOnly(`route ${path}`, hit); }
      }
      if (!insetDone) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(300);
        const hit = await findOnScroll(page, insetOnScreen);
        if (hit) { insetDone = true; console.log(`INFO  ${vp.label}: real clipped line on ${path}`); await assertInset(`route ${path}`, hit); }
      }
      await barOf().getByRole("button", { name: "Done" }).click().catch(() => {});
    }
    if (!roDone || !insetDone) {
      // FIXTURE: a real page with injected nodes whose text is a known row.
      await openPage(page, "/decks");
      await turnOn();
      await page.evaluate(() => {
        const mk = (id, text, top, css) => {
          const el = document.createElement("span");
          el.id = id;
          el.textContent = text;
          el.style.cssText = `position:fixed;left:20px;top:${top}px;z-index:30;${css}`;
          document.body.appendChild(el);
        };
        mk("probe-fixture-ro", "Craterhoof Behemoth", 130, "color:#fff");
        mk("probe-fixture-clip", "Say as much or as little as you like. Every answer is optional, and the more you give, the closer the fit.", 180, "width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:block;color:#fff");
      });
      await page.waitForTimeout(900);
      if (!roDone) {
        const hit = await page.evaluate(readOnlyOnScreen);
        check(`7 ${vp.label} read-only [FIXTURE span "Craterhoof Behemoth" injected on /decks]: outline exists`, !!hit);
        if (hit) await assertReadOnly("FIXTURE", hit);
      }
      if (!insetDone) {
        const hit = await page.evaluate(insetOnScreen);
        check(`8 ${vp.label} inset ring [FIXTURE 120px overflow:hidden span injected on /decks]: inset outline exists`, !!hit);
        if (hit) await assertInset("FIXTURE", hit);
      }
    }
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The editor (PR 4). Lines are found by pressing them open; a class with no real line on the probed routes uses a
// labelled FIXTURE: a span injected on /decks carrying a real row's text, so the real matcher and editor run on it.
const DIALOG = "[data-copy-editor] [role=dialog]";
const EDITOR_ROUTES = ["/commanders/choose", "/decks", "/about/home", "/about", "/preview/landing"];
const CLASSES = ["plain", "chip", "variation", "which", "readonly"];
const rowsJson = JSON.parse(readFileSync(new URL("../.generated/copy-rows.json", import.meta.url), "utf8"));
const base = (k) => k.replace(/#t\d+$/, "");
const FIXTURES = (() => {
  const chip = rowsJson.find((r) => !r.readOnly && !r.key.includes("#t") && r.placeholders.length === 1 && r.text.replace(/\{[^{}]+\}/g, "").length >= 8 && r.text.length < 40);
  const variation = rowsJson.find((r) => r.key.endsWith("#t1") && !r.placeholders.length);
  const by = new Map();
  for (const r of rowsJson) if (!r.readOnly && !r.placeholders.length) by.set(r.text, new Set([...(by.get(r.text) ?? []), base(r.key)]));
  const which = [...by].find(([t, k]) => k.size > 1 && t.length > 10 && t.length < 40)?.[0];
  const ro = rowsJson.find((r) => r.readOnly && !r.placeholders.length && r.text.length > 4 && r.text.length < 30 && rowsJson.filter((o) => o.text === r.text).length === 1);
  const counts = new Map();
  for (const r of rowsJson) counts.set(r.text, (counts.get(r.text) ?? 0) + 1);
  const plain = rowsJson.find((r) => r.kind === "text" && !r.readOnly && !r.placeholders.length && !r.key.includes("#t") && counts.get(r.text) === 1 && /^[A-Z][a-z]+ [a-z]+ [a-z]+ [a-z ]+$/.test(r.text) && r.text.length < 40 && !/\.(label|cta|button|chip|title|head|eyebrow)$/.test(r.key));
  return { plain: plain?.text, chip: chip?.text.replace(/\{[^{}]+\}/g, "5"), variation: variation?.text, which, readonly: ro?.text };
})();

const barOf = (page) => page.locator('[data-copy-editor] [role="region"][aria-label="Copy editor"]');

async function injectFixture(page, fixtureText) {
  await page.evaluate((text) => {
    // Park the fixture where no existing outline sits, so a press reaches it and nothing else.
    const rects = [...document.querySelectorAll("[data-copy-editor] [data-copy-outline]")].map((e) => e.getBoundingClientRect());
    let top = 160;
    for (let t = 160; t < innerHeight - 160; t += 12) {
      if (!rects.some((r) => r.right > 10 && r.left < 260 && r.bottom > t - 6 && r.top < t + 34)) { top = t; break; }
    }
    const el = document.createElement("span");
    el.id = "probe-fixture-line";
    el.textContent = text;
    el.style.cssText = "position:fixed;left:20px;top:" + top + "px;z-index:30;color:#fff;font-size:16px";
    document.body.appendChild(el);
  }, fixtureText);
  await page.waitForTimeout(900);
  return page.evaluate(() => { const r = document.getElementById("probe-fixture-line").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left }; });
}

async function enter(page, vp, path, fixtureText) {
  await openPage(page, fixtureText ? "/decks" : path);
  await doorOf(page, vp).first().waitFor({ state: "visible", timeout: 15_000 });
  await doorOf(page, vp).first().click();
  await barOf(page).waitFor({ state: "visible", timeout: 5000 });
  await page.waitForSelector("[data-copy-editor] [data-copy-outline]", { timeout: 10_000 }).catch(() => {});
  if (fixtureText) await injectFixture(page, fixtureText);
  await page.waitForTimeout(300);
}

async function listOutlines(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('[data-copy-editor] [role="region"]')?.getBoundingClientRect();
    const out = [];
    for (const el of document.querySelectorAll("[data-copy-editor] [data-copy-outline]")) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.top < 70 || r.bottom > innerHeight - 90 || r.left < 0 || r.right > innerWidth) continue;
      if (bar && r.right > bar.left && r.left < bar.right && r.bottom > bar.top && r.top < bar.bottom) continue;
      out.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, clipped: getComputedStyle(el).boxShadow.includes("inset") });
    }
    return out;
  });
}

async function openLine(page, vp, pt) {
  await target(page, vp, pt);
  if ((await page.locator(DIALOG).count()) === 0) {
    if (vp.touch) await page.touchscreen.tap(pt.x, pt.y);
    else await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(350);
  }
  return (await page.locator(DIALOG).count()) > 0;
}

const classify = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('[data-copy-editor] [role=dialog]');
    if (!d) return null;
    if (/Which one is this\?/.test(d.innerText)) return "which";
    const tbs = d.querySelectorAll("[role=textbox]").length;
    if (!tbs) return "readonly";
    if (tbs > 1) return "variation";
    return d.querySelector("[data-fill]") ? "chip" : "plain";
  });

async function closeDialog(page) {
  await page.keyboard.press("Escape");
  await page.locator(DIALOG).waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
}

// Find one real line of each class by pressing lines open; fall back to a labelled fixture.
async function survey(page, vp) {
  const found = {};
  for (const path of EDITOR_ROUTES) {
    if (CLASSES.every((c) => found[c])) break;
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }).catch(() => null);
    if (!res || res.status() >= 400) { console.log(`INFO  ${vp.label} survey ${path}: status ${res?.status()}`); continue; }
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    if (!(await doorOf(page, vp).count())) continue;
    await enter(page, vp, path);
    const pts = await listOutlines(page);
    for (let i = 0; i < Math.min(pts.length, 45); i++) {
      if (CLASSES.every((c) => found[c])) break;
      if (!(await openLine(page, vp, pts[i]))) { await page.keyboard.press("Escape").catch(() => {}); continue; }
      const cls = await classify(page);
      if (cls && !found[cls] && !pts[i].clipped) found[cls] = { path, idx: i, real: true };
      await closeDialog(page);
    }
  }
  for (const c of CLASSES) {
    if (found[c]) console.log(`INFO  ${vp.label}: real ${c} line on ${found[c].path} (#${found[c].idx})`);
    else if (FIXTURES[c]) { found[c] = { fixture: FIXTURES[c], real: false }; console.log(`INFO  ${vp.label}: no real ${c} line on probed routes; FIXTURE "${FIXTURES[c]}" injected on /decks`); }
    else console.log(`INFO  ${vp.label}: no ${c} line and no fixture`);
  }
  return found;
}

async function openClass(page, vp, found, cls) {
  const first = await openClassOnce(page, vp, found, cls);
  if (first || !found[cls]?.real || !FIXTURES[cls]) return first;
  console.log(`INFO  ${vp.label}: real ${cls} line not re-found on visit; FIXTURE "${FIXTURES[cls]}" used instead`);
  found[cls] = { fixture: FIXTURES[cls], real: false };
  return openClassOnce(page, vp, found, cls);
}

async function openClassOnce(page, vp, found, cls) {
  const f = found[cls];
  if (!f) return null;
  await enter(page, vp, f.path, f.fixture);
  let pt;
  if (f.fixture) {
    pt = await page.evaluate(() => { const r = document.getElementById("probe-fixture-line").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left }; });
  } else {
    // Layout can shift between visits, so the surveyed index is only a first guess: verify the class, else scan.
    const list = await listOutlines(page);
    const order = [f.idx, ...list.keys()].filter((i, n, a) => a.indexOf(i) === n && list[i] && !list[i].clipped);
    for (const i of order.slice(0, 50)) {
      if (!(await openLine(page, vp, list[i]))) { await page.keyboard.press("Escape").catch(() => {}); continue; }
      if ((await classify(page)) === cls) return list[i];
      await closeDialog(page);
    }
    return null;
  }
  if (!pt) return null;
  const ok = await openLine(page, vp, pt);
  return ok && (await classify(page)) === cls ? pt : null;
}

const inDialog = (page, fn, arg) => page.evaluate(fn, arg);
const activeInDialog = (page) => page.evaluate(() => !!document.activeElement?.closest('[data-copy-editor] [role=dialog]'));
const wordsLine = async (page) => ((await page.locator(`${DIALOG} [role=status]`).first().innerText().catch(() => "")).split("\n")[0] ?? "");
const storedEdits = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("the99.copyEdits") ?? "[]"); } catch { return "unreadable"; } });
const outlineAt = (page, pt) =>
  page.evaluate(({ x, y }) => {
    const probe = document.createElement("i");
    probe.style.color = "var(--accent)";
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    for (const el of document.querySelectorAll("[data-copy-editor] [data-copy-outline]")) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const cs = getComputedStyle(el);
        return { style: cs.outlineStyle, width: cs.outlineWidth, accent: cs.outlineColor === accent, target: el.hasAttribute("data-copy-target") };
      }
    }
    return null;
  }, pt);

async function runEditor(browser) {
  for (const vp of VIEWPORTS) {
    const L = `E ${vp.label}`;
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
    // The Next dev-tools badge (bottom-left, `nextjs-portal`) sits on top of the sheet and would take the click.
    await ctx.addInitScript(() => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = "nextjs-portal{display:none!important}"; document.head.appendChild(st); }));
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
    page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 200)));
    await signIn(page);
    const found = await survey(page, vp);
    const shot = async (name) => SHOTS && (await page.screenshot({ path: `${SHOTS}/${vp.label}-${name}.png` }));

    // 1 + 2 + 6: plain line
    let pt = await openClass(page, vp, found, "plain");
    check(`${L} 1: pressing an editable line opens [role=dialog]`, !!pt);
    if (pt) {
      const g = await page.evaluate(() => { const r = document.querySelector('[data-copy-editor] [role=dialog]').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, b: r.bottom, r: r.right, vw: innerWidth, vh: innerHeight }; });
      if (vp.touch) {
        check(`${L} 1: bottom sheet touches the bottom edge, width = viewport`, Math.abs(g.b - g.vh) <= 1 && Math.abs(g.w - g.vw) <= 1, JSON.stringify(g));
      } else {
        const under = g.t >= pt.bottom - 1;
        const above = g.b <= pt.top + 1;
        check(`${L} 1: popover 420px wide`, Math.abs(g.w - 420) <= 1, JSON.stringify(g));
        check(`${L} 1: popover under the line (${under ? "under" : "flipped above"}) and inside the viewport`, (under || above) && g.l >= 0 && g.r <= g.vw && g.t >= 0 && g.b <= g.vh, JSON.stringify({ ...g, lineTop: pt.top, lineBottom: pt.bottom }));
      }
      const txt = await page.locator(DIALOG).innerText();
      check(`${L} 2: shows "Now" text and a contenteditable [role=textbox]`, /\bNOW\b|\bNow\b/i.test(txt) && (await page.locator(`${DIALOG} [role=textbox][contenteditable=true]`).count()) === 1, txt.replace(/\s+/g, " ").slice(0, 120));
      await shot("editor");
      const tb = page.locator(`${DIALOG} [role=textbox]`);
      const add = page.locator(`${DIALOG} button`, { hasText: /^(Add to edits|Update edit)$/ });
      await tb.focus();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.type("Probe edit", { delay: 10 });
      check(`${L} 2: typing changes the live word count (2 words)`, /\b2\b/.test(await wordsLine(page)), await wordsLine(page));
      check(`${L} 2: valid text enables "Add to edits"`, await add.isEnabled());
      await page.keyboard.type(" —", { delay: 10 });
      await page.waitForTimeout(120);
      const danger = await page.evaluate(() => {
        const p = document.createElement("i");
        p.style.color = "var(--danger)";
        document.body.appendChild(p);
        const want = getComputedStyle(p).color;
        p.remove();
        const lines = [...document.querySelectorAll('[data-copy-editor] [role=dialog] [role=status] div')].filter((d) => getComputedStyle(d).color === want);
        return lines.map((d) => d.innerText);
      });
      check(`${L} 2: em dash shows a danger-coloured problem line`, danger.length > 0, JSON.stringify(danger));
      check(`${L} 2: em dash disables "Add to edits"`, await add.isDisabled());
      await shot("editor-error");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(120);
      check(`${L} 2: fixing re-enables "Add to edits"`, await add.isEnabled(), await tb.innerText());
      // 6 Tab wrap
      await tb.focus();
      let stayed = true;
      for (let i = 0; i < 10; i++) { await page.keyboard.press("Tab"); if (!(await activeInDialog(page))) stayed = false; }
      check(`${L} 6: 10 Tabs never leave the dialog`, stayed);
      const edge = await page.evaluate(() => {
        const d = document.querySelector('[data-copy-editor] [role=dialog]');
        const items = [...d.querySelectorAll('button:not([disabled]), [contenteditable="true"]')];
        items[0].focus();
        return items.length;
      });
      await page.keyboard.press("Shift+Tab");
      const lastHit = await page.evaluate(() => { const d = document.querySelector('[data-copy-editor] [role=dialog]'); const items = [...d.querySelectorAll('button:not([disabled]), [contenteditable="true"]')]; return document.activeElement === items.at(-1); });
      check(`${L} 6: Shift+Tab on the first control wraps to the last (${edge} controls)`, lastHit);
      await page.keyboard.press("Tab");
      const firstHit = await page.evaluate(() => { const d = document.querySelector('[data-copy-editor] [role=dialog]'); const items = [...d.querySelectorAll('button:not([disabled]), [contenteditable="true"]')]; return document.activeElement === items[0]; });
      check(`${L} 6: Tab on the last control wraps to the first`, firstHit);
      // Esc closes
      await closeDialog(page);
      check(`${L} 6: Esc closes the dialog`, (await page.locator(DIALOG).count()) === 0);
      check(`${L} 6: Esc with the dialog closed behaves as before (mode stays on, target cleared)`, await (async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(150); return (await page.locator("[data-copy-target]").count()) === 0 && (await barOf(page).count()) === 1; })());
      // focus return: focus the Done button, open with a click, Esc
      await target(page, vp, pt);
      await barOf(page).getByRole("button", { name: "Done" }).focus();
      await page.evaluate(({ x, y }) => document.elementFromPoint(x, y).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y })), pt);
      await page.waitForTimeout(350);
      const opened = (await page.locator(DIALOG).count()) > 0;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const back = await page.evaluate(() => document.activeElement?.tagName === "BUTTON" && /Done/.test(document.activeElement.textContent ?? ""));
      check(`${L} 6: Esc returns focus to the previously focused element (Done button) [opened with a synthetic click at the line]`, opened && back, `opened=${opened} activeTag=${await page.evaluate(() => document.activeElement?.tagName + ":" + (document.activeElement?.getAttribute("role") ?? ""))}`);
    }

    // 5: persistence
    pt = await openClass(page, vp, found, "plain");
    if (pt) {
      const nowText = await page.locator(`${DIALOG} [role=textbox]`).innerText();
      await page.locator(`${DIALOG} [role=textbox]`).focus();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.type("Probe edit", { delay: 10 });
      await page.locator(`${DIALOG} button`, { hasText: "Add to edits" }).click();
      await page.waitForTimeout(300);
      check(`${L} 5: Add to edits closes the dialog`, (await page.locator(DIALOG).count()) === 0);
      let st = await storedEdits(page);
      const one = Array.isArray(st) && st.length === 1 ? st[0] : null;
      check(`${L} 5: localStorage the99.copyEdits holds {key,from,to}`, !!one && typeof one.key === "string" && one.to === "Probe edit" && typeof one.from === "string" && one.from.length > 0, JSON.stringify(st).slice(0, 200));
      await page.mouse.move(2, vp.height - 2).catch(() => {});
      await page.waitForTimeout(150);
      let o = await outlineAt(page, pt);
      check(`${L} 5: edited line gets a solid 1px accent outline`, o && o.style === "solid" && o.width === "1px" && o.accent, JSON.stringify(o));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await doorOf(page, vp).first().click();
      await barOf(page).waitFor({ state: "visible" });
      await page.waitForSelector("[data-copy-editor] [data-copy-outline]", { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(500);
      // A fixture span does not survive a reload: put it back (it parks where no outline sits, same as before).
      if (found.plain.fixture) pt = await injectFixture(page, found.plain.fixture);
      st = await storedEdits(page);
      check(`${L} 5: edit survives a reload`, Array.isArray(st) && st.length === 1 && st[0].to === "Probe edit");
      o = await outlineAt(page, pt);
      check(`${L} 5: outline still solid 1px accent after reload`, o && o.style === "solid" && o.width === "1px" && o.accent, JSON.stringify(o));
      const again = await openLine(page, vp, pt);
      const btns = await page.locator(`${DIALOG} button`).allInnerTexts();
      check(`${L} 5: reopening shows "Update edit" and "Remove edit"`, again && btns.includes("Update edit") && btns.includes("Remove edit"), JSON.stringify(btns));
      check(`${L} 5: reopened field holds the edited text (was "${nowText.slice(0, 30)}")`, (await page.locator(`${DIALOG} [role=textbox]`).innerText().catch(() => "")) === "Probe edit");
      const rmErr = await page.locator(`${DIALOG} button`, { hasText: "Remove edit" }).click({ timeout: 4000 }).then(() => "", (e) => String(e).split("\n")[0].slice(0, 160));
      await page.waitForTimeout(300);
      st = await storedEdits(page);
      check(`${L} 5: Remove edit clears storage and closes`, Array.isArray(st) && st.length === 0 && (await page.locator(DIALOG).count()) === 0, JSON.stringify(st).slice(0, 120) + " " + rmErr);
    }

    // 3: chips
    pt = await openClass(page, vp, found, "chip");
    check(`${L} 3: a {name} line opens an editor with chips${found.chip?.real ? "" : " [FIXTURE]"}`, !!pt && (await page.locator(`${DIALOG} [data-fill]`).count()) > 0);
    if (pt) {
      const n0 = await page.locator(`${DIALOG} [data-fill]`).count();
      await page.locator(`${DIALOG} [role=textbox]`).focus();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(150);
      const n1 = await page.locator(`${DIALOG} [data-fill]`).count();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Delete");
      await page.waitForTimeout(150);
      const n2 = await page.locator(`${DIALOG} [data-fill]`).count();
      check(`${L} 3: select-all + Backspace/Delete leaves chip count unchanged (${n0} -> ${n1} -> ${n2})`, n0 === n1 && n1 === n2 && n0 > 0);
      await closeDialog(page);
    }

    // 4: variations
    pt = await openClass(page, vp, found, "variation");
    check(`${L} 4: a variation line opens several fields${found.variation?.real ? "" : " [FIXTURE]"}`, !!pt && (await page.locator(`${DIALOG} [role=textbox]`).count()) > 1);
    if (pt) {
      const t = (await page.locator(DIALOG).innerText()).replace(/\s+/g, " ");
      check(`${L} 4: fields labelled "When n is 1" and "Otherwise"`, /When n is 1/.test(t) && /Otherwise/.test(t), t.slice(0, 220));
      await closeDialog(page);
    }

    // 7: read-only
    pt = await openClass(page, vp, found, "readonly");
    check(`${L} 7: a read-only line opens the read-only panel${found.readonly?.real ? "" : " [FIXTURE]"}`, !!pt && (await classify(page)) === "readonly");
    if (pt) {
      const t = (await page.locator(DIALOG).innerText()).replace(/\s+/g, " ");
      const btns = await page.locator(`${DIALOG} button`).allInnerTexts();
      check(`${L} 7: lock text, reason, "Copy key" and "Close", no textbox`, /🔒/.test(t) && btns.includes("Copy key") && btns.includes("Close") && (await page.locator(`${DIALOG} [role=textbox]`).count()) === 0 && t.length > 40, t.slice(0, 200));
      await shot("readonly");
      await closeDialog(page);
    }

    // 8: which one
    pt = await openClass(page, vp, found, "which");
    check(`${L} 8: same words under two keys opens "Which one is this?"${found.which?.real ? "" : " [FIXTURE]"}`, !!pt && (await classify(page)) === "which");
    if (pt) {
      const keys = await page.locator(`${DIALOG} li button`).allInnerTexts();
      check(`${L} 8: picker lists >1 keys (${keys.length})`, keys.length > 1, JSON.stringify(keys));
      await shot("which");
      await page.locator(`${DIALOG} li button`).first().click();
      await page.waitForTimeout(250);
      const cls = await classify(page);
      check(`${L} 8: picking a key shows the editor (${cls})`, cls === "plain" || cls === "chip" || cls === "variation");
      await closeDialog(page);
    }
    check(`${L}: no page errors during the editor run`, consoleErrors.filter((e) => !/Clerk|clerk|favicon|Failed to load resource|shell:|user_prefs|\[browser\]/i.test(e)).length === 0, consoleErrors.slice(0, 3).join(" | "));
    await ctx.close();
  }
}

async function editorShots(browser) {
  const { default: sharp } = await import("sharp");
  const files = [];
  for (const vp of SHOT_VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
    const page = await ctx.newPage();
    await signIn(page);
    const found = await survey(page, vp);
    const row = [];
    const snap = async (state) => { const f = `${SHOTS}/${vp.label}-editor-${state}.png`; await page.screenshot({ path: f }); row.push([state, f]); };
    if (await openClass(page, vp, found, "plain")) {
      await snap("open");
      await page.locator(`${DIALOG} [role=textbox]`).focus();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.type("Probe — edit", { delay: 5 });
      await page.waitForTimeout(150);
      await snap("error");
      await closeDialog(page);
    }
    if (await openClass(page, vp, found, "readonly")) { await snap("readonly"); await closeDialog(page); }
    if (await openClass(page, vp, found, "variation")) { await snap("variation"); await closeDialog(page); }
    files.push([vp, row]);
    await ctx.close();
  }
  const rows = [];
  const cellH = 560;
  for (const [vp, row] of files) {
    const cells = [];
    for (const [state, f] of row) {
      const img = await sharp(f).resize({ height: cellH - 28 }).png().toBuffer();
      const meta = await sharp(img).metadata();
      const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="28"><rect width="100%" height="100%" fill="#222"/><text x="6" y="19" font-family="monospace" font-size="14" fill="#fff">${vp.label} - ${state}</text></svg>`);
      const cell = await sharp({ create: { width: meta.width, height: cellH, channels: 3, background: "#222" } }).composite([{ input: label, top: 0, left: 0 }, { input: img, top: 28, left: 0 }]).png().toBuffer();
      cells.push({ buf: cell, w: meta.width });
    }
    let x = 0;
    const comps = cells.map((c) => { const o = { input: c.buf, left: x, top: 0 }; x += c.w + 8; return o; });
    const buf = await sharp({ create: { width: Math.max(x, 1), height: cellH, channels: 3, background: "#555" } }).composite(comps).png().toBuffer();
    const f = `${SHOTS}/editor-sheet-${vp.label}.png`;
    await sharp(buf).toFile(f);
    rows.push(f);
  }
  const metas = await Promise.all(rows.map((f) => sharp(f).metadata()));
  const W = Math.max(...metas.map((m) => m.width));
  const H = metas.reduce((a, m) => a + m.height + 8, 0);
  let y = 0;
  const stitched = await sharp({ create: { width: W, height: H, channels: 3, background: "#555" } }).composite(rows.map((f, i) => { const o = { input: f, left: 0, top: y }; y += metas[i].height + 8; return o; })).png().toBuffer();
  await sharp(stitched).toFile(`${SHOTS}/editor-contact-sheet.png`);
  console.log(`editor contact sheet: ${SHOTS}/editor-contact-sheet.png`);
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
    if (process.env.PROBE_ONLY !== "editor") {
      await runOpen(browser);
      await runStates(browser);
      if (SHOTS) await shots(browser);
    }
    await runEditor(browser);
    if (SHOTS) await editorShots(browser);
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
