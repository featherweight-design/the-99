// The colour control's box, measured — the one claim in this round that only a
// browser can settle.
//
// The pips and the `Any` / `Exactly` modifier share one box on the wide rack:
// `px-[10px]` on the wrapper, a hairline between them, and the modifier's own
// group carried `pr-[6px]` on top. That put 16px to the right of `Exactly`
// against 10px to the left of the first pip, and the box read as lopsided at
// every width on both lanes. Class lists cannot show that — jsdom lays nothing
// out, and the two paddings live on different elements — so the assertion is the
// laid-out gap either side of the control's contents.
//
// Both lanes, because the control is mounted twice and a fix on one is not a fix.
//
// Run by hand with the dev server up:
//   PROBE_BASE=http://localhost:3000 node scripts/probe-chassis-colour.mjs
// Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const FIXTURE = EMAIL.includes("+clerk_test");
const { E2E_AUDIT_USER_PASSWORD: PASSWORD } = FIXTURE
  ? { E2E_AUDIT_USER_PASSWORD: null }
  : requireEnv(["E2E_AUDIT_USER_PASSWORD"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
/**
 * The wrapper's `px-[10px]` plus its own 1px border, measured from the border
 * box. `commanders-discover.md` § Colour match records it; this is the figure,
 * not merely a symmetry.
 */
const EXPECTED_GAP = 11;

// Lifted from its siblings, which document at length why the hosted portal
// cannot be driven unattended and `window.Clerk` can.
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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/**
 * The gap between the control's own box and its outermost contents, either side.
 *
 * Found by walking OUT from the radiogroup to the element that draws the border,
 * rather than by a class selector: the wrapper's class list is composed at
 * render time and a selector spelling it out would stop matching the moment a
 * utility moved. The border is what a reader sees as the box.
 *
 * Scoped to `<main>` AND to the group's own accessible name. Either alone is a
 * wrong measurement waiting: the shell renders around `<main>` and carries the
 * same ARIA selectors a page's controls do (`lib/surface.mjs` records the two
 * false findings that cost), and a lane's rack mounts more than one
 * `radiogroup` — the order control is one — so "the first visible one" is a
 * coin toss between the control under test and a neighbour with different
 * padding.
 */
const MATCH_GROUP = '[role="radiogroup"][aria-label="Color match"]:visible';

/** The control, reached the way every browser script here reaches page content. */
const matchGroup = (page) => onPage(page, MATCH_GROUP).first();

async function readBox(page) {
  // Evaluated THROUGH the locator rather than against a hand-built selector
  // string: `onPage` owns what "the page" means, and a raw `main …` of my own
  // would keep working right up until that definition moved.
  return matchGroup(page).evaluate((group) => {
    let box = group.parentElement;
    while (box && getComputedStyle(box).borderRightWidth === "0px") box = box.parentElement;
    if (!box) return null;
    const pips = box.querySelector('[role="group"]');
    const segments = [...group.querySelectorAll('[role="radio"]')];
    if (!pips || segments.length === 0) return null;
    const b = box.getBoundingClientRect();
    return {
      left: Math.round(pips.getBoundingClientRect().left - b.left),
      right: Math.round(b.right - segments[segments.length - 1].getBoundingClientRect().right),
      segments: segments.map((s) => s.textContent?.trim()),
    };
  });
}

const browser = await chromium.launch();
try {
  await clerkSetup();
  // 1300, not 1000: the rack's wide form starts at 1000 and this is the width the
  // lanes are drawn at.
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);

  for (const route of ["/commanders", "/discover"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    // Waited for, not slept through: both lanes stream, and a rect read before
    // the rack paints measures nothing.
    const box = await matchGroup(page)
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => readBox(page))
      // A lane that drew no control is this probe's own failure to report, not a
      // crash — the check below says so in words.
      .catch(() => null);
    console.log(`\n── ${route} · the colour control's box ──`);
    console.log(JSON.stringify(box, null, 2));
    if (!box) {
      console.log(`\nFAIL: ${route} drew no colour control to measure.`);
      process.exitCode = 1;
      continue;
    }
    // Equal is not enough. The wrapper's `px-[10px]` plus its 1px border is 11
    // either side, and a symmetric change to 8 or 20 would satisfy a
    // sides-agree check while leaving the specified geometry behind — the same
    // trap `probe:games-empty` records for its centring assertion. So both: the
    // sides agree, AND each is the figure `commanders-discover.md` specifies.
    // One pixel of tolerance for sub-pixel layout; the padding that was there
    // was 6, so anything approaching it is the bug back.
    if (Math.abs(box.left - box.right) > 1 || Math.abs(box.left - EXPECTED_GAP) > 1) {
      console.log(
        `\nFAIL: ${route} colour control is ${box.left}px in on the left and ${box.right}px on`
          + ` the right; both should be ${EXPECTED_GAP}px. The box pads both sides equally,`
          + " and nothing inside it adds more.",
      );
      process.exitCode = 1;
    }
  }
  await context.close();
} finally {
  await browser.close();
}
