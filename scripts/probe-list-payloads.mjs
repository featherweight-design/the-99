// What the three list routes actually put on the wire, and whether /collection's
// modal still works now that it fetches the card it opens.
//
// The two halves belong in one probe because they are the same change: the
// browse list was shrunk by taking the modal's data out of it, so the byte count
// and the modal are the claim and its cost. Neither is reachable from a jsdom
// test — the sizes come from the browser's own resource timings, and the modal's
// data arrives from a server action.
//
// Run by hand with the dev server up:
//   E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app node scripts/probe-list-payloads.mjs
//
// Sizes under `next dev` are uncompressed and larger than production's; the
// figure to read is the ratio between routes and between laps, not the absolute.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

// Localhost runs Clerk's dev instance, where only a `+clerk_test` address can be
// signed in with the fixed code below — said here rather than left to fail
// inside Clerk as a factor mismatch.
if (!EMAIL.includes("+clerk_test@")) {
  throw new Error(
    `E2E_AUDIT_USER_EMAIL must be a Clerk test address (+clerk_test@), got: ${EMAIL}`,
  );
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        if (!factor) {
          const offered = (attempt.supportedFirstFactors ?? []).map((f) => f.strategy);
          return `no email_code factor at ${attempt.status}; offered: ${offered.join(", ") || "none"}`;
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
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

// A browse row, anchored on the "N copies" clause of its accessible name — the
// filter bar's own buttons are also `main button`, and clicking one of those
// silently filters the list instead of opening a card.
const ROW = "main button[aria-label*=' cop']";

/**
 * Every payload the browser fetched for `path` since the timings were last
 * cleared: the document itself and the router's RSC fetches for it, which is
 * the whole cost of arriving there. Read off the browser rather than the
 * request log because only the browser knows the transferred size.
 */
async function payloadsFor(page, path) {
  return page.evaluate((p) => {
    // The document itself is a `navigation` entry, not a `resource` one — and it
    // is the entry that carries the whole list on a cold arrival, so counting
    // only resources would report zero for exactly the case being measured.
    return [
      ...performance.getEntriesByType("navigation"),
      ...performance.getEntriesByType("resource"),
    ]
      .filter((e) => {
        const u = new URL(e.name);
        return u.origin === location.origin && u.pathname === p;
      })
      .map((e) => ({
        url: e.name.replace(location.origin, ""),
        // Uncompressed body size: `next dev` does not compress, and this is the
        // figure the payload work moved. `transferSize` counts headers too and
        // reads as zero for anything served from the memory cache.
        bytes: e.encodedBodySize,
        ms: Math.round(e.duration),
      }))
      .filter((e) => e.bytes > 0);
  }, path);
}

/**
 * Not `networkidle`: the grid loads art for every tile in the window, so the
 * network on `/collection` does not go idle for a minute and the wall clock
 * would report image loading rather than the list. The document and its RSC
 * payloads have all landed by the time the list is on screen.
 */
async function quiet(page) {
  await page.waitForTimeout(500);
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    return await run(browser);
  } finally {
    await browser.close();
  }
}

async function run(browser) {
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const failures = [];
  const check = (ok, claim, detail) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${claim}`);
    if (detail !== undefined) console.log("      ", detail);
    if (!ok) failures.push(claim);
  };

  await signIn(page);

  // ── Half 1: what each route ships, on a cold arrival and on a second visit.
  console.log("\n── payloads ──");
  const routes = [
    ["/collection?view=rows", "/collection", ROW],
    ["/discover", "/discover", "main ul > li h3"],
    ["/commanders", "/commanders", "main ul > li h3"],
  ];
  for (const [url, path, ready] of routes) {
    for (const visit of [1, 2]) {
      const started = Date.now();
      await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(ready, { timeout: 60_000 }).catch(() => {});
      await quiet(page);
      const wall = Date.now() - started;
      const entries = await payloadsFor(page, path);
      const total = entries.reduce((sum, e) => sum + e.bytes, 0);
      console.log(`${path} visit ${visit}: ${kb(total)} over ${entries.length} payload(s), ${wall}ms wall`);
    }
  }

  // ── Half 2: the collection modal, which no longer travels with the list.
  console.log("\n── /collection modal ──");
  await page.goto(`${BASE}/collection?view=rows&sort=name`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(ROW, { timeout: 60_000 });

  await page.locator(ROW).nth(1).click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ timeout: 20_000 }).catch(() => {});
  check(await dialog.isVisible().catch(() => false), "a row click opens the modal");

  const firstTitle = await page.locator("#card-modal-title").textContent().catch(() => null);
  check(Boolean(firstTitle), "the modal names the card", firstTitle);

  // The printings region is the data that stopped travelling with the list, so
  // its presence is the proof the fetch replaced it rather than dropping it.
  const printings = await dialog.textContent().catch(() => "");
  check(/printing/i.test(printings ?? ""), "the fetched card carries its printings");

  await page.waitForFunction(
    () => new URLSearchParams(location.search).has("card"),
    null,
    { timeout: 10_000 },
  ).catch(() => {});
  const cardParam = await page.evaluate(() => new URLSearchParams(location.search).get("card"));
  check(Boolean(cardParam), "the open card is mirrored to ?card=", page.url());

  await page.getByRole("button", { name: "Next card" }).click();
  await page.waitForFunction(
    (before) => (document.querySelector("#card-modal-title")?.textContent ?? "") !== before,
    firstTitle,
    { timeout: 20_000 },
  ).catch(() => {});
  const secondTitle = await page.locator("#card-modal-title").textContent().catch(() => null);
  check(secondTitle !== firstTitle, "Next pages to another card", secondTitle);

  await page.getByRole("button", { name: "Previous card" }).click();
  await page.waitForFunction(
    (want) => (document.querySelector("#card-modal-title")?.textContent ?? "") === want,
    firstTitle,
    { timeout: 20_000 },
  ).catch(() => {});
  check(
    (await page.locator("#card-modal-title").textContent().catch(() => null)) === firstTitle,
    "Previous pages back",
  );

  // The deep link, which is the one path that opens the modal without a click.
  await page.evaluate(() => performance.clearResourceTimings());
  await page.goto(`${BASE}/collection?view=rows&sort=name&card=${cardParam}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('[role="dialog"]').waitFor({ timeout: 30_000 }).catch(() => {});
  const deepTitle = await page.locator("#card-modal-title").textContent().catch(() => null);
  check(deepTitle === firstTitle, "?card= opens that card on arrival", deepTitle);

  // An id the filters exclude is not a card this page is showing, so it must not
  // open — the same gate the pre-fetch modal enforced by looking the id up in
  // the sorted list.
  await page.goto(`${BASE}/collection?view=rows&q=zzzzzzzz&card=${cardParam}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2500);
  check(
    !(await page.locator('[role="dialog"]').isVisible().catch(() => false)),
    "?card= for a filtered-out card opens nothing",
  );

  return failures;
}

main()
  .then((failures) => {
    if (failures.length > 0) {
      console.error(`\n${failures.length} failed: ${failures.join(" · ")}`);
      process.exit(1);
    }
    console.log("\nall checks passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
