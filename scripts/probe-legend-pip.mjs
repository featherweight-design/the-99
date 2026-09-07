// The dot legends on a commander detail page, driven rather than read.
//
// The legends used to name the committed colour "Amber", which is only true of
// the first theme — `--avail-hard-fg` is redefined by all six. They now draw the
// dot instead, from the same component the chips and rows use. This probe proves
// the swatch and the dot resolve to the same paint under every theme, which is
// the whole reason the pip exists.
//
// Run by hand, and not part of `pnpm test` — it needs a browser and a signed-in
// session:
//   PROBE_BASE=http://localhost:3001 node scripts/probe-legend-pip.mjs
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}

// Read from the stylesheet rather than a hand-kept list, so a seventh theme is
// walked the day it ships.
const SHEET = new URL("../src/app/globals.css", import.meta.url);
const THEMES = [
  ...new Set(
    [...readFileSync(SHEET, "utf8").matchAll(/\[data-theme="([a-z]+)"\]/g)].map((m) => m[1]),
  ),
];
if (THEMES.length < 2) throw new Error(`Read no [data-theme] blocks from ${SHEET.pathname}.`);

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
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// A legend paragraph is the one that carries pips: a <p> whose only element
// children are the aria-hidden swatch wrappers.
function readLegends(page) {
  return page.evaluate(() => {
    const paint = (el) => getComputedStyle(el).backgroundColor;
    const out = { legends: [], chipDots: [] };

    for (const p of document.querySelectorAll("p")) {
      const pips = [...p.querySelectorAll("span[aria-hidden]")];
      if (pips.length === 0) continue;
      out.legends.push({
        text: p.textContent.trim(),
        pips: pips.map((pip) => ({
          fill: paint(pip),
          border: getComputedStyle(pip).borderColor,
          size: `${Math.round(pip.getBoundingClientRect().width)}px`,
        })),
      });
    }

    // Every dot a chip or a row drew, deduplicated by paint, so the legend can
    // be checked against the thing it explains.
    for (const dot of document.querySelectorAll("a span[aria-hidden], button span[aria-hidden]")) {
      if (dot.children.length > 0) continue;
      const fill = paint(dot);
      if (!out.chipDots.some((d) => d.fill === fill)) {
        out.chipDots.push({ fill, size: `${Math.round(dot.getBoundingClientRect().width)}px` });
      }
    }
    return out;
  });
}

await clerkSetup();

const browser = await chromium.launch();
let failures = 0;
try {
  for (const viewport of [
    { label: "iPhone 13 · 390x844", width: 390, height: 844 },
    { label: "desktop · 1300x900", width: 1300, height: 900 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await signIn(page);

    await page.goto(`${BASE}/commanders`, { waitUntil: "domcontentloaded" });
    const firstCommander = page.locator('a[href^="/commanders/"]').first();
    await firstCommander.waitFor({ timeout: 30_000 });
    const href = await firstCommander.getAttribute("href");
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    console.log(`\n=== ${viewport.label} — ${href} ===`);

    for (const theme of THEMES) {
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.waitForTimeout(120);
      const { legends, chipDots } = await readLegends(page);

      if (legends.length === 0) {
        console.log(`  ${theme.padEnd(10)} no legend on screen — no visible card is committed`);
        continue;
      }
      const legendFills = legends.flatMap((l) => l.pips.map((p) => p.fill));
      const unmatched = legendFills.filter(
        (fill) => fill !== "rgba(0, 0, 0, 0)" && !chipDots.some((d) => d.fill === fill),
      );
      if (unmatched.length > 0) failures += unmatched.length;
      console.log(
        `  ${theme.padEnd(10)} legends ${legends.length}  pips ${legendFills.length}  ` +
          `dot paints on page ${chipDots.map((d) => d.fill).join(" | ")}  ` +
          `${unmatched.length === 0 ? "all pips match a dot" : `UNMATCHED: ${unmatched.join(", ")}`}`,
      );
      for (const legend of legends) {
        console.log(`      "${legend.text}"`);
        console.log(
          `        pips: ${legend.pips
            .map((p) => `${p.size} ${p.fill}${p.fill === "rgba(0, 0, 0, 0)" ? ` border ${p.border}` : ""}`)
            .join("  ·  ")}`,
        );
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nPASS — every legend pip matches a dot on the page." : `\nFAIL — ${failures} pip(s) matched no dot.`);
process.exit(failures === 0 ? 0 : 1);
