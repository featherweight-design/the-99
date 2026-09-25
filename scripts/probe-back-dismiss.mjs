// Back closes the dialog on top, not the route under it (#155).
//
// Android's hardware back used to navigate the app away with a sheet still open, because no
// dialog put a history entry under itself. `useBackDismiss` in `src/lib/a11y/dialog.ts` does
// now, and every rule it follows is a fact about a real session history that jsdom only
// approximates: whether Next's router takes a same-URL push without navigating, whether a
// pop restores the URL a sheet wrote while open, and whether the entry a dialog took is gone
// again after it closes some other way. So this presses Back in a browser.
//
// What it asserts, per width:
//   1. Back from an open card modal closes it and stays on the route. The modal mirrors the
//      open card into the URL with `replaceState`, which is the case that could strand an
//      entry or revert the address.
//   2. A dialog closed by Escape leaves no entry behind: ONE Back afterwards leaves the route.
//      Without the self-pop that Back does nothing visible, once per dialog ever opened.
//   3. (phone) Nested dialogs close one per Back — the set panel over the filter sheet — and
//      the filter the reader chose in the panel survives both pops. The panel writes it into
//      the URL while open, onto the dialog's entry; a pop lands on the entry before it.
//   4. (phone) A sheet that takes the lock without `useDialogA11y` closes on Back as well:
//      `/collection`'s Sort panel (`FilterPanel`) and `/commanders`' Filters sheet.
//   5. Back does what Escape does: on the card modal, the zoom first, then the modal.
//   6. A link inside the modal that navigates is not undone, and the entry the modal
//      left under it is stepped past, so no Back afterwards is a dead press.
//
// Makes no writes. Run by hand against a dev server serving this worktree:
//   PROBE_BASE=http://localhost:3000 node scripts/probe-back-dismiss.mjs
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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
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

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

/** Every visible dialog on the page, by accessible name. The shell's own sheet counts too. */
const dialogs = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"]')]
      .filter((d) => d.getClientRects().length > 0 && getComputedStyle(d).visibility !== "hidden")
      .map((d) => d.getAttribute("aria-label") ?? d.id ?? "(unnamed)"),
  );
const where = (page) => page.evaluate(() => ({ path: location.pathname, search: location.search }));

/** Back, then let the pop, the dialog's close and any URL restore all land. */
async function back(page) {
  await page.evaluate(() => history.back());
  await page.waitForTimeout(900);
}

/** Arrive from "/" so the entry before the route is known: one Back past the route is "/". */
async function arrive(page, path) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  // The lists stream, and a trigger pressed before its route settles opens nothing.
  await page.waitForTimeout(2_500);
}

async function press(locator, label) {
  const ok = await locator.evaluate((el) => el.click(), undefined, { timeout: 8_000 }).then(() => true, () => false);
  if (!ok) report(label, false, "its trigger was not on the page — nothing measured");
  return ok;
}

const cardTrigger = (page) => onPage(page, 'button[aria-label*="cop"]:visible').first();

async function run(width, height) {
  const tag = width < 768 ? "390" : "1300";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await signIn(page);

    // Rows at both widths: the desktop default is the grid, whose tiles carry a
    // different name, and the rows' trigger is the one this probe knows.
    const rows = "/collection?view=rows";

    // 1 · the card modal, which mirrors itself into the URL.
    await arrive(page, rows);
    if (await press(cardTrigger(page), `${tag} · card modal opens`)) {
      await page.waitForTimeout(1_200);
      const open = await dialogs(page);
      const mirrored = (await where(page)).search.includes("card=");
      await back(page);
      const after = await where(page);
      const left = await dialogs(page);
      report(
        `${tag} · Back closes the card modal and stays on the route`,
        open.length > 0 && mirrored && left.length === 0 && after.path === "/collection" && !after.search.includes("card="),
        `open ${JSON.stringify(open)} (URL mirrored: ${mirrored}) → after Back ${JSON.stringify(left)} at ${after.path}${after.search}`,
      );
    }

    // 2 · closed by Escape, it leaves nothing for Back to step over.
    await arrive(page, rows);
    if (await press(cardTrigger(page), `${tag} · card modal opens again`)) {
      await page.waitForTimeout(1_200);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(900);
      const closed = await dialogs(page);
      await back(page);
      const after = await where(page);
      report(
        `${tag} · after Escape, one Back leaves the route`,
        closed.length === 0 && after.path === "/",
        `dialogs after Escape ${JSON.stringify(closed)}; one Back landed on ${after.path}`,
      );
    }

    // 5 · Back does what Escape does: the zoom first, then the modal.
    await arrive(page, rows);
    if (await press(cardTrigger(page), `${tag} · card modal opens for the zoom`)) {
      await page.waitForTimeout(1_200);
      const zoom = onPage(page, 'button[aria-label^="Look at"]:visible').first();
      if (await press(zoom, `${tag} · the zoom opens`)) {
        await page.waitForTimeout(600);
        await back(page);
        const stillUp = await dialogs(page);
        const onRoute = (await where(page)).path;
        await back(page);
        const closed = await dialogs(page);
        await back(page);
        const finally_ = (await where(page)).path;
        report(
          `${tag} · Back steps down the zoom, then the modal, then the route`,
          stillUp.length > 0 && onRoute === "/collection" && closed.length === 0 && finally_ === "/",
          `after 1st Back ${JSON.stringify(stillUp)} on ${onRoute}; after 2nd ${JSON.stringify(closed)}; 3rd landed on ${finally_}`,
        );
      }
    }

    // 6 · a link inside the modal that navigates is not undone, and leaves no dead Back.
    // The claim list links each deck holding the card, so the list is narrowed to cards
    // some deck holds (`inuse`, `brew`) and the first row with a link is used.
    await arrive(page, `${rows}&avail=inuse,brew`);
    let followed = false;
    for (let i = 0; i < 12 && !followed; i++) {
      const row = onPage(page, 'button[aria-label*="cop"]:visible').nth(i);
      if (!(await row.evaluate((el) => el.click(), undefined, { timeout: 4_000 }).then(() => true, () => false))) break;
      await page.waitForTimeout(1_200);
      const link = onPage(page, '[role="dialog"] a[href^="/decks/"]:visible').first();
      if ((await link.count()) > 0) {
        await link.click();
        await page.waitForURL(/\/decks\//, { timeout: 15_000 }).catch(() => null);
        await page.waitForTimeout(1_500);
        followed = (await where(page)).path.startsWith("/decks/");
      } else {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(600);
      }
    }
    if (!followed) {
      report(`${tag} · a deck link inside the card modal`, false, "no card among the first 12 claimed rows links a deck — nothing measured");
    } else {
      // What matters is that no press is dead: each Back must change what the reader
      // sees. Returning to /collection may reopen the modal, since the card is in that
      // URL and the reader left with it open; the next Back then closes it, and the one
      // after leaves the route.
      const states = [];
      for (let n = 0; n < 4; n++) {
        await back(page);
        const at = await where(page);
        states.push(`${at.path}${(await dialogs(page)).length > 0 ? "+modal" : ""}`);
        if (at.path === "/") break;
      }
      const dead = states.some((st, i) => i > 0 && st === states[i - 1]);
      report(
        `${tag} · after following a link from the modal, every Back changes what is on screen`,
        states[0].startsWith("/collection") && states[states.length - 1] === "/" && !dead,
        states.join(" → "),
      );
    }

    if (width >= 768) return;

    // 3 · nested: the set panel over the filter sheet, and the filter chosen in it.
    await arrive(page, "/collection");
    if (await press(onPage(page, 'button[aria-label^="Filter cards"]:visible').first(), "390 · filter sheet opens")) {
      await page.waitForTimeout(800);
      // Through onPage: the shell's account control carries the same aria-haspopup at
      // phone width and comes first in document order.
      const setRow = onPage(page, '[role="dialog"] button[aria-haspopup="dialog"]:visible').first();
      if (await press(setRow, "390 · set panel opens over the sheet")) {
        await page.waitForTimeout(800);
        const option = page.locator('[role="dialog"][aria-label="Filter by set"] [role="switch"][aria-checked="false"]:not([disabled])').first();
        const chose = await press(option, "390 · a set to choose");
        await page.waitForTimeout(900);
        const chosen = (await where(page)).search;
        const both = await dialogs(page);
        await back(page);
        const one = await dialogs(page);
        const afterOne = await where(page);
        report(
          "390 · first Back closes only the set panel",
          chose && both.includes("Filter by set") && !one.includes("Filter by set") && one.length === both.length - 1,
          `${JSON.stringify(both)} → ${JSON.stringify(one)}`,
        );
        report(
          "390 · the chosen set survives the first Back",
          chosen.length > 0 && afterOne.search === chosen && afterOne.path === "/collection",
          `chosen ${chosen || "(nothing written)"} → after Back ${afterOne.path}${afterOne.search}`,
        );
        await back(page);
        const none = await dialogs(page);
        const afterTwo = await where(page);
        report(
          "390 · second Back closes the sheet, keeps the filter and stays on the route",
          none.length === 0 && afterTwo.path === "/collection" && afterTwo.search === chosen,
          `${JSON.stringify(none)} at ${afterTwo.path}${afterTwo.search}`,
        );
        await back(page);
        report("390 · a third Back leaves the route", (await where(page)).path === "/", `landed on ${(await where(page)).path}`);
      }
    }

    // 4 · the two sheets that take the lock without useDialogA11y.
    for (const [label, path, trigger] of [
      ["/collection · Sort panel (FilterPanel)", "/collection", (p) => onPage(p, 'button[aria-label^="Sort cards"]:visible').first()],
      ["/commanders · Filters sheet", "/commanders", (p) => onPage(p, "button:visible").filter({ hasText: /^Filters/ }).first()],
    ]) {
      await arrive(page, path);
      if (!(await press(trigger(page), `390 · ${label} opens`))) continue;
      await page.waitForTimeout(800);
      const open = await dialogs(page);
      await back(page);
      const after = await where(page);
      const left = await dialogs(page);
      report(
        `390 · Back closes ${label} and stays on the route`,
        open.length > 0 && left.length === 0 && after.path === path,
        `${JSON.stringify(open)} → ${JSON.stringify(left)} at ${after.path}`,
      );
    }
  } finally {
    await browser.close();
  }
}

try {
  // Before setupClerkTestingToken: it resolves the Frontend API URL the bypass needs.
  await clerkSetup();
  await run(390, 844);
  await run(1300, 900);
} catch (error) {
  // Counted rather than thrown past the summary: a throw would otherwise print nothing
  // about the checks that did run, and a `finally` that exits swallows it outright.
  console.error(error);
  failures += 1;
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
