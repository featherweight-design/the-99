// probe:deck-menu-stack — an open filter dropdown on /decks paints over the tiles' ⋯ buttons.
//
// Hugh's staging walk: with the Status dropdown open, a deck tile's ⋯ button drew ON TOP of it.
// The desktop popover and the tile's overflow wrapper are both positioned at z-10 in the same
// stacking context, and the tile comes later in the document, so on a tie the tile wins. The
// popover now sits above the tiles and below the tab bar and the sheets.
//
// jsdom paints nothing, so what is on top is a question only a layout engine answers. At 1300x900
// this opens each of the three dropdowns in turn (Status, Deck state, Last played), finds every ⋯ button
// whose centre lies inside the open popover, and asks what is painted at that point: it must
// belong to the popover. A run where no ⋯ button falls under any popover FAILS, because it
// measured nothing. At 390x844 the dropdowns open inside the filter sheet, a fixed overlay above
// everything, and the same check runs over the sheet as an invariance.
//
// Its one write is the About row `clearAboutSheet` sets for the account (every entry marked seen),
// which it leaves set. Point it at `local-dev`, whose fixture account holds enough decks for the
// first row of tiles to sit under the popover.
//
//   PROBE_BASE=http://localhost:3018 node scripts/probe-deck-menu-stack.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, openSheet } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
// A `+clerk_test` account signs in by email code and needs no password; any other needs one.
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
// The three deck filters, by their trigger labels (`deckChassisCopy`: status, state, played).
const DIMENSIONS = ["Status", "Deck state", "Last played"];

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (e) {
        return String(e?.errors?.[0]?.longMessage ?? e);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(failure);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/**
 * Every tile ⋯ button whose centre lies inside `panel`, and whether the popover is what is
 * painted there. The menu buttons carry `Actions for <deck>` (`refreshCopy.decks.menu.trigger`),
 * and are found structurally, as the tiles' `aria-expanded` buttons, rather than by that label.
 */
const covered = (panel) =>
  panel.evaluate((box) => {
    const r = box.getBoundingClientRect();
    const inside = (x, y) => x > r.left && x < r.right && y > r.top && y < r.bottom;
    const tiles = [...document.querySelectorAll("main li button[aria-expanded]")];
    return tiles
      .map((b) => {
        const t = b.getBoundingClientRect();
        const x = t.left + t.width / 2;
        const y = t.top + t.height / 2;
        if (t.width === 0 || !inside(x, y)) return null;
        const hit = document.elementFromPoint(x, y);
        return { name: b.getAttribute("aria-label"), onTop: box.contains(hit) };
      })
      .filter(Boolean);
  });

async function desktop(page) {
  await page.setViewportSize({ width: 1300, height: 900 });
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  let measured = 0;
  for (const dim of DIMENSIONS) {
    const trigger = onPage(page, 'button[aria-expanded="false"]:visible').filter({ hasText: new RegExp(`^${dim}`) }).first();
    if ((await trigger.count()) === 0) {
      report(false, `1300: the ${dim} dropdown is on the page`);
      continue;
    }
    await trigger.click();
    const panel = onPage(page, `[role="dialog"][aria-label="${dim} options"]`);
    await panel.waitFor({ state: "visible", timeout: 5_000 });
    const under = await covered(panel);
    measured += under.length;
    const through = under.filter((u) => !u.onTop).map((u) => u.name);
    report(through.length === 0, `1300: ${dim} paints over every ⋯ under it`, `${under.length} under it${through.length ? `; showing through: ${through.join(", ")}` : ""}`);
    await page.keyboard.press("Escape");
  }
  report(measured > 0, "1300: at least one ⋯ sat under an open dropdown", `${measured} measured`);
}

async function phone(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  const sheet = await openSheet(page);
  if (!sheet) {
    report(false, "390: the filter sheet opens");
    return;
  }
  const under = await covered(sheet);
  const through = under.filter((u) => !u.onTop).map((u) => u.name);
  report(through.length === 0, "390: the filter sheet paints over every ⋯ under it", `${under.length} under it${through.length ? `; showing through: ${through.join(", ")}` : ""}`);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const userId = await signIn(page);
  await clearAboutSheet(page, userId);
  await desktop(page);
  await phone(page);
} catch (e) {
  failures += 1;
  console.log(`FAIL  run aborted — ${e?.stack ?? e}`);
} finally {
  await browser.close();
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
