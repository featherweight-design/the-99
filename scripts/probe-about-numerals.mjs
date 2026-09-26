// probe:about-numerals — every key line on /about has its numeral ON its figure, drawn and in
// bounds, at 390 and 1300.
//
//   PROBE_BASE=http://localhost:3312 pnpm probe:about-numerals
//
// `about-page.test.tsx` counts the numerals in jsdom, which lays nothing out: an anchored numeral
// is in the document from the first render, so a count passes whether or not it ever found its
// part. What only a browser answers is whether each one was PLACED — measured, visible, inside its
// figure's box rather than clipped off it, and not sitting on another numeral. The server needs
// every About switch on, or the switched entries (and their figures) are not drawn.
//
// It writes the account's About row through `clearAboutSheet`, captured first and put back in a
// `finally`, the `captureAboutSeen` rule. Point it at `local-dev`, never production. Screenshots of
// every keyed figure land in `PROBE_SHOTS` (default: the OS temp dir), for reading, not asserting.
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? join(tmpdir(), "probe-about-numerals");
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 900 } },
];

// Counted here, never at the call sites: a check that forgot to count once printed FAIL and then
// "All checks passed" over the top.
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

/** Every keyed entry on the page, with its key count and each figure numeral's placement. */
function readPage() {
  const out = [];
  for (const section of document.querySelectorAll("li[id]")) {
    const keys = section.querySelectorAll(":scope ol > li").length;
    const figure = section.querySelector("[data-specimen]");
    if (keys === 0 || !figure) continue;
    const numerals = [...figure.querySelectorAll("[data-key-numeral]")].map((el) => {
      // Scroll first, then measure the figure and the numeral together, so both share a frame.
      el.scrollIntoView({ block: "center" });
      const box = figure.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      // What is actually painted at the numeral's centre: one under a mounted dialog or another
      // layer measures as placed and inside, and the reader sees nothing. Hit-testing skips
      // `pointer-events: none`, which every figure is, so the numeral takes hits for one read.
      // `inert` removes the whole figure from hit-testing too, so it is lifted for the same read.
      const was = el.style.pointerEvents;
      const inert = figure.inert;
      figure.inert = false;
      el.style.pointerEvents = "auto";
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      el.style.pointerEvents = was;
      figure.inert = inert;
      return {
        n: Number(el.getAttribute("data-key-numeral")),
        onTop: top !== null && (top === el || el.contains(top)),
        shown: style.visibility !== "hidden" && style.display !== "none" && r.width > 0,
        inside: r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1,
        rect: { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height },
      };
    });
    out.push({ id: section.id, keys, numerals });
  }
  return out;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
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
      await page.waitForSelector("[data-specimen]", { timeout: 60_000 });
      // Anchored numerals measure after layout and again when webfonts settle.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);

      const entries = await page.evaluate(readPage);
      report(`${w.label}: found the keyed figures`, entries.length >= 26, `${entries.length} keyed figures`);
      for (const e of entries) {
        const tag = `${w.label} ${e.id}`;
        const drawn = e.numerals.map((m) => m.n).sort((a, b) => a - b);
        const want = Array.from({ length: e.keys }, (_, i) => i + 1);
        report(`${tag}: one numeral per key line`, JSON.stringify(drawn) === JSON.stringify(want), `drew ${drawn.join(",") || "none"} for ${e.keys}`);
        const unplaced = e.numerals.filter((m) => !m.shown).map((m) => m.n);
        report(`${tag}: every numeral found its part`, unplaced.length === 0, unplaced.length ? `hidden: ${unplaced.join(",")}` : "");
        const buried = e.numerals.filter((m) => m.shown && !m.onTop).map((m) => m.n);
        report(`${tag}: every numeral painted on top`, buried.length === 0, buried.length ? `under something: ${buried.join(",")}` : "");
        const outside = e.numerals.filter((m) => m.shown && !m.inside).map((m) => m.n);
        report(`${tag}: every numeral inside its figure`, outside.length === 0, outside.length ? `outside: ${outside.join(",")}` : "");
        const clash = [];
        for (let i = 0; i < e.numerals.length; i++)
          for (let j = i + 1; j < e.numerals.length; j++)
            if (e.numerals[i].shown && e.numerals[j].shown && overlaps(e.numerals[i].rect, e.numerals[j].rect))
              clash.push(`${e.numerals[i].n}/${e.numerals[j].n}`);
        report(`${tag}: no two numerals overlap`, clash.length === 0, clash.join(" "));
        const figure = page.locator(`li[id="${e.id}"] [data-specimen]`);
        // Pictures for reading, never a check: a figure that will not scroll is still measured.
        await figure.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => {});
        await figure.screenshot({ path: join(SHOTS, `${w.label}-${e.id}.png`), timeout: 5_000 }).catch(() => {});
      }
      await context.close();
    }
  } catch (error) {
    report("the run finished", false, String(error?.message ?? error));
  } finally {
    if (prior) await restoreAboutSeen(prior).catch((e) => report("About row restored", false, String(e)));
    await browser.close();
  }
}

await main();
// Reported AFTER the `finally`: an exit there swallows the throw and prints a pass.
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
console.log(`Screenshots: ${SHOTS}`);
process.exit(failures ? 1 : 0);
