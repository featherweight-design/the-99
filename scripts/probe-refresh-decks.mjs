// Gate for PR D of the UI refresh: the rebuilt /decks index — art tiles, the
// desktop filter column, the phone filter sheet, the sort menu and the URL the
// three of them write.
//
// JSDOM has no layout and no history, so the unit tests prove the markup and
// say nothing about whether the tile's grid puts the detail figure where the
// frames put it, whether the column is actually hidden at 390, or whether a
// reload of a filtered URL paints filtered. That is what this probe is for. It
// also writes a screenshot per viewport for the design review.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-refresh-decks.mjs
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

// One tile, read as computed style rather than asserted from class strings the
// unit tests already cover. The grid areas are the point: the phone and the
// desktop put the same nodes in different cells, and that is the one thing
// JSDOM cannot see.
const READ_TILE = `() => {
  const px = (v) => Math.round(parseFloat(v));
  const tile = document.querySelector('article');
  if (!tile) return null;
  const art = tile.querySelector('[data-deck-art]');
  const bar = tile.querySelector('[data-deck-bar]');
  const fill = tile.querySelector('[data-deck-bar-fill]');
  const body = bar?.parentElement;
  const box = tile.getBoundingClientRect();
  const cell = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    return { x: Math.round(r.x - b.x), y: Math.round(r.y - b.y), w: Math.round(r.width) };
  };
  const spans = [...(body?.querySelectorAll(':scope > span') ?? [])];
  return {
    tile: { w: Math.round(box.width), h: Math.round(box.height),
            radius: getComputedStyle(tile).borderTopLeftRadius },
    artHeight: art ? px(getComputedStyle(art).height) : null,
    barHeight: bar ? px(getComputedStyle(bar).height) : null,
    fillWidthPct: fill && bar
      ? Math.round((fill.getBoundingClientRect().width / bar.getBoundingClientRect().width) * 100)
      : null,
    gridAreas: getComputedStyle(body).gridTemplateAreas,
    // Every visible span in the body, in visual order, so the detail figure's
    // cell can be compared against the frames rather than counted.
    cells: spans
      .filter((s) => s.getBoundingClientRect().width > 0)
      .map((s) => ({
        text: (s.textContent ?? '').trim().slice(0, 24),
        size: getComputedStyle(s).fontSize,
        color: getComputedStyle(s).color,
        ...cell(s),
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x),
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
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    const r = { viewport: vp.label };
    r.tiles = await page.evaluate(() => document.querySelectorAll("article").length);
    r.tile = await page.evaluate(`(${READ_TILE})()`);
    // The column is desktop-only and the sheet trigger is phone-only. Read both
    // at both sizes: a control drawn at the wrong breakpoint is exactly the
    // failure two rendered subtrees hide from JSDOM.
    r.columnVisible = await page.evaluate(
      () => !!document.querySelector('[data-filter-column]')?.getClientRects().length,
    );
    r.controls = await page.evaluate(() =>
      [...document.querySelectorAll("main button, main a")]
        .filter((b) => b.getClientRects().length)
        .map((b) => ({
          name: (b.getAttribute("aria-label") ?? b.textContent ?? "").trim().slice(0, 32),
          h: Math.round(b.getBoundingClientRect().height),
        }))
        .slice(0, 14),
    );
    // The count line the header prints, which is the figure every filter below
    // has to keep honest.
    r.countLine = await page.evaluate(() => {
      const el = [...document.querySelectorAll("main p, main span")].find((n) =>
        /\d+\s+(deck|of)\b/.test(n.textContent ?? ""),
      );
      return el ? el.textContent.trim().slice(0, 60) : null;
    });

    await page.screenshot({ path: `/tmp/refresh-decks-${vp.label}.png`, fullPage: false });

    // The phone's filters live in a sheet that is unmounted at rest, so the
    // round trip below cannot start until it is open, and a reload closes it
    // again. On desktop the column is already on screen and `openSheet` is a
    // no-op.
    const openSheet = async (shot) => {
      const trigger = page.getByRole("button", { name: "Filter decks" });
      if (!(await trigger.isVisible().catch(() => false))) return;
      await trigger.click();
      await page.waitForTimeout(300);
      if (shot) await page.screenshot({ path: shot });
    };
    await openSheet(`/tmp/refresh-decks-${vp.label}-sheet.png`);

    // Filter, then read the URL and the count back. `Draft` is drawn whether or
    // not any deck has it, so the assertion is the round trip, not the tally.
    const box = page.getByRole("checkbox", { name: "Draft" }).first();
    if (await box.isVisible().catch(() => false)) {
      await box.click();
      await page.waitForTimeout(300);
      r.afterTick = {
        url: new URL(page.url()).search,
        tiles: await page.evaluate(() => document.querySelectorAll("article").length),
        chips: await page.evaluate(
          () =>
            [...document.querySelectorAll("button")]
              .filter((b) => /×|✕/.test(b.textContent ?? ""))
              .length,
        ),
      };
      // A reload of the filled URL must paint filtered on the first frame,
      // which is the whole reason the view seeds from `useSearchParams`.
      await page.reload({ waitUntil: "networkidle" });
      r.afterReload = {
        url: new URL(page.url()).search,
        tiles: await page.evaluate(() => document.querySelectorAll("article").length),
      };
      await page.screenshot({ path: `/tmp/refresh-decks-${vp.label}-filtered.png` });
      await openSheet(null);
      r.afterReload.checked = await page
        .getByRole("checkbox", { name: "Draft" })
        .first()
        .isChecked();
      // Clearing must leave no `?` behind: the clean URL is the clean state.
      // Scoped to the sheet when there is one: the chip row above the grid
      // carries its own Clear, and on the phone that one sits under the sheet's
      // scrim, where a click cannot reach it.
      const sheet = page.getByRole("dialog");
      const scope = (await sheet.isVisible().catch(() => false)) ? sheet : page;
      await scope.getByRole("button", { name: "Clear" }).first().click();
      await page.waitForTimeout(300);
      r.afterClear = { url: new URL(page.url()).search };
    }

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
