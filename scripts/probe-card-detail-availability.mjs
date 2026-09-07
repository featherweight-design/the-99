// The card modal's availability block, opened from a deck rather than from
// /collection. `/collection` joins availability onto its own rows, so the block
// was only ever reachable there; every other surface holds an oracle id alone
// and opened the same card with the block missing. This drives both routes and
// prints what each rendered, so the two can be read against each other.
//
// Run by hand with the dev server up:
//   PROBE_DECK=<deck id> PROBE_CARD="<card name>" node scripts/probe-card-detail-availability.mjs
// Point PROBE_DECK at a deck that claims cards the signed-in account owns —
// a brew is enough, a claim is what makes the block render — and PROBE_CARD at
// a card on that deck's list. Not part of
// `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK;
// A card the account both owns and has claimed on that deck. Neither half is
// optional: an unclaimed card has nothing to report, and a card the account does
// not own has no availability row at all, so either would read as a blank block
// and prove nothing.
const CARD = process.env.PROBE_CARD;
if (!DECK || !CARD) throw new Error("Set PROBE_DECK and PROBE_CARD.");

// Lifted from `scripts/probe-availability-ui.mjs`, which documents at length why
// the hosted portal cannot be driven unattended and `window.Clerk` can.
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

/** The modal's heading, and the availability block if one rendered. */
async function readModal(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { open: false };
    // The block is headed "In your collection" (availabilityCopy.collection
    // .detailHeading), not "Availability".
    const blocks = [...dialog.querySelectorAll("div")].filter((n) =>
      /^in your collection/i.test((n.textContent ?? "").trim()),
    );
    // Outermost match is the block itself; its inner matches are the heading and
    // the wrappers between, each of which starts with the same words.
    const block = blocks[0];
    return {
      open: true,
      text: (dialog.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
      inYourCollection: block ? (block.textContent ?? "").replace(/\s+/g, " ").trim() : null,
    };
  });
}

// The two surfaces do not share a trigger — /collection's row is a button in its
// own right, the decklist wraps the name in a CardDetailTrigger — which is the
// other half of what this batch is about.
async function openFirstCard(page, selector) {
  const trigger = page.locator(selector).first();
  const name = await trigger.getAttribute("aria-label");
  await trigger.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 15_000 });
  // The fetch lands after the trigger's click, so give the block a beat to arrive.
  await page
    .waitForFunction(
      () => /in your collection/i.test(document.querySelector('[role="dialog"]')?.textContent ?? ""),
      null,
      { timeout: 10_000 },
    )
    .catch(() => {});
  return name;
}

const browser = await chromium.launch();
try {
  await clerkSetup();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);

  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "domcontentloaded" });
  await openFirstCard(page, `button[aria-label="View details for ${CARD}"]`);
  console.log(`\n── deck decklist · ${CARD} ──`);
  console.log(JSON.stringify(await readModal(page), null, 2));

  // Same card on the other surface, so the two blocks can be compared rather
  // than two different cards' blocks.
  // `view=rows` because the desktop default is the tile grid, whose tile carries
  // no aria-label to find the card by.
  await page.goto(`${BASE}/collection?view=rows&q=${encodeURIComponent(CARD)}`, {
    waitUntil: "domcontentloaded",
  });
  await openFirstCard(page, `button[aria-label^="${CARD},"]`);
  console.log(`\n── /collection · ${CARD} ──`);
  console.log(JSON.stringify(await readModal(page), null, 2));
  await context.close();
} finally {
  await browser.close();
}
