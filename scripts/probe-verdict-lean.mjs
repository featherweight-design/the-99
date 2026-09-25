// The lean and the reasoning modal, measured in a real browser at 1300x900 and 390x844.
//
// WHY A BROWSER. The reasoning is the receipt's chrome with a third body, and what it has to prove
// is layout and stacking: two 100×140 plates side by side at 700px and stacked at 390, the
// qualifier whole wherever it is drawn — in the header on desktop, opening the body on the phone,
// because the phone's 43px header cannot hold it beside the heading — and a tutor opened from it
// STACKING, with the reasoning's header whole above the card sheet, exactly as a receipt does.
//
// It finds its own fixture by pressing the account's decks until one draws a lean, and FAILS
// when none of the first twelve does. A lean exists only where a combo decided a single bracket;
// `deck-lean.json` names the two local-dev decks built for it.
//
// IT WRITES ONE ROW: `user_prefs.about_version_seen`, as `probe:verdict-block` does. Needs a server
// with ANALYSIS_TAB_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3010 node scripts/probe-verdict-lean.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
import { onPage, onPageRole, PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  // Read only to clear the About gate. This probe writes nothing else.
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
/** Every deck whose stored reading this run cleared, and how to put it back. */
const held = new Map();
const heldSql = neon(DATABASE_URL);
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
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

  // CLEAR THE ABOUT GATE BEFORE ANY ROUTE IS ASKED FOR. Since #658 `proxy.ts` redirects a reader
  // below the current `ABOUT_VERSION` to `/about?next=…` — so a probe that navigates straight to
  // `/decks` scrapes the About page instead, and its specimen deck links then read as this
  // account's decks. The first run of this file did exactly that: it reported "no Analysis tab"
  // about `/decks/about-resume-edited`, a routing problem wearing a flag problem's clothes.
  //
  // Seeded rather than clicked through: the flag lives in `user_prefs` and this account may have
  // no row at all, so visiting the page does not write one. Left set afterwards on purpose —
  // "this account has seen the About page" is true once this ran.
  //
  // `greatest(...)`, which is what `lib/about/read.ts` itself writes. A bare assignment LOWERS
  // the stored value when this checkout is pinned behind the database's, putting the About page
  // back in front of a real reader on their next navigation.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  await neon(DATABASE_URL)`
    insert into user_prefs (user_id, about_version_seen)
    values (${await page.evaluate(() => window.Clerk.user.id)}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, await page.evaluate(() => window.Clerk.user.id));
}

/** Every deck on the account, asked of the page. */
async function deckHrefs(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  return page.evaluate((scope) => {
    const root = document.querySelector(scope);
    return [...new Set([...(root?.querySelectorAll("a[href^='/decks/']") ?? [])]
      .map((a) => a.getAttribute("href"))
      .filter((h) => h && h.split("/").length === 3 && !["new", "import"].includes(h.split("/")[2])))];
  }, PAGE);
}

/** Open the deck's Analysis tab by a PRESS — the tab is client state and has no address. */
async function openAnalysis(page, href) {
  // THE PRESS IS REQUIRED. The deck's stored reading is cleared first (held on disk, restored in
  // `run()`'s `finally`), so the only way to a reading is the press. A probe that fell back on a
  // stored reading stayed green through a renamed button and measured nothing.
  const deckId = href.split("/")[2];
  if (!held.has(deckId)) held.set(deckId, await holdProfile(heldSql, deckId));
  await heldSql`delete from deck_profiles where deck_id = ${deckId}::uuid`;
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  const up = await page.waitForSelector(`${PAGE} [role="tablist"]`, { timeout: 20_000 })
    .then(() => true).catch(() => false);
  if (!up) return false;
  await page.waitForTimeout(500);
  const tab = onPageRole(page, "tab", /analysis/i);
  if ((await tab.count()) === 0) return false;
  await tab.first().click();
  // `Analyze` before a reading (PR B's label), `Re-analyze` on the banner over a stale one (C2).
  const invite = onPageRole(page, "button", /^Analyze$/);
  if (!report(`the Analyze press is on ${href}`, (await invite.count()) > 0, "none: the press was renamed or removed")) return false;
  await invite.first().click();
  return page.waitForSelector(`${PAGE} [data-testid="findings-block"]`, { timeout: 30_000 })
    .then(() => true).catch(() => false);
}

const hasLean = (page) => onPage(page, '[data-testid="lean-line"]').count().then((n) => n > 0);

async function walk(page, label, width) {
  const phone = width < 768;
  const lean = onPage(page, '[data-testid="lean-line"]');
  const reason = await lean.getAttribute("data-reason");
  report(`${label}px · the lean is drawn, and names its pair as two cards`,
    (await lean.locator("button[aria-label^='View details for']").count()) === 2, `reason ${reason}`);

  await onPageRole(page, "button", /see the reasoning/).click();
  const modal = page.locator('[data-testid="receipt-modal"]');
  await modal.waitFor({ state: "visible", timeout: 5_000 });
  const box = await modal.boundingBox();
  report(`${label}px · the reasoning is ${phone ? "a sheet from 52px, full width" : "a 700px modal"}`,
    phone ? Math.abs(box.y - 52) <= 1 && Math.abs(box.width - width) <= 1 : Math.abs(box.width - 700) <= 1,
    `top ${box.y}, width ${box.width}`);

  const read = await modal.evaluate((m) => {
    const head = m.firstElementChild;
    const h2 = head.querySelector("h2");
    // `innerText`, never `textContent`: the header's aside WRAPPER is always mounted, and a match on
    // its text or its rects read the phone's hidden qualifier as drawn — the first run failed a
    // build the contact sheet shows correct. `innerText` is what a reader sees.
    const asideVisible = /findable/.test(head.innerText);
    const bodyQ = m.querySelector('[data-testid="reasoning-qualifier"]');
    const pieces = [...m.querySelectorAll('[data-testid="reasoning-piece"]')];
    const plates = pieces.map((p) => { const plate = p.querySelector("button span"); const r = plate.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), art: getComputedStyle(plate).backgroundImage.startsWith("url(") }; });
    return {
      // What the header HOLDS against the box it is pinned to. Its own height reads 43 on every
      // build, because a class sets it, so a height check passes on anything. What the stacked
      // sheet would cut is the header's READING — its mark, heading and qualifier — so each of
      // those must end inside it. The 44px close control is excluded on purpose: it overhangs
      // the 43px row by a pixel by design, into this sheet's own body rather than under the card.
      headOverflow: Math.max(0, ...[...head.children].filter((c) => c.tagName !== "BUTTON")
        .map((c) => Math.ceil(c.getBoundingClientRect().bottom - head.getBoundingClientRect().bottom))),
      titleClipped: h2.scrollWidth > h2.clientWidth,
      asideVisible,
      bodyQVisible: !!bodyQ && bodyQ.getClientRects().length > 0,
      lefts: new Set(pieces.map((p) => Math.round(p.getBoundingClientRect().left))).size,
      plates,
    };
  });
  report(`${label}px · the heading is whole`, !read.titleClipped, read.titleClipped ? "truncated" : "whole");
  report(`${label}px · the qualifier is drawn ${phone ? "opening the body" : "in the header"}, once`,
    phone ? read.bodyQVisible && !read.asideVisible : read.asideVisible && !read.bodyQVisible,
    `header ${read.asideVisible}, body ${read.bodyQVisible}`);
  if (phone) report(`${label}px · the header's contents fit its 43px`, read.headOverflow <= 0, `overflow ${read.headOverflow}px`);
  report(`${label}px · the halves sit ${phone ? "stacked" : "side by side"}`,
    read.lefts === (phone ? 1 : 2), `${read.lefts} distinct lefts`);
  report(`${label}px · each half is a 100×140 plate of the deck's own art`,
    read.plates.length === 2 && read.plates.every((p) => p.w === 100 && p.h === 140 && p.art),
    read.plates.map((p) => `${p.w}×${p.h}${p.art ? "" : " (no art)"}`).join(", "));

  // A card opened from the reasoning stacks on it, as from a receipt.
  const opener = modal.locator('[data-found="tutors"] button').first();
  if ((await opener.count()) === 0) {
    // No tutor is a correct state on two readings: draw-only with neither half found, and a
    // partner pair whose halves are BOTH in the command zone (`reachableZone`). Any other
    // reachable reading names at least one tutor, so an empty list there is a regression.
    const reading = await lean.getAttribute("data-reading");
    report(`${label}px · a tutor opens stacked`, reason !== "reachable" || reading === "reachableZone",
      `no tutor on this reading (${reading}) — nothing to open`);
  } else {
    await opener.click();
    const card = page.locator('[role="dialog"][aria-labelledby="card-modal-title"]');
    await card.waitFor({ state: "visible", timeout: 15_000 });
    const s = await page.evaluate(() => {
      const r = document.querySelector('[data-testid="receipt-modal"]');
      const c = document.querySelector('[role="dialog"][aria-labelledby="card-modal-title"]');
      return { up: !!r, headBottom: Math.round(r.firstElementChild.getBoundingClientRect().bottom), cardTop: Math.round(c.getBoundingClientRect().top) };
    });
    report(`${label}px · a tutor opens stacked on the reasoning`, s.up && (!phone || s.headBottom <= s.cardTop),
      `reasoning ${s.up ? "stays" : "gone"}${phone ? `, header to ${s.headBottom}, card from ${s.cardTop}` : ""}`);
    if (!phone) {
      // The way back is named for the reasoning: its own title (Analysis tab handoff §3).
      const title = await modal.locator("h2").innerText();
      const back = await card.locator('[data-testid="card-modal-back"]').getAttribute("aria-label").catch(() => null);
      report(`${label}px · the stacked card's way back names the reasoning`, back === `Back to ${title}`,
        `${back ?? "no pill"}`);
    }
    await page.keyboard.press("Escape");
    await card.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    report(`${label}px · Escape lands back on the reasoning`, (await card.count()) === 0 && (await modal.count()) === 1,
      `card ${await card.count()}, reasoning ${await modal.count()}`);
  }
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const first = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const scout = await first.newPage();
    await signIn(scout);
    const found = [];
    for (const candidate of (await deckHrefs(scout)).slice(0, 12)) {
      if ((await openAnalysis(scout, candidate)) && (await hasLean(scout))) {
        found.push({ href: candidate, reason: await onPage(scout, '[data-testid="lean-line"]').getAttribute("data-reason") });
      }
    }
    await first.close();
    if (!report("a deck with a lean", found.length > 0, found.map((f) => `${f.href} (${f.reason})`).join(", ") || "none of the first 12 decks has one")) return;
    // Both readings where the account has both, reachable first: it is the one with tutors to open.
    const walked = [...new Map(found.map((f) => [f.reason, f])).values()].sort((a) => (a.reason === "reachable" ? -1 : 1));
    for (const { href, reason } of walked) {
      console.log(`       (walking ${href}, ${reason})`);
      for (const { label, viewport } of WIDTHS) {
        const ctx = await browser.newContext({ viewport });
        const p = await ctx.newPage();
        await signIn(p);
        if (report(`${label}px · the Analysis tab drew`, await openAnalysis(p, href), "pressed")) {
          await walk(p, label, viewport.width);
        }
        await ctx.close();
      }
    }
  } finally {
    for (const [deckId, restore] of held) {
      await restore().catch((e) => report(`put back ${deckId}'s analysis`, false, e.message));
    }
    await browser.close();
  }
}

await run();
// Outside `run()`, so no early return can skip it, and never `process.exit` inside a `finally`.
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
