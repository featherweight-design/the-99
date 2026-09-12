// The price under the art in the card modal (card-detail R2, table §1 and §2).
//
// Counting the node proves it painted; it does not prove the figure belongs to the
// printing on screen. So this probe PICKS — it opens the printing region, clicks a
// different printing, and reads the tag again — which is the only way to see the
// four-things-move-together rule hold or fail. It also forces the compact header,
// the one state R1 did not draw, and checks the figure is not sealed inside the
// aria-hidden heading there.
//
// Run by hand with the dev server up:
//   PROBE_CARD="<card name>" node scripts/probe-card-detail-price.mjs
// Point PROBE_CARD at a card the signed-in account owns in MORE THAN TWELVE
// printings — `OVERFLOW_THRESHOLD` is 12 and the header collapses only past it, so
// a card owned in two opens the picker and never reaches the compact state. A basic
// land is the reliable choice. The probe fails rather than passes quietly if the
// card it is pointed at cannot reach that state.
// Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const CARD = process.env.PROBE_CARD;
if (!CARD) throw new Error("Set PROBE_CARD to a card the account owns.");

// Lifted from `scripts/probe-card-detail-availability.mjs`, which documents at
// length why the hosted portal cannot be driven unattended and `window.Clerk` can.
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
 * What each placement is showing, and — for the compact one — whether assistive
 * tech can reach it. `aria-hidden` is asked of the ANCESTOR chain rather than the
 * node, because the trap is a heading wrapper, not the tag itself.
 */
async function readPrice(page) {
  return page.evaluate(() => {
    const read = (id) => {
      const node = document.querySelector(`[data-testid="${id}"]`);
      if (!node) return null;
      const tag = node.querySelector("span[class*='font-mono']") ?? node;
      const style = getComputedStyle(tag);
      return {
        text: (node.textContent ?? "").trim(),
        ink: style.color,
        border: style.border,
        hiddenFromScreenReaders: Boolean(node.closest("[aria-hidden='true']")),
        // The gap between the art and the tag, measured rather than asserted from
        // the class list — a margin a sibling collapses is a margin that is not there.
        gapFromArt: (() => {
          const art = document.querySelector('[role="dialog"] [style*="63/88"]');
          if (!art) return null;
          return Math.round(node.getBoundingClientRect().top - art.getBoundingClientRect().bottom);
        })(),
      };
    };
    return {
      desktop: read("modal-price-desktop"),
      mobile: read("modal-price-mobile"),
      compact: read("modal-price-compact"),
    };
  });
}

async function openCard(page, name) {
  await page.goto(`${BASE}/collection?view=rows&q=${encodeURIComponent(name)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(`button[aria-label^="${name},"]`).first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 15_000 });
  // The card is fetched on click, and the price rides that fetch.
  await page.waitForTimeout(1_500);
}

const browser = await chromium.launch();
try {
  await clerkSetup();

  // ── desktop ──────────────────────────────────────────────────────────────
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);
  await openCard(page, CARD);
  console.log(`\n── desktop · ${CARD} ──`);
  console.log(JSON.stringify(await readPrice(page), null, 2));

  // A pick must move the figure with the art. Same card, different printing.
  const trigger = page.locator('button[aria-label*="printings owned"]').last();
  if (await trigger.count()) {
    await trigger.click();
    const tiles = page.locator('[role="radio"]');
    const count = await tiles.count();
    if (count > 1) {
      const caption = () =>
        page.locator('button[aria-label*="printings owned"]').last().getAttribute("aria-label");
      const before = { price: (await readPrice(page)).desktop?.text ?? null, caption: await caption() };
      await tiles.nth(1).click();
      await page.waitForTimeout(1_200);
      const after = { price: (await readPrice(page)).desktop?.text ?? null, caption: await caption() };
      console.log("\n── after picking the second printing ──");
      console.log(JSON.stringify({ before, after }, null, 2));
      // What can be asserted without knowing the feed: the pick landed, and the tag
      // was re-resolved rather than left behind as a node from the previous printing.
      // Whether the FIGURE differs is not assertable here — two printings of one card
      // may legitimately cost the same — so the two are printed for a human to read
      // against each other, and only the pick itself fails the probe.
      if (before.caption === after.caption) {
        console.log("\nFAIL: the pick did not change the resolved printing, so the tag proves nothing.");
        process.exitCode = 1;
      }
    } else {
      console.log("\n(only one printing owned — the pick check needs a card with several)");
    }
  }
  await context.close();

  // ── phone, including the compact header ──────────────────────────────────
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phonePage = await phone.newPage();
  await signIn(phonePage);
  await openCard(phonePage, CARD);
  console.log(`\n── phone · ${CARD} ──`);
  console.log(JSON.stringify(await readPrice(phonePage), null, 2));

  const phoneTrigger = phonePage.locator('button[aria-label*="printings owned"]').first();
  if (await phoneTrigger.count()) {
    await phoneTrigger.click();
    await phonePage.waitForTimeout(800);
    const compact = await readPrice(phonePage);
    console.log("\n── phone · printing region open (compact header past 12 entries) ──");
    console.log(JSON.stringify(compact, null, 2));
    // A missing compact result is a failure, not a pass. The header collapses only
    // past OVERFLOW_THRESHOLD entries, so a null here means either the card has too
    // few printings to reach the state — in which case the probe was pointed at the
    // wrong card and proves nothing — or the placement did not render at all.
    if (!compact.compact) {
      console.log(
        "\nFAIL: no compact price. Either the tag did not render, or PROBE_CARD is owned" +
          " in too few printings to collapse the header (it needs more than 12).",
      );
      process.exitCode = 1;
    } else if (compact.compact.hiddenFromScreenReaders) {
      console.log("\nFAIL: the figure is inside the aria-hidden heading (erratum E10).");
      process.exitCode = 1;
    }
  } else {
    console.log("\nFAIL: no printing picker. PROBE_CARD must be owned in several printings —" +
      " more than twelve to reach the compact header, which is what a basic land is for.");
    process.exitCode = 1;
  }
  await phone.close();
} finally {
  await browser.close();
}
