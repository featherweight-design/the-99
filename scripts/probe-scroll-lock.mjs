// The page holds still behind every overlay, on every route that has one.
//
// A modal or a filter sheet is drawn over a scrim, and a page that scrolls behind it reads
// as broken: the reader's thumb lands on the sheet, misses, and the list they were half
// through moves under it. `useDialogA11y` has held the body since it shipped — but two
// surfaces trap focus themselves and never took it, so `/commanders`, `/discover` and every
// `FilterPanel` sheet scrolled behind their own dialogs. Both now take the shared lock.
//
// Only a browser can answer this. The lock is `document.body.style.overflow`, and whether
// that actually stops a wheel is a question about the viewport's overflow propagation, not
// about the property — jsdom scrolls nothing and would report every route as passing.
//
// Each check opens the surface, wheels the page, and reports where the scroll offset ended
// up. A surface whose trigger is not on the page FAILS rather than being skipped: an
// overlay this probe cannot open is an overlay it is not covering.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-scroll-lock.mjs
//   PROBE_BASE=http://localhost:3100 node scripts/probe-scroll-lock.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

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
          if (!factor?.emailAddressId) {
            const offered = (attempt.supportedFirstFactors ?? []).map((f) => f.strategy).join(", ");
            return `${email} offers no usable email_code first factor (offered: ${offered || "none"}).`;
          }
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

/**
 * Every overlay this app draws over a scrim, and the button that opens it.
 *
 * `open` is given a page and returns the trigger it pressed, so a route whose control is
 * named differently on the phone says so in one place. The card modal is in here beside the
 * sheets deliberately: it has always held the page, and a check that only walked the two
 * surfaces that were broken would not notice the day one of the others stopped.
 */
const SURFACES = [
  {
    label: "/collection · Filters sheet",
    path: "/collection",
    trigger: (page) => page.getByRole("button", { name: /^Filter cards/ }).first(),
  },
  {
    label: "/collection · Sort panel",
    path: "/collection",
    trigger: (page) => page.getByRole("button", { name: /^Sort cards/ }).first(),
    // Closing returns focus to the trigger, which sits above the list and is off-screen by
    // the time the reader has scrolled — so the browser scrolls it back into view. That is
    // the focus-return contract, not the lock failing, and it is what `FilterPanel`'s own
    // `preventScroll` path already documents for the scroll-dismiss case. The lock is still
    // asserted while the panel is up; only the offset it releases to is not.
    returnsToTrigger: true,
  },
  {
    label: "/collection · card modal",
    path: "/collection",
    // The row's own accessible name, either number: `*="copy"` missed every card with two
    // or more, because "copies" does not contain "copy", and the run only passed on a
    // fixture whose first row happened to be a singleton.
    trigger: (page) => page.getByRole("button", { name: /, \d+ (copy|copies)\b/ }).first(),
  },
  {
    label: "/commanders · Filters sheet",
    path: "/commanders",
    trigger: (page) => page.locator("button", { hasText: /^Filters/ }).first(),
  },
  {
    label: "/discover · Filters sheet",
    path: "/discover",
    trigger: (page) => page.locator("button", { hasText: /^Filters/ }).first(),
  },
  {
    label: "/decks · Filter decks sheet",
    path: "/decks",
    trigger: (page) => page.getByRole("button", { name: /^Filter decks/ }).first(),
  },
];

async function run() {
  // Before setupClerkTestingToken: it resolves the Frontend API URL the bot-protection
  // bypass needs, and without it the sign-in fails naming the bypass rather than the setup.
  await clerkSetup();
  const browser = await chromium.launch();
  // The phone, where every one of these is a full-height sheet rather than a popover.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let failures = 0;

  try {
    await signIn(page);

    // The set page's own sheet, whose code is read off the reader's index rather than
    // hardcoded, so the probe runs against any fixture.
    await page.goto(`${BASE}/collection/sets`, { waitUntil: "networkidle" });
    const code = await page.evaluate(() => {
      const row = document.querySelector('a[href^="/collection/sets/"][aria-label*="base run"]')
        ?? document.querySelector('a[href^="/collection/sets/"]');
      return row === null ? null : row.getAttribute("href").split("/").pop();
    });
    // A fixture with no set link is a fixture this probe cannot cover, and the contract is
    // that an overlay it cannot reach FAILS. Dropping the row instead let the run exit 0
    // while the set page's sheet — one of the surfaces this PR touches — went untested.
    if (code === null) {
      failures += !report(
        "/collection/sets · a set to open",
        false,
        "no set link on the index — the set page's filter sheet went unchecked",
      );
    }
    const surfaces = code === null ? SURFACES : [...SURFACES, {
      label: `/collection/sets/${code} · Filters sheet`,
      path: `/collection/sets/${code}`,
      // Scoped to `<main>`: the shell's account control carries the same
      // `aria-haspopup="dialog"` at phone width and comes first in document order, so an
      // unscoped query opens the account sheet and measures the shell's lock instead of
      // this page's. `scripts/lib/surface.mjs` exists for exactly this substitution.
      trigger: (p) => onPage(p, 'button[aria-haspopup="dialog"]:visible').first(),
    }];

    for (const surface of surfaces) {
      await page.goto(`${BASE}${surface.path}`, { waitUntil: "networkidle" });
      // The lists stream, and a trigger pressed before its route settles opens nothing.
      await page.waitForTimeout(2_500);
      // Scrolled first, so the check can tell a page that is held from one that had
      // nowhere to go: an offset of 0 before and after proves nothing on a short page.
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(300);
      const start = await page.evaluate(() => Math.round(window.scrollY));

      // Clicked through the DOM, not through Playwright's own click: that one scrolls its
      // target into view first, which put every route at the top BEFORE the lock was taken
      // and made the check read as a page that had been jumped when nothing had jumped it.
      const trigger = surface.trigger(page);
      const opened = await trigger
        .evaluate((el) => el.click(), undefined, { timeout: 8_000 })
        .then(() => true, () => false);
      if (!opened) {
        failures += !report(surface.label, false, "its trigger was not on the page — nothing measured");
        continue;
      }
      await onPage(page, '[role="dialog"]')
        .first()
        .waitFor({ state: "visible", timeout: 8_000 })
        .catch(() => null);
      await page.waitForTimeout(400);

      const held = await page.evaluate(() => ({
        y: Math.round(window.scrollY),
        overflow: document.body.style.overflow,
      }));
      await page.mouse.move(195, 500);
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => ({
        y: Math.round(window.scrollY),
        overflow: document.body.style.overflow,
        // Counted inside `<main>`, for the same reason the trigger is scoped there.
        dialogs: document.querySelectorAll('main [role="dialog"]').length,
      }));
      failures += !report(
        surface.label,
        after.dialogs > 0 && start > 0 && held.y === start && after.y === start
          && after.overflow === "hidden",
        after.dialogs === 0
          ? "no dialog was up after the trigger — nothing measured"
          : start === 0
            ? "the route had nowhere to scroll — nothing measured"
            : `opened at ${start}, held at ${held.y}, ${after.y} after 900px of wheel;`
              + ` body overflow "${after.overflow}"`,
      );

      // Released on close, or the route the reader goes back to cannot scroll at all.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const released = await page.evaluate(() => ({
        overflow: document.body.style.overflow,
        y: Math.round(window.scrollY),
      }));
      failures += !report(
        surface.returnsToTrigger
          ? `${surface.label} · releases the page`
          : `${surface.label} · releases the page where it was`,
        released.overflow !== "hidden" && (surface.returnsToTrigger || released.y === start),
        `body overflow "${released.overflow || "(none)"}", back at y ${released.y} from ${start}`
        + (surface.returnsToTrigger ? " — offset not asserted: focus returns to the trigger" : ""),
      );
    }
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run();
