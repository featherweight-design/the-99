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
//   PROBE_CARD="<card name>" [PROBE_EXPECT_PRICE="$18.75"] node scripts/probe-card-detail-price.mjs
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
// What the SECOND printing's tag should read, when the operator knows it. Unset by
// default, because the feed is the source of that truth and the browser is not.
const EXPECT = process.env.PROBE_EXPECT_PRICE;
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
      // Both breakpoint trees are mounted at once and separated by CSS, so the
      // first node with a given test id is not necessarily the one being painted —
      // and a hidden one measures zero, which would make every figure below a
      // fiction. The visible one is the placement under test.
      const node = [...document.querySelectorAll(`[data-testid="${id}"]`)]
        .find((n) => n.getBoundingClientRect().width > 0);
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
          // By test id, NOT by `[style*="63/88"]`: Chromium serialises the inline
          // style as `aspect-ratio: 63 / 88`, spaces and all, so that selector
          // matches nothing and the measurement silently became null. Both
          // breakpoint trees are mounted at once, so the visible box is still the
          // one to measure.
          const art = ["modal-art-desktop", "modal-art-mobile"]
            .flatMap((t) => [...document.querySelectorAll(`[data-testid="${t}"]`)])
            .find((n) => n.getBoundingClientRect().width > 0);
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

/**
 * The gap between the art's bottom edge and the tag's top, which is the placement
 * ruling itself. One pixel of tolerance for sub-pixel layout; anything more is the
 * tag having left the art.
 */
function assertGap(where, placement, expected) {
  if (!placement) {
    console.log(`\nFAIL: ${where} drew no price tag at all.`);
    process.exitCode = 1;
    return;
  }
  if (placement.gapFromArt === null || Math.abs(placement.gapFromArt - expected) > 1) {
    console.log(
      `\nFAIL: ${where} tag sits ${placement.gapFromArt}px under the art, expected ${expected}px.`,
    );
    process.exitCode = 1;
  }
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
  const desktop = await readPrice(page);
  console.log(`\n── desktop · ${CARD} ──`);
  console.log(JSON.stringify(desktop, null, 2));
  // The placement is the ruling; a price node that has drifted away from the art
  // satisfies nothing. Table row 1.1: 10px under the art at desktop, 9px at phone.
  assertGap("desktop", desktop.desktop, 10);

  // A pick must move the figure with the art. Same card, different printing.
  const trigger = page.locator('button[aria-label*="printings owned"]').last();
  if (await trigger.count()) {
    await trigger.click();
    // Both breakpoint trees mount a region and both are in the DOM at once,
    // separated by CSS — so an unscoped `[role="radio"]` finds the phone tree's
    // hidden tiles first and Playwright refuses to click one.
    const tiles = page.locator('[role="radio"]:visible');
    const count = await tiles.count();
    if (count > 1) {
      const caption = () =>
        page.locator('button[aria-label*="printings owned"]').last().getAttribute("aria-label");
      const before = { price: (await readPrice(page)).desktop?.text ?? null, caption: await caption() };
      // A pick is a WRITE: `setCardArtPreference` persists (user, oracle) in
      // `card_art_preferences`, so a probe that picks and walks away has changed
      // which printing this account sees everywhere. The tile that was checked on
      // arrival is remembered and restored below.
      const wasChecked = await tiles.evaluateAll((nodes) =>
        nodes.findIndex((n) => n.getAttribute("aria-checked") === "true"),
      );
      try {
        // The first tile that is not already the selected one. Hard-coding index 1
        // clicks the current pick whenever that is the second tile, and then the
        // caption check below fails on a probe that did nothing wrong.
        const target = wasChecked === 1 ? 0 : 1;
        await tiles.nth(target).click();
        await page.waitForTimeout(1_200);
        const after = { price: (await readPrice(page)).desktop?.text ?? null, caption: await caption() };
        console.log("\n── after picking the second printing ──");
        console.log(JSON.stringify({ before, after }, null, 2));
      // What the probe can assert on its own: the pick landed. Whether the FIGURE is
        // right cannot be derived from the page — two printings of one card may
        // legitimately cost the same, so an unchanged number is not evidence either
        // way. Set PROBE_EXPECT_PRICE to what the second printing should read
        // (`$18.75`, `no stock`, or an empty string for silence) and the probe checks
        // it; leave it unset and the pair is printed for a human, with that stated
        // rather than implied.
        if (EXPECT !== undefined) {
          const got = after.price ?? "";
          // An empty EXPECT means silence, and `"anything".includes("")` is true —
          // so the empty case is its own assertion rather than a substring match
          // that can never fail.
          const ok = EXPECT === "" ? after.price === null : got.includes(EXPECT);
          if (!ok) {
            console.log(`\nFAIL: expected the second printing to read ${JSON.stringify(EXPECT)}, got ${JSON.stringify(got)}.`);
            process.exitCode = 1;
          }
        } else {
          console.log(
            "\n(PROBE_EXPECT_PRICE is unset, so the two figures above are a human read." +
              " Only the pick itself was asserted.)",
          );
        }
        if (before.caption === after.caption) {
          console.log("\nFAIL: the pick did not change the resolved printing, so the tag proves nothing.");
          process.exitCode = 1;
        }
      } finally {
        // Put the account back where it was found, including when the read or the
        // assertion above threw. A probe that leaves a preference behind is a probe
        // nobody can run twice and trust the second result.
        if (wasChecked >= 0) {
          await tiles.nth(wasChecked).click();
        } else {
          const forget = page.getByRole("button", { name: /forget|clear/i }).first();
          if (await forget.count()) await forget.click();
        }
        await page.waitForTimeout(1_000);
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
  const phoneRead = await readPrice(phonePage);
  console.log(`\n── phone · ${CARD} ──`);
  console.log(JSON.stringify(phoneRead, null, 2));
  assertGap("phone", phoneRead.mobile, 9);

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
