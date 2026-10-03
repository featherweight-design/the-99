// probe:collection-head — the collection surfaces pinned head (R1 + addendum R2) below
// 1000px. What only a layout engine answers: the head's two fixed heights (108 below 900,
// 66 from 900 to 999 — 6px over the brief's provisional 102/60, the shared `ViewToggle`
// well's own real compact height; see `filter-bar.tsx`), that it never changes height or
// animates on scroll (H1/H2), that the
// chip shelf lives below it rather than inside it (decision 2 for this route, call 2), that
// the view well hides on search focus without dropping keyboard focus (readiness E2), that a
// filter change scrolled past the head's rest offset returns there (decision 6 / E8), and
// that the sort sheet portals to <body> rather than into the sticky box (readiness E1, H8).
// Every one of those is markup-identical on a broken build, which is why jsdom cannot see
// them. Makes no writes. Point it at `local-dev`.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

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

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

const near = (a, b, tol = 1) => a != null && b != null && Math.abs(a - b) <= tol;

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let failures = 0;
  const fail = (label, ok, detail) => { failures += !report(label, ok, detail); };

  try {
    for (const width of [390, 700, 850, 950, 1300]) {
      const pinned = width < 1000;
      const oneRow = width >= 900 && width < 1000;
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await signIn(page);
      await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      if (!pinned) {
        // The wide chassis is untouched by this brief (decision 10): confirm it still exists
        // and move on rather than re-proving behaviour that predates this PR.
        const wideBox = await onPage(page, '[data-chassis-row="controls"]').first().isVisible().catch(() => false);
        fail(`${width}px · wide chassis present`, wideBox, String(wideBox));
        await context.close();
        continue;
      }

      // H1 — the head's own fixed height, border-box.
      const head = onPage(page, "[data-collection-search-row]").locator("xpath=..").first();
      const headBox = await head.boundingBox();
      fail(
        `${width}px · head height`,
        headBox && near(headBox.height, oneRow ? 66 : 108, 2),
        `${headBox?.height}px against ${oneRow ? 66 : 108}`,
      );

      // H2 — scrolled: the head stays pinned at the viewport top with the SAME height.
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(100);
      const scrolledBox = await head.boundingBox();
      fail(`${width}px · pinned at scroll`, scrolledBox && near(scrolledBox.y, 0, 1), `top ${scrolledBox?.y}px`);
      fail(
        `${width}px · height unchanged while scrolled`,
        scrolledBox && headBox && near(scrolledBox.height, headBox.height, 1),
        `${scrolledBox?.height}px against ${headBox?.height}px`,
      );
      await page.mouse.wheel(0, -2000);
      await page.waitForTimeout(100);

      // H1 — no chip shelf with nothing on.
      const shelfAtRest = await onPage(page, "[data-collection-chip-shelf]").count();
      fail(`${width}px · no shelf with no filter on`, shelfAtRest === 0, `${shelfAtRest} shelves`);

      // H3 — a filter on draws the shelf below the head, at 38px, one line.
      // Exercise a real dimension: the Type panel's sheet via the Filters trigger.
      await onPageRole(page, "button", /Filter cards/).click();
      await page.waitForTimeout(250);
      // The sheet's Type row is `SheetChip`, `role="switch"` (`set-list-sheet.tsx`) —
      // not `FilterPanel`'s own `role="option"` rows, which this sheet does not use.
      const firstType = page.getByRole("dialog").getByRole("switch").first();
      await firstType.click().catch(() => {});
      await page.waitForTimeout(400);
      // Close the sheet (Done), back to the page.
      const done = page.getByRole("dialog").getByRole("button", { name: /^Done$/ });
      if (await done.count()) await done.click();
      await page.waitForTimeout(300);

      const shelf = onPage(page, "[data-collection-chip-shelf]").first();
      const shelfCount = await shelf.count();
      if (shelfCount === 0) {
        fail(`${width}px · shelf drawn with a filter on`, false, "no shelf after toggling a Type chip");
      } else {
        const shelfBox = await shelf.boundingBox();
        fail(`${width}px · shelf height`, shelfBox && near(shelfBox.height, 38, 2), `${shelfBox?.height}px`);
        const insideHead = await shelf.evaluate((el, headEl) => headEl.contains(el), await head.elementHandle());
        fail(`${width}px · shelf outside the sticky head`, !insideHead, String(insideHead));
        // `scrollHeight` over `clientHeight` is polluted here: the chip ✕ and Clear-all's
        // own 44px touch-target overlays are `absolute`, which turns the shelf's implicit
        // `overflow-y` into `auto` and reports a taller scrollHeight with nothing actually
        // wrapped. Read the chips' own tops instead — a real wrap puts a later chip below
        // the first, an overlay never moves a sibling's layout box.
        const tops = await shelf.evaluate((el) =>
          [...el.querySelectorAll(":scope > span")].map((c) => c.getBoundingClientRect().top),
        );
        const wrapped = tops.length > 1 && tops.some((t) => Math.abs(t - tops[0]) > 1);
        fail(`${width}px · shelf never wraps`, !wrapped, `tops: ${JSON.stringify(tops)}`);
      }

      // Clean the filter back off for the remaining checks.
      const clearAll = onPageRole(page, "button", /Clear all filters/);
      if (await clearAll.count()) await clearAll.click();
      await page.waitForTimeout(300);

      // H5 — search focus hides the well without losing it, and a typed query draws the ✕.
      const well = onPage(page, "[data-collection-view-well]").first();
      const wellVisibleBefore = await well.isVisible();
      const search = onPageRole(page, "searchbox", "Search your cards");
      await search.click();
      await page.waitForTimeout(100);
      const wellVisibleFocused = await well.isVisible();
      fail(
        `${width}px · well hides on search focus`,
        wellVisibleBefore && !wellVisibleFocused,
        `before ${wellVisibleBefore}, focused ${wellVisibleFocused}`,
      );
      // Shift+Tab from Filters must reach the well without it staying hidden under it.
      await search.blur();
      await page.waitForTimeout(100);
      const filtersBtn = onPageRole(page, "button", /Filter cards/);
      await filtersBtn.focus();
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(100);
      const wellVisibleAfterShiftTab = await well.isVisible();
      fail(
        `${width}px · Shift+Tab from Filters reaches the well`,
        wellVisibleAfterShiftTab,
        String(wellVisibleAfterShiftTab),
      );

      await search.click();
      await search.fill("bolt");
      await page.waitForTimeout(400);
      const clearBtn = onPageRole(page, "button", /Clear search/);
      fail(`${width}px · clear button on a filled search`, await clearBtn.count() > 0, String(await clearBtn.count()));
      // Clear back to the full list before scrolling: a narrow "bolt" result set is too
      // short to scroll 3000px, which is what left the rest-offset check measuring nothing.
      await search.fill("");
      await page.waitForTimeout(400);

      // E8 / decision 6 — a change made while scrolled past the head returns to it. A sort
      // change triggers it exactly like a query or a filter, and needs no narrowed list.
      // The rest offset is the head's STATIC `offsetTop` — its position before `position:
      // sticky` starts pinning it — read fresh rather than cached from before the scroll,
      // since nothing about this page moves the head's own static position.
      const restOffset = await page.evaluate(() => {
        const row = document.querySelector("[data-collection-search-row]");
        return row ? row.parentElement.offsetTop : null;
      });
      await page.mouse.wheel(0, 3000);
      // Let the scroll genuinely settle before reading it: a read taken too soon can report
      // the wheel's intended delta rather than the page's own clamped maximum.
      await page.waitForTimeout(500);
      const scrollBeforeEdit = await page.evaluate(() => window.scrollY);
      const sortTrigger = onPageRole(page, "button", /Sort cards/);
      const triggerBefore = await sortTrigger.textContent();
      await sortTrigger.click();
      await page.waitForTimeout(250);
      const sortOption = page.getByRole("dialog").getByRole("option").nth(1);
      const sortOptionText = (await sortOption.count()) ? await sortOption.textContent() : null;
      if (sortOptionText) await sortOption.click();
      await page.waitForTimeout(1000);
      const triggerAfter = await sortTrigger.textContent();
      const scrollAfterEdit = await page.evaluate(() => window.scrollY);
      fail(
        `${width}px · scroll returns to the head's rest offset on a change`,
        restOffset !== null && scrollBeforeEdit > restOffset + 50 && near(scrollAfterEdit, restOffset, 2),
        `rest ${restOffset}, before ${scrollBeforeEdit}, after ${scrollAfterEdit}, ` +
          `trigger ${JSON.stringify(triggerBefore)} → ${JSON.stringify(triggerAfter)} (picked ${JSON.stringify(sortOptionText)})`,
      );

      // H8 / E1 — the sort sheet portals to <body>, never inside the sticky head.
      await sortTrigger.click().catch(() => {});
      await page.waitForTimeout(300);
      const dialog = page.getByRole("dialog").first();
      if (await dialog.count()) {
        const portaledOutside = await dialog.evaluate((el, headEl) => !headEl.contains(el), await head.elementHandle());
        fail(`${width}px · sort sheet portals outside the sticky head`, portaledOutside, String(!portaledOutside));
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      } else {
        fail(`${width}px · sort control opens something`, false, "no dialog found");
      }

      await context.close();
    }

    // E6 — a cookieless first visit's view well follows the CSS `md:` split rather than
    // showing neither segment lit over a view the page is visibly drawing.
    for (const [width, expectLitIndex] of [[390, 0], [1300, 1]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await signIn(page);
      await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const count = await onPage(page, '[aria-label="Rows view"], [aria-label="Grid view"]').count();
      if (count < 2) {
        fail(`${width}px · view well mounted (cookieless)`, false, `${count} buttons found`);
      } else {
        const litLooks = await page.evaluate(() => {
          const rows = document.querySelector('[aria-label="Rows view"]');
          const grid = document.querySelector('[aria-label="Grid view"]');
          const bg = (el) => getComputedStyle(el).backgroundColor;
          return [bg(rows), bg(grid)];
        });
        const transparent = "rgba(0, 0, 0, 0)";
        const litIndex = litLooks.findIndex((c) => c !== transparent && c !== "transparent");
        fail(
          `${width}px · cookieless well paints the ${expectLitIndex === 0 ? "rows" : "grid"} segment`,
          litIndex === expectLitIndex,
          `looks: ${JSON.stringify(litLooks)}`,
        );
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
