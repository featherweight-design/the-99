// probe:collection-tabs — the collection's place head on its three routes (collection
// surfaces Call 4, R2 §Q1, audit E10, E11, E19, E21).
//
// What only a layout engine answers: the strip lands at the same top and the same first-tab
// edge on /collection, /collection/sets and /collection/proxies, at every width, so pressing
// one of its own tabs never moves it; on the phone the strip comes first with Replace at its
// end and /collection's h1 is not drawn. Every one of those is markup-identical on a broken
// build, which is why jsdom cannot see them. Makes no writes. Point it at `local-dev`.
//
// Dropped (Hugh's ruling, #1222 follow-up): the desktop check that Sets/Proxies' h1 starts
// on the first tab's edge. Their content column now centers under the place head instead of
// anchoring left to it, so nothing pins the h1 to that edge any more.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";

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
}

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

const ROUTES = [
  { path: "/collection", tab: "cards" },
  { path: "/collection/sets", tab: "sets" },
  { path: "/collection/proxies", tab: "proxies" },
];

/**
 * The strip's box, its first tab's TEXT edge (a Range, not the link: the link carries 10px
 * of padding), the current tab, and whether a drawn h1 exists (the phone's own "no h1 on
 * Cards" check). Read through `PAGE`, never the document: the shell draws its own navs
 * around <main>.
 */
const MEASURE = (scope) => {
  const main = document.querySelector(scope);
  const nav = main?.querySelector('nav[aria-label="Collection sections"]');
  if (!main || !nav) return null;
  const textLeft = (el) => {
    if (!el) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.width > 0) return r.left;
    }
    return null;
  };
  const mainBox = main.getBoundingClientRect();
  const navBox = nav.getBoundingClientRect();
  const links = [...nav.querySelectorAll("a")].filter((a) => a.getAttribute("href") !== "/collection/replace");
  const visibleH1 = [...main.querySelectorAll("h1")].find((h) => {
    const r = h.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  });
  const replace = [...nav.querySelectorAll('a[href="/collection/replace"]')]
    .find((a) => a.getBoundingClientRect().width > 0);
  return {
    top: navBox.top - mainBox.top + window.scrollY,
    height: navBox.height,
    tabLeft: textLeft(links[0]) - mainBox.left,
    current: links.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.getAttribute("data-testid")),
    names: links.map((a) => a.textContent),
    h1: visibleH1 ? { text: visibleH1.textContent, left: textLeft(visibleH1) - mainBox.left } : null,
    replaceInStrip: Boolean(replace),
  };
};

const near = (a, b) => a != null && b != null && Math.abs(a - b) <= 0.5;

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let failures = 0;
  const fail = (label, ok, detail) => { failures += !report(label, ok, detail); };

  try {
    for (const width of [1300, 768, 390, 360]) {
      const desktop = width >= 768;
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await signIn(page);

      const seen = [];
      for (const route of ROUTES) {
        await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(1_500);
        const m = await page.evaluate(MEASURE, PAGE);
        if (m === null) {
          fail(`${width}px · ${route.path}`, false, "no place strip in <main>");
          continue;
        }
        seen.push({ route, m });
        fail(
          `${width}px · ${route.path} · current tab`,
          m.current.length === 1 && m.current[0] === `collection-tab-${route.tab}`,
          `aria-current on ${JSON.stringify(m.current)}; tabs ${JSON.stringify(m.names)}`,
        );
        fail(
          `${width}px · ${route.path} · strip height`,
          // Border-box, as the canvas draws it: the 1px rule is inside the 40 and the 48.
          near(m.height, desktop ? 40 : 48),
          `${m.height}px against ${desktop ? 40 : 48}`,
        );
        if (!desktop) {
          // The phone draws the strip first, with Replace at its end, and no title block.
          fail(`${width}px · ${route.path} · strip first`, near(m.top, 0), `strip top ${m.top}px into <main>`);
          fail(`${width}px · ${route.path} · Replace in the strip`, m.replaceInStrip, String(m.replaceInStrip));
          if (route.tab === "cards") {
            fail(`${width}px · /collection · no drawn h1`, m.h1 === null, m.h1 === null ? "sr-only" : `drew "${m.h1.text}"`);
          }
        }
      }

      // THE POINT OF THE BLOCK (E21): pressing one of its own tabs never moves the strip.
      if (seen.length === ROUTES.length) {
        const [first, ...rest] = seen;
        fail(
          `${width}px · strip top equal on all three`,
          rest.every((s) => near(s.m.top, first.m.top)),
          seen.map((s) => `${s.route.path} ${s.m.top}`).join(", "),
        );
        fail(
          `${width}px · first tab's left equal on all three`,
          rest.every((s) => near(s.m.tabLeft, first.m.tabLeft)),
          seen.map((s) => `${s.route.path} ${s.m.tabLeft}`).join(", "),
        );
        if (width === 1300) {
          fail(`1300px · strip top at 109`, near(first.m.top, 109), `${first.m.top}px`);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
