// Gate 2 for #176: the unowned staple, driven rather than read. Signs in as the
// audit user, opens a deck's Consider tab at three viewports and reports what
// the unowned branch actually rendered — the trailing shelf, the `buy` tags,
// the secondary Add, the toolbar's split provenance line — plus the two states
// the happy path cannot show: a tile whose art failed, and the empty append.
//
// Gate 1 (`scripts/probe-unowned.ts`) proved the branch is reachable in the
// data. This proves it is reachable on screen, which is a different claim: the
// tag spent its whole life nested inside a button whose `aria-label` swallowed
// it, and every unit test passed throughout.
//
// Run by hand: `node scripts/probe-unowned-ui.mjs`. Not part of `pnpm test` —
// it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

// CLERK_SECRET_KEY is asserted but not bound: `clerkSetup()` reads it from the
// environment itself.
const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "iPhone SE · 375x667", width: 375, height: 667 },
  { label: "desktop · 1280x900", width: 1280, height: 900 },
];

// Lifted verbatim from `scripts/probe-bottom.mjs`, which documents at length why
// the hosted portal cannot be driven unattended and `window.Clerk` can.
async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });

  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
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

async function openConsider(page, deckHref) {
  await page.goto(`${BASE}${deckHref}`, { waitUntil: "networkidle" });
  const tab = page.getByRole("tab", { name: /cards to consider/i });
  if ((await tab.count()) > 0) await tab.first().click();
  await page.waitForTimeout(600);
}

async function report(page, label) {
  console.log(`\n=== ${label}`);

  const tags = page.locator("span.sr-only", { hasText: /is not in your collection$/ });
  const tagCount = await tags.count();
  console.log(`  buy tags carrying their sentence as text: ${tagCount}`);
  if (tagCount > 0) {
    const first = tags.first();
    console.log(`    text: ${JSON.stringify(await first.textContent())}`);
    // The defect this gate exists for: a tag inside the art button contributes
    // nothing to any accessible name, and reads as decoration.
    console.log(`    inside a button: ${await first.evaluate((n) => !!n.closest("button"))}`);
    const box = await first.evaluate((n) => {
      const r = n.parentElement.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    console.log(`    box: ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "none"}`);
  }

  const shelf = page.getByText("not in your collection", { exact: false });
  console.log(`  trailing shelf clause on screen: ${(await shelf.count()) > 0}`);

  const provenance = page.getByText(/you don’t own/);
  console.log(
    `  toolbar provenance: ${
      (await provenance.count()) > 0 ? JSON.stringify(await provenance.first().textContent()) : "absent"
    }`,
  );

  // The secondary contract: an unowned tile's Add is a GhostButton, so it must
  // not be wearing the brass fill the owned tile's Add wears.
  const adds = page.getByRole("button", { name: /^Add .+ to deck$/ });
  const addCount = await adds.count();
  console.log(`  Add buttons: ${addCount}`);
  for (let i = 0; i < Math.min(addCount, 8); i += 1) {
    const info = await adds.nth(i).evaluate((node) => {
      const s = getComputedStyle(node);
      return { bg: s.backgroundColor, h: Math.round(node.getBoundingClientRect().height) };
    });
    console.log(`    add[${i}] bg=${info.bg} height=${info.h}`);
  }
}

await clerkSetup();
const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
  const deckHref = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => a.getAttribute("href"))
      .find((href) => /^\/decks\/[0-9a-f-]{36}$/.test(href ?? "")),
  );
  if (!deckHref) {
    console.log("  no deck on this account");
    await context.close();
    continue;
  }

  await openConsider(page, deckHref);
  await report(page, `consider ${deckHref}`);

  // Forced state: the art fails. The marks used to live inside the art branch,
  // so a card rendering the placeholder instead lost its tag entirely.
  await page.route("**/*", (route) =>
    /scryfall|\.jpg|\.png|\.webp/i.test(route.request().url()) ? route.abort() : route.continue(),
  );
  await openConsider(page, deckHref);
  await report(page, "consider · every card image aborted");
  await page.unroute("**/*");

  await context.close();
}

await browser.close();
