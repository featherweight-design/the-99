// probe:deck-loading-art: the deck page's loading skeleton draws the commander's art exactly where the loaded header draws it,
// so the art does not jump when the page arrives. Per width (390 and 1300) and per deck (a lone commander, a partner pair), it
// presses the deck's tile on /decks with the deck page's RSC request held, reads the art layer in the skeleton (its rect inside
// the band, background-size, background-position, the mask), releases the request, reads the same layer in the loaded header and
// asserts the two are equal. On main the skeleton always draws the 340px portrait while a 1300px window's header draws 560px, so
// the 1300 checks fail there.
//
// It also reads the header's type in both states, the title (h1) and the commander line under it: font size, weight, family,
// computed line height and the first line box's height, and asserts the two agree. On main the skeleton's title was a larger,
// lighter serif than the loaded display face, so every type check fails there.
//
// And the header's rects: the gradient behind the label (`[data-block-scrim]`, phone only), the name, the commander line, the chips
// row and the description, each as x, y, width and height from the drawn band's top left, in both states. They must be equal (the
// width of the commander line excepted on a partner pair, whose loaded row draws the partner as its own control; its left, top and
// height still agree). On main the skeleton draws no gradient and no description row, and its label is a parallel block, so these fail.
//
// A direct-load case (a typed address, a refresh) reads the document stream itself: see `directLoad`.
//
// Its writes: two decks of its own (`probe:deck-loading-art`, no cards; the lone one carries a description, the pair none) on the signed-in account, deleted in `finally`.
// Production and staging are refused by `neon.branch_id`. DATABASE_URL must be the database the dev server reads.
//   E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_BASE=http://localhost:3291 node scripts/probe-deck-loading-art.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const sql = neon(DATABASE_URL);
const NAME = "probe:deck-loading-art";
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const HOLD_MS = 12_000;
const SHOTS = process.env.PROBE_SHOTS; // a folder: one PNG per width, deck kind and state, for the contact sheet
const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  // 1200: the header row is 1138px, under the container query's 1200px, so both draw the 340px portrait.
  { label: 1200, viewport: { width: 1200, height: 820 } },
  { label: 1300, viewport: { width: 1300, height: 820 } },
];

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
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
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

/** Two decks of the probe's own: a lone commander with art, and a Partner pair, both with art. */
async function makeDecks(userId) {
  const partners = await sql`select oracle_id from cards where commander_legal and art_crop_uri is not null
    and oracle_text ~ '(^|\n)Partner( \\(|$)' and type_line ilike 'Legendary Creature%' order by name limit 2`;
  if (partners.length < 2) throw new Error("The catalog holds no two Partner commanders with art.");
  const [single] = await sql`select oracle_id from cards where commander_legal and art_crop_uri is not null
    and type_line ilike 'Legendary Creature%' and oracle_id <> ${partners[0].oracle_id} order by name limit 1`;
  const [one] = await sql`insert into decks (user_id, name, intent, commander_oracle_id) values (${userId}, ${NAME}, ${"Tokens and a long tagline that takes two lines on a phone, so the name has to hold its place when the page lands."}, ${single.oracle_id}) returning id`;
  const [two] = await sql`insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${userId}, ${NAME}, ${partners[0].oracle_id}, ${partners[1].oracle_id}) returning id`;
  return [{ kind: "single", id: one.id }, { kind: "partner", id: two.id }];
}

/** The art layer of the band that is drawn (not the hidden twin) inside `scope`, as values that do not depend on the page above it. */
const READ_ART = (scope) => {
  const root = document.querySelector(scope);
  if (!root) return { missing: `no ${scope}` };
  const drawn = [...root.querySelectorAll("[data-art-wash-band]")].find((b) => b.getClientRects().length > 0 && b.getBoundingClientRect().width > 0);
  if (!drawn) return { missing: "no drawn band" };
  const art = drawn.querySelector(".art-wash-art");
  const band = drawn.getBoundingClientRect();
  const a = art.getBoundingClientRect();
  const cs = getComputedStyle(art);
  const round = (n) => Math.round(n * 10) / 10;
  return {
    band: { w: round(band.width), h: round(band.height) },
    art: { x: round(a.left - band.left), y: round(a.top - band.top), w: round(a.width), h: round(a.height) },
    size: cs.backgroundSize,
    position: cs.backgroundPosition,
    mask: cs.maskImage || cs.webkitMaskImage || "",
    image: cs.backgroundImage.includes("url(") ? "url" : cs.backgroundImage.slice(0, 40),
  };
};

/** The drawn title and commander line inside `scope`: the values a reader sees change when the page lands. */
const READ_TYPE = (scope) => {
  const root = document.querySelector(scope);
  if (!root) return { missing: `no ${scope}` };
  const shown = (el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;
  const h1 = [...root.querySelectorAll("h1")].find(shown);
  if (!h1) return { missing: "no drawn h1" };
  // Loaded: the band's meta row; skeleton: the row under the title. Both hold the commander's name in a mono span.
  const meta = [...root.querySelectorAll("[data-spine-meta]")].find(shown);
  const line = meta ? meta.querySelector("span.font-mono") : [...h1.parentElement.children].find((c) => c !== h1 && c.querySelector("span.truncate"))?.querySelector("span.truncate");
  const read = (el) => {
    const cs = getComputedStyle(el);
    const box = el.getClientRects()[0];
    const lh = cs.lineHeight === "normal" ? "normal" : String(Math.round(parseFloat(cs.lineHeight) * 10) / 10);
    return { size: cs.fontSize, weight: cs.fontWeight, family: cs.fontFamily, lineHeight: lh, // An inline element's rect is its font's content area, not its line box, so an inline title (the phone's) reports its line height.
      lineBox: cs.display === "inline" ? parseFloat(cs.lineHeight) : Math.round(box.height * 10) / 10 };
  };
  return { title: read(h1), commander: line ? read(line) : { missing: "no commander line" } };
};

/** The rects a reader sees move when the page lands, relative to the drawn band's top left. A part not drawn reads null. */
const READ_RECTS = (scope) => {
  const root = document.querySelector(scope);
  if (!root) return { missing: `no ${scope}` };
  const shown = (el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;
  const band = [...root.querySelectorAll("[data-art-wash-band]")].find(shown)?.parentElement ?? [...root.querySelectorAll("h1")].find(shown)?.closest("div[style*='height']");
  if (!band) return { missing: "no drawn band" };
  const origin = band.getBoundingClientRect();
  const round = (n) => Math.round(n * 10) / 10;
  const rect = (el) => {
    if (!el || !shown(el)) return null;
    const r = el.getBoundingClientRect();
    return { x: round(r.left - origin.left), y: round(r.top - origin.top), w: round(r.width), h: round(r.height) };
  };
  const first = (sel) => [...root.querySelectorAll(sel)].find(shown);
  const meta = first("[data-spine-meta]");
  return {
    gradient: rect(first("[data-block-scrim]")),
    name: rect(first("[data-deck-title]") ?? first("h1")),
    description: rect(first("[data-deck-intent]")),
    commander: rect(meta?.querySelector("span.font-mono") ?? null),
    chips: rect(first("[data-spine-chips]")),
    // The controls the loaded header draws and the skeleton draws inert in the same boxes. Each part reads null when a width draws none.
    door: rect(first('[data-testid="change-commander-door"], [data-inert-door]')),
    flipPrev: rect(first('[data-inert-flip="prev"], [data-flip-strip] a[aria-label]:nth-of-type(1)')),
    flipNext: rect(first('[data-inert-flip="next"], [data-flip-strip] a[aria-label]:nth-of-type(2)')),
    count: rect(first("[data-spine-count]")),
    // Desktop only: the phone's `data-spine-actions` is its own below-the-fold row, which the skeleton does not draw.
    actions: rect(first("[data-inert-actions], [data-spine-header-actions]")),
  };
};

async function walk(browser, width, deck) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label} ${deck.kind}: ${s}`;
  try {
    await signIn(page);
    // Warm the deck route (a dev server compiles it on first visit), then go to the list.
    await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.locator("[data-art-wash-band]").first().waitFor({ state: "attached", timeout: 90_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    // A dev server's first visit can abort the navigation it is still compiling; one retry reads the compiled route.
    for (let attempt = 0; attempt < 3; attempt++) {
      const ok = await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded", timeout: 180_000 }).then(() => true, () => false);
      if (ok) break;
    }
    const link = page.locator(`a[href="/decks/${deck.id}"]`).first();
    await link.waitFor({ timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    // Hold the deck page's own RSC request so the skeleton stays on screen.
    let release;
    const gate = new Promise((r) => (release = r));
    await page.route(new RegExp(`/decks/${deck.id}\\?.*_rsc=`), async (route) => {
      await Promise.race([gate, new Promise((r) => setTimeout(r, HOLD_MS))]);
      await route.continue().catch(() => {});
    });
    await link.scrollIntoViewIfNeeded();
    await link.evaluate((el) => el.click()); // a seat notice stack can sit over the tile on the fixture account
    const shown = await page.locator("[data-loading-screen]").first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
    if (!report(L("the loading skeleton draws"), shown)) return;
    await page.waitForTimeout(600);
    const loading = await page.evaluate(READ_ART, "[data-loading-screen]");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width.label}-${deck.kind}-loading.png` });
    report(L("the skeleton draws the commander's art"), loading.image === "url", JSON.stringify(loading));
    const loadingType = await page.evaluate(READ_TYPE, "[data-loading-screen]");
    const loadingRects = await page.evaluate(READ_RECTS, "[data-loading-screen]");
    release();
    await page.locator("[data-loading-screen]").first().waitFor({ state: "detached", timeout: 90_000 });
    await page.waitForTimeout(600);
    const loaded = await page.evaluate(READ_ART, "main");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width.label}-${deck.kind}-loaded.png` });
    report(L("the loaded header draws the commander's art"), loaded.image === "url", JSON.stringify(loaded));
    const loadedType = await page.evaluate(READ_TYPE, "main");
    const loadedRects = await page.evaluate(READ_RECTS, "main");
    for (const part of ["gradient", "name", "description", "commander", "chips", "door", "flipPrev", "flipNext", "count", "actions"]) {
      const a = loadingRects[part], b = loadedRects[part];
      // The description of a deck with none draws no row in either state; the gradient is a phone part.
      if (a === null && b === null) continue;
      const keys = ["x", "y", "w", "h"];
      const same = a && b && keys.every((k) => Math.abs(a[k] - b[k]) <= 1);
      report(L(`skeleton and loaded header draw the ${part} in the same place`), Boolean(same), `skeleton ${JSON.stringify(a)} vs loaded ${JSON.stringify(b)}`);
    }
    for (const part of ["title", "commander"]) {
      for (const key of ["size", "weight", "family", "lineHeight"]) {
        const a = loadingType[part]?.[key], b = loadedType[part]?.[key];
        report(L(`skeleton and loaded header agree on the ${part}'s ${key}`), a !== undefined && a === b, `skeleton ${a} vs loaded ${b}`);
      }
    }
    // The title's first line box: the skeleton's h1 and the loaded one are the same height, so nothing below shifts.
    report(L("skeleton and loaded header agree on the title's line box"), loadingType.title?.lineBox === loadedType.title?.lineBox, `skeleton ${loadingType.title?.lineBox} vs loaded ${loadedType.title?.lineBox}`);
    for (const key of ["band", "art", "size", "position", "mask"]) {
      const same = JSON.stringify(loading[key]) === JSON.stringify(loaded[key]);
      report(L(`skeleton and loaded header agree on the art's ${key}`), same, same ? "" : `skeleton ${JSON.stringify(loading[key])} vs loaded ${JSON.stringify(loaded[key])}`);
    }
  } finally {
    await context.close();
  }
}

/**
 * A DIRECT LOAD (typed address, refresh): no press carried facts, so the document stream is all there is. It reads the stream
 * with the session's cookies and cuts it at the first flush that draws the loading screen (the bars phase), at the first flush
 * that carries the deck's name (the facts phase) and takes the whole body (loaded), then draws each in a page whose own scripts
 * are blocked (the inline swap scripts still run, nothing hydrates) and reads the header's rects. Bars draw no text at all; the facts
 * phase draws the name, tagline and commander line where the loaded header does, so no line in the header text area moves.
 * On main the bars draw text placeholders (no name until the body lands), so these fail there.
 */
async function directLoad(browser, width, deck) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label} ${deck.kind} direct load: ${s}`;
  try {
    await signIn(page);
    const cookie = (await context.cookies(BASE)).map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await fetch(`${BASE}/decks/${deck.id}`, { headers: { cookie, accept: "text/html" } });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value, { stream: true }));
    }
    const upTo = (test) => {
      const i = chunks.findIndex((_, k) => test(chunks.slice(0, k + 1).join("")));
      return i === -1 ? null : chunks.slice(0, i + 1).join("");
    };
    const bars = upTo((t) => t.includes("data-loading-screen"));
    // The facts phase: the stream's first point holding the deck's name inside the loading screen, with the swap that shows it.
    const facts = upTo((t) => {
      const at = t.indexOf("data-deck-title");
      return at !== -1 && /\$RC\("B:\d+","S:\d+"\)/.test(t.slice(at));
    });
    const whole = chunks.join("");
    if (!report(L("the stream flushes the loading screen before the body"), bars !== null && bars.length < whole.length, `${chunks.length} chunks`)) return;
    const draw = async (html, scope, tag) => {
      const ctx = await browser.newContext({ viewport: width.viewport });
      const p = await ctx.newPage();
      await p.route("**/_next/**/*.js*", (r) => (r.request().resourceType() === "script" ? r.abort() : r.continue()));
      await p.route(`${BASE}/decks/${deck.id}`, (r) => r.fulfill({ status: 200, contentType: "text/html", body: html }));
      await p.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "load", timeout: 60_000 });
      await p.waitForTimeout(400);
      const rects = await p.evaluate(READ_RECTS, scope);
      const text = await p.evaluate((sc) => !!document.querySelector(`${sc} h1, ${sc} [data-deck-title]`), scope);
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/${width.label}-${deck.kind}-direct-${tag}.png` });
      await ctx.close();
      return { rects, text };
    };
    const a = await draw(bars, "[data-loading-screen]", "bars");
    report(L("the first flush draws no name or title (art and gradient only)"), a.text === false);
    if (facts === null) return report(L("a flush carries the deck's name before the body"), false, "no such chunk");
    const f = await draw(facts, "[data-loading-screen]", "facts");
    const l = await draw(whole, "main", "loaded");
    report(L("the facts phase draws the name"), f.text === true, f.rects.missing ?? "");
    for (const part of ["gradient", "name", "description", "commander", "chips", "count", "actions"]) {
      const x = f.rects[part], y = l.rects[part];
      if (x === null && y === null) continue;
      const same = x && y && ["x", "y", "w", "h"].every((k) => Math.abs(x[k] - y[k]) <= 1);
      report(L(`the facts phase and the loaded header draw the ${part} in the same place`), Boolean(same), `facts ${JSON.stringify(x)} vs loaded ${JSON.stringify(y)}`);
    }
  } finally {
    await context.close();
  }
}

await clerkSetup();
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
await assertNotSharedBranch(branch, "probe-deck-loading-art");
const browser = await chromium.launch();
let ownerId = null;
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  ownerId = await signIn(page);
  await context.close();
  const decks = await makeDecks(ownerId);
  for (const width of WIDTHS) for (const deck of decks) { await walk(browser, width, deck); await directLoad(browser, width, deck); }
} finally {
  if (ownerId) await sql`delete from decks where name = ${NAME} and user_id = ${ownerId}`;
  await browser.close();
}
console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
