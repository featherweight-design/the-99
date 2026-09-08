// Gate for PR E of the UI refresh: signed-in Home — the header, the two hero
// cards, the resume rows, the deck rail and the Commitments card.
//
// JSDOM renders both breakpoint subtrees and applies no CSS, so the unit tests
// cannot see which of the rail's two lists is actually on screen, whether the
// resume rows and Commitments really leave at 390, or what the hero cards
// measure. That is what this probe is for, and it writes a screenshot per
// viewport for the design review.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-refresh-home.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

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

// The two columns of §HomeBody, the sections inside them, and their visual
// order — the one thing the unit tests cannot state, because JSDOM stacks
// nothing and hides nothing.
const READ_BODY = `() => {
  const px = (v) => Math.round(parseFloat(v));
  const headings = [...document.querySelectorAll('h2')]
    .filter((h) => h.getClientRects().length)
    .map((h) => {
      const r = h.getBoundingClientRect();
      return { text: (h.textContent ?? '').trim().slice(0, 32), x: Math.round(r.x), y: Math.round(r.y) };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
  // The heroes' own frame: the grid that holds them is the first ancestor of a
  // hero card that has more than one child in the same row.
  const heroes = [...document.querySelectorAll('main div')]
    .filter((d) => /^\\d+ \\//.test((d.textContent ?? '').trim()) === false)
    .filter((d) => d.className && String(d.className).includes('rounded-[14px]') && String(d.className).includes('h-['))
    .map((d) => {
      const r = d.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x) };
    });
  const rail = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    if (!el.getClientRects().length) return { visible: false, rows: 0 };
    return { visible: true, rows: el.querySelectorAll('a[href^="/decks/"]').length,
             width: Math.round(el.getBoundingClientRect().width) };
  };
  const cols = [...document.querySelectorAll('header ~ div > div')].map((d) => {
    const r = d.getBoundingClientRect();
    return { w: Math.round(r.width), x: Math.round(r.x), gap: px(getComputedStyle(d).rowGap) };
  });
  return {
    headings,
    heroes,
    columns: cols,
    railDesktop: rail('[data-rail="desktop"]'),
    railPhone: rail('[data-rail="phone"]'),
  };
}`;

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  const results = {};

  for (const vp of [
    { label: "desktop", width: 1300, height: 950 },
    { label: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.hasTouch ?? false,
      isMobile: vp.isMobile ?? false,
    });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    const r = { viewport: vp.label };
    r.body = await page.evaluate(`(${READ_BODY})()`);
    // Every visible control, with its height: the 44px phone floor and the 32px
    // desktop form are the two figures the frames disagree about most.
    r.controls = await page.evaluate(() =>
      [...document.querySelectorAll("main a, main button, header a, header button")]
        .filter((b) => b.getClientRects().length)
        .map((b) => ({
          name: (b.getAttribute("aria-label") ?? b.textContent ?? "").trim().slice(0, 32),
          h: Math.round(b.getBoundingClientRect().height),
        }))
        .slice(0, 24),
    );
    // The two sections the phone drops. Their absence at 390 is a design claim,
    // not a code path, so it is read rather than asserted.
    r.dropped = await page.evaluate(() => {
      const seen = (text) =>
        [...document.querySelectorAll("h2")].some(
          (h) => h.getClientRects().length && (h.textContent ?? "").trim().startsWith(text),
        );
      return { resume: seen("Pick up"), commitments: seen("Commitments") };
    });
    r.kicker = await page.evaluate(() => {
      const el = document.querySelector("header p");
      return el ? el.textContent.trim().slice(0, 60) : null;
    });

    await page.screenshot({ path: `/tmp/refresh-home-${vp.label}.png`, fullPage: false });
    await page.screenshot({ path: `/tmp/refresh-home-${vp.label}-full.png`, fullPage: true });

    results[vp.label] = r;
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
