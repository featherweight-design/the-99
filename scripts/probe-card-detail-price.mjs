// The price under the art in the card modal (card-detail R2, table §1 and §2).
//
// What a browser proves and a test cannot: that the tag paints at all, WHERE it sits
// relative to the art it belongs to (10px under at desktop, 9px at phone), and that
// the compact header — the one state R1 did not draw — moves the figure out of the
// art without sealing it inside the aria-hidden heading.
//
// It makes no writes. It used to pick a different printing to prove the figure
// follows the art; that is proved by `card-modal-price.test.tsx` instead, and picking
// persists an art preference on the account being probed. See the note at the pick
// site below.
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
  // A role locator with an escaped pattern, not an interpolated attribute selector:
  // a card name carrying a quote, a bracket or a backslash would make that selector
  // invalid or change what it means, and the probe would fail before opening anything.
  const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`);
  await page.getByRole("button", { name: pattern }).first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 15_000 });
  // The card is fetched on click and the price rides that fetch, so the modal opens
  // before it has either. Waited for, not slept through: a fixed delay turns a slow
  // Neon response into a false failure, and the art box is the right thing to wait
  // on because it arrives with the card whether or not the card has a price —
  // waiting for the tag itself would hang on every silent state.
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('[data-testid^="modal-art-"]')]
        .some((n) => n.getBoundingClientRect().width > 0),
      null,
      { timeout: 15_000 },
    );
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

  // WHAT THIS PROBE DELIBERATELY DOES NOT DO: pick a different printing.
  //
  // It used to. Selecting a tile is a WRITE — `setCardArtPreference` persists
  // (user, oracle) — so the probe had to choose an unselected tile, remember the
  // old one, restore it in a `finally`, and find the right reset control when
  // there had been no pick at all. Six review rounds went into that machinery, on
  // a hand-run script, to prove something a unit test already proves: the modal's
  // tag follows the resolved printing (`card-modal-price.test.tsx`, mutation-checked
  // by reverting `priceFor` and watching eight cases fail).
  //
  // What a browser proves and a test cannot is what is on this page: that the tag
  // paints, where it sits relative to the art, and that the compact placement is
  // not sealed inside the aria-hidden heading. That is all this probe claims now,
  // and it makes no writes at all.

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
    // Same reason as the open above: waited for, not slept through. The compact
    // header is the state being measured, so the wait is for the thumb collapsing.
    await phonePage
      .waitForFunction(
        () => {
          const art = document.querySelector('[data-testid="modal-art-mobile"]');
          return art !== null && art.getBoundingClientRect().width < 100;
        },
        null,
        { timeout: 10_000 },
      )
      .catch(() => {});
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
