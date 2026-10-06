// About's "How the app reaches its answers", walked at 390x844 and 1300x900.
//
//   PROBE_BASE=http://localhost:3341 PROBE_HOW_IT_WORKS=on  pnpm probe:about-how-it-works
//   PROBE_BASE=http://localhost:3342 PROBE_HOW_IT_WORKS=off pnpm probe:about-how-it-works
//
// A switch is read when the server starts, so the two passes need two servers: one started with
// HOW_IT_WORKS_ENABLED=true AND ABOUT_SHEET_ENABLED=true (the contents group lives in the R6
// contents that switch draws), and one without HOW_IT_WORKS_ENABLED. The pass names which it expects, and fails when
// the page disagrees, so a run against the wrong server cannot report a pass.
//
// ON: the method key is one column on the phone and two from 1000px, with a 100px tag column; each
// row's head is at least 52px on the phone and 44px on desktop, its title, tags and verdict share
// one line on desktop and the verdict takes a second line on the phone; an opened row's body is a
// 128px label grid on desktop and stacked on the phone; nothing scrolls sideways. And a hash lands its row open, washed and focused, 20px from
// the top or at the document's end, with its OPENED body on screen. That last needs the row opened
// before the scroll: the browser's own jump lands on the closed layout, and the body it opens
// afterwards would hang below the fold.
//
// OFF: no appendix, and the intro is the one production has today.
//
// It writes the account's About row through `clearAboutSheet`, captured first and put back in a
// `finally`, the `captureAboutSeen` rule. Point it at `local-dev`, never production.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const MODE = process.env.PROBE_HOW_IT_WORKS;
if (MODE !== "on" && MODE !== "off") {
  console.error("Set PROBE_HOW_IT_WORKS to on or off, naming how the server at PROBE_BASE was started.");
  process.exit(2);
}

const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 900 } },
];
// The intro's first sentence (`aboutCopy.pageIntro`). The intro is paragraphs in a block after the h1.
const INTRO = "I built The 99 because nothing else checked every box for deck building, least of all around my collection.";

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
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

async function walkOn(page, w) {
  const tag = `${w.label}:`;
  const section = onPage(page, "#how-it-works");
  if (!report(`${tag} appendix drawn`, (await section.count()) === 1)) return;

  const key = await section.evaluate((s) => {
    const items = [...s.querySelectorAll(":scope > div > dl > div")];
    return {
      n: items.length,
      lefts: new Set(items.map((i) => Math.round(i.getBoundingClientRect().left))).size,
      dt: Math.round(items[0].querySelector("dt").getBoundingClientRect().width),
    };
  });
  report(`${tag} key holds five methods`, key.n === 5, `${key.n}`);
  if (w.label === 390) report(`${tag} key is one column`, key.lefts === 1, `${key.lefts} columns`);
  else {
    report(`${tag} key is two columns`, key.lefts === 2, `${key.lefts} columns`);
    report(`${tag} key's tag column is 100px`, key.dt === 100, `${key.dt}px`);
  }

  const heads = await section.evaluate((s) =>
    [...s.querySelectorAll("li[id^='how-'] button[aria-expanded]")].map((b) => {
      const [title, line2] = b.firstElementChild.children;
      const verdict = b.querySelector(".font-mono:not([data-method])");
      const t = title.getBoundingClientRect();
      const v = verdict.getBoundingClientRect();
      const chev = b.lastElementChild.getBoundingClientRect();
      return { h: b.getBoundingClientRect().height, tTop: t.top, tBottom: t.bottom, vTop: v.top, vBottom: v.bottom, chevW: chev.width, chevH: chev.height, line2: !!line2 };
    }),
  );
  report(`${tag} eight rows`, heads.length === 8, `${heads.length}`);
  const floor = w.label === 390 ? 52 : 44;
  const short = heads.filter((h) => h.h < floor - 0.5);
  report(`${tag} every head is at least ${floor}px`, short.length === 0, short.map((h) => h.h).join(", "));
  if (w.label === 390) {
    report(`${tag} verdict sits on the second line`, heads.every((h) => h.vTop >= h.tBottom - 1));
    report(`${tag} disclosure is a 44px target`, heads.every((h) => h.chevW === 44 && h.chevH === 44), `${heads[0].chevW}x${heads[0].chevH}`);
  } else {
    report(`${tag} verdict shares the title's line`, heads.every((h) => h.vTop < h.tBottom && h.vBottom > h.tTop));
  }

  // Open Brackets: its body and its sub-rows' tags.
  const brackets = page.locator("#how-brackets button[aria-expanded]");
  await brackets.click();
  const body = await page.locator("#how-brackets-body").evaluate((dl) => {
    const dt = dl.querySelector("dt").getBoundingClientRect();
    const dd = dl.querySelector("dd").getBoundingClientRect();
    return { dtW: Math.round(dt.width), stacked: dd.top >= dt.bottom - 1, subs: dl.querySelectorAll("dd span.block.border-t").length };
  });
  if (w.label === 390) report(`${tag} body labels stack over their sentences`, body.stacked);
  else report(`${tag} body label column is 128px`, body.dtW === 128, `${body.dtW}px`);
  report(`${tag} Brackets opens onto five sub-rows`, body.subs === 5, `${body.subs}`);
  await brackets.click();

  const overflow = await page.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth);
  report(`${tag} nothing scrolls sideways`, overflow <= 0, `${overflow}px`);

  // PR C. An entry's link line lands its row open, and Back returns to the entry.
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  const link = onPage(page, "li#roles [data-entry-link]");
  if (report(`${tag} the Roles entry carries its link line`, (await link.count()) === 1)) {
    const h = await link.evaluate((a) => Math.round(a.getBoundingClientRect().height));
    if (w.label === 390) report(`${tag} the link line is a 44px target`, h >= 44, `${h}px`);
    await link.scrollIntoViewIfNeeded();
    const before = await link.evaluate((a) => Math.round(a.getBoundingClientRect().top));
    await link.click();
    await page.waitForTimeout(400);
    const landed = await page.evaluate(() => ({ hash: location.hash, open: !!document.getElementById("how-roles-body") }));
    report(`${tag} the link opens the Roles row`, landed.hash === "#how-roles" && landed.open, JSON.stringify(landed));
    const back = await page.evaluate(() => [...document.querySelectorAll("#how-roles-body a[href^='#']")].map((a) => a.getAttribute("href")));
    report(`${tag} the row links back to the Roles entry`, back.includes("#roles"), back.join(" "));
    await page.goBack();
    await page.waitForTimeout(400);
    // Back restores the scroll the reader pressed from, so the link line is where it was.
    const after = await link.evaluate((a) => Math.round(a.getBoundingClientRect().top));
    report(`${tag} Back returns to the link the reader pressed`, Math.abs(after - before) <= 4, `${before}px then ${after}px`);
  }

  // The contents group: the rail at 1300, the phone list's fifth row at 390.
  if (w.label === 1300) {
    const rail = await onPage(page, "nav").evaluateAll((navs) => {
      const nav = navs.find((n) => getComputedStyle(n).display !== "none" && n.querySelector("a[href='#how-it-works']"));
      if (!nav) return null;
      return { rows: nav.querySelectorAll("a[data-entry-row][href^='#how-']").length };
    });
    report(`${tag} the rail lists the appendix and its eight rows`, rail?.rows === 8, JSON.stringify(rail));
  } else {
    // Counted before it is pressed: the group is drawn only in the R6 contents, and a server
    // started without ABOUT_SHEET_ENABLED would otherwise end the walk on a locator timeout.
    const row = onPage(page, "a[href='#how-it-works']").first();
    if (!report(`${tag} the phone list draws the appendix row`, (await row.count()) === 1, "is ABOUT_SHEET_ENABLED on?")) return;
    const h = await row.evaluate((a) => Math.round(a.getBoundingClientRect().height));
    report(`${tag} the list's fifth row is 44px`, h >= 44, `${h}px`);
    await row.locator("xpath=..").locator("button[aria-expanded]").click();
    const rows = await onPage(page, "#contents-entries-how-it-works a[data-entry-row]").count();
    report(`${tag} it opens onto the eight rows`, rows === 8, `${rows}`);
  }

  // The hash landing, on a middle row and the last. The appendix is the page's last section, so a
  // row near the foot cannot scroll to 20px from the top: the document ends first. So each lands
  // 20px from the top OR with the document scrolled to its end, and with its OPENED body on screen,
  // which the browser's own jump, made on the closed layout before hydration, cannot promise.
  // Two paths: a FRESH document load (the query makes it one; a fragment-only goto from /about is a
  // same-document navigation) runs the rows' mount-time landing, and a hash change on the loaded
  // page runs their `hashchange` listener.
  for (const [id, fresh] of [["how-written", true], ["how-prices", false]]) {
    if (fresh) await page.goto(`${BASE}/about?landing=${id}#${id}`, { waitUntil: "networkidle" });
    else await page.evaluate((h) => { window.location.hash = h; }, id);
    await page.waitForTimeout(400);
    const land = await page.evaluate((rowId) => {
      const row = document.getElementById(rowId);
      const body = document.getElementById(`${rowId}-body`);
      const line = row.querySelector("[data-entry-title]");
      const doc = document.scrollingElement;
      return {
        open: !!body,
        top: Math.round(row.getBoundingClientRect().top),
        atEnd: Math.abs(doc.scrollTop + doc.clientHeight - doc.scrollHeight) <= 2,
        bodyBottom: body ? Math.round(body.getBoundingClientRect().bottom) : null,
        viewport: window.innerHeight,
        washed: line.hasAttribute("data-jumped"),
        bg: getComputedStyle(line).backgroundColor,
        focused: document.activeElement === line.querySelector("h3"),
      };
    }, id);
    report(`${tag} #${id} opens its row`, land.open);
    report(`${tag} #${id} lands 20px from the top, or at the document's end`, Math.abs(land.top - 20) <= 2 || land.atEnd, `top ${land.top}px, at end ${land.atEnd}`);
    report(`${tag} #${id} lands with its body on screen`, land.top >= 0 && land.bodyBottom !== null && land.bodyBottom <= land.viewport, `body ends ${land.bodyBottom} of ${land.viewport}`);
    report(`${tag} #${id} is washed`, land.washed && land.bg !== "rgba(0, 0, 0, 0)", land.bg);
    report(`${tag} #${id} takes focus on its heading`, land.focused);
  }
}

async function walkOff(page, w) {
  const tag = `${w.label}:`;
  report(`${tag} no appendix`, (await onPage(page, "#how-it-works").count()) === 0);
  const intro = await onPage(page, "article > h1 + div").first().innerText();
  report(`${tag} the intro is production's`, intro.trim().startsWith(INTRO), intro.slice(0, 80));
  report(`${tag} no entry links to a row`, (await onPage(page, "[data-entry-link]").count()) === 0);
  report(`${tag} no contents link reaches the appendix`, (await onPage(page, "a[href='#how-it-works'], a[href^='#how-']").count()) === 0);
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  let prior = null;
  try {
    for (const w of WIDTHS) {
      const context = await browser.newContext({ viewport: w.viewport });
      const page = await context.newPage();
      const userId = await signIn(page);
      if (prior === null) prior = await captureAboutSeen(userId);
      await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
      await clearAboutSheet(page, userId);
      await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
      console.log(`\n${w.label} (${MODE})`);
      if (MODE === "on") await walkOn(page, w);
      else await walkOff(page, w);
      await context.close();
    }
  } finally {
    if (prior) await restoreAboutSeen(prior).catch((e) => report("About row restored", false, String(e)));
    await browser.close();
  }
}

await main();
// Reported AFTER the `finally`: an exit there swallows the throw and prints a pass.
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
