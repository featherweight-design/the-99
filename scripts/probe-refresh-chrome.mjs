// Gate for PR B of the UI refresh: the 62px icon rail and the 52px tab bar,
// measured in a real browser rather than asserted from JSDOM.
//
// JSDOM has no layout, so the unit tests can prove the rail's markup and say
// nothing about whether 38px squares fit inside 62px, or whether the rail and
// the tab bar draw the same glyph in the same slot. That is what this probe is
// for. It also writes a screenshot per viewport for the design review.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-refresh-chrome.mjs
//
// The locked chrome is not reachable from either fixture account — both have
// full collections, and `locked` is `uniqueCards === 0`. To shoot it, force
// `locked` in shell.tsx, then run with PROBE_SUFFIX=-locked so the screenshots
// land beside the unlocked pair instead of overwriting them.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const SUFFIX = process.env.PROBE_SUFFIX ?? "";
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

// The glyph itself, as a shape string, so the rail's slot 3 can be compared
// against the tab bar's slot 3 rather than merely counted.
const READ_NAV = `(sel) => {
  const nav = document.querySelector(sel);
  if (!nav) return null;
  const box = nav.getBoundingClientRect();
  const items = [...nav.querySelectorAll('a, span[role=link]')].map((a) => {
    const r = a.getBoundingClientRect();
    return {
      href: a.getAttribute('href'),
      name: a.getAttribute('aria-label') ?? (a.textContent ?? '').trim(),
      title: a.getAttribute('title'),
      disabled: a.getAttribute('aria-disabled'),
      text: (a.textContent ?? '').trim(),
      w: Math.round(r.width),
      h: Math.round(r.height),
      shape: a.querySelector('svg')?.innerHTML ?? null,
    };
  });
  return { w: Math.round(box.width), h: Math.round(box.height), items };
}`;

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  const results = {};

  for (const vp of [
    { label: "desktop", width: 1300, height: 900 },
    { label: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.hasTouch ?? false,
    });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });

    const rail = await page.evaluate(`(${READ_NAV})('aside nav[aria-label="Primary"]')`);
    const tabs = await page.evaluate(`(${READ_NAV})('nav.fixed[aria-label="Primary"]')`);
    const railWidth = await page.evaluate(() => {
      const el = document.querySelector("aside");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width === 0 ? null : Math.round(r.width);
    });
    const marks = await page.evaluate(() => document.querySelectorAll("[data-nav-diamond]").length);

    // The values PR B moved, read back as computed style rather than asserted
    // from the class strings the unit tests already cover.
    const geometry = await page.evaluate(() => {
      const px = (v) => Math.round(parseFloat(v));
      const of = (el, ...props) =>
        el ? Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])) : null;
      const aside = document.querySelector("aside");
      const mark = document.querySelector("[data-nav-diamond]");
      const bar = document.querySelector('nav.fixed[aria-label="Primary"]');
      const tab = bar?.querySelector("a, span[role=link]");
      const avatar = aside?.querySelector("button[aria-haspopup] > span");
      return {
        tabbarToken: getComputedStyle(document.documentElement)
          .getPropertyValue("--tabbar-h")
          .trim(),
        barHeight: bar ? px(getComputedStyle(bar).height) : null,
        rail: of(aside, "paddingTop", "paddingBottom", "backgroundColor", "borderRightWidth"),
        mark: of(mark, "width", "height", "borderRadius", "marginBottom", "borderTopWidth"),
        avatar: of(avatar, "width", "height", "borderRadius", "backgroundColor"),
        bar: of(bar, "backgroundColor", "borderTopColor", "paddingTop", "paddingBottom"),
        tab: of(tab, "height", "borderRadius", "rowGap", "color"),
      };
    });

    results[vp.label] = { railWidth, marks, geometry, rail, tabs };
    // Next's dev indicator is a fixed badge in the bottom-left corner, which is
    // exactly where the rail's account trigger sits. It is dev-only chrome, so
    // it comes out of the shot rather than out of the review.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({
      path: `/tmp/refresh-chrome-${vp.label}${SUFFIX}.png`,
      fullPage: false,
    });
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
