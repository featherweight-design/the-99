// The gate for the discover lane's ranking flip: does choosing `Something new`
// in the Order control actually put the novelty ranking on screen, does flipping
// back to `Best fit` cost a request, and how many payloads does a lap between
// the two lanes fetch?
//
// It exists because no jsdom test can hold this. The defect it was written for
// was a race between two URL writers — the rack's `history.replaceState` mirror
// and the router's own `replace` — and under a mocked router the transition
// settles instantly, so the race never happens and the suite stays green while
// the app is broken. The whole suite did pass across the fix.
//
// Reads the ranking off the screen rather than the URL: the URL was correct
// throughout, which is what made the defect look like a server problem.
//
// Run by hand: `E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app node scripts/probe-discover-sort.mjs`
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

// Said at startup rather than left to fail inside Clerk. Localhost runs Clerk's
// dev instance, where only a `+clerk_test` address can be signed in with the
// fixed code below; a real one reaches sign-in, is offered `password` instead of
// `email_code`, and reports a factor mismatch that reads like an instance
// misconfiguration rather than the wrong identity.
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
        // Naming what WAS offered, because the two ways this fails need opposite
        // repairs: a `+clerk_test` address the instance has never seen offers
        // nothing at all, and a real one offers `password` instead.
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

// The top of the list, which is where a change of ranking shows. Read as the
// probe's one observation of the screen, and the only thing the flip assertions
// are made about.
const ROWS = "main ul > li h3";

const names = (page) =>
  page.$$eval(ROWS, (nodes) => nodes.slice(0, 5).map((h) => (h.textContent ?? "").trim()));

/**
 * Settle on the rows the next assertion is about rather than on a clock: `want`
 * is whether they should end up equal to `reference` or different from it.
 *
 * A timeout is swallowed deliberately. The assertion that follows reports what
 * is actually on screen, and a probe that threw here would name a wait it ran
 * out of instead of the defect that caused it.
 */
async function settle(page, reference, want) {
  await page
    .waitForFunction(
      ({ selector, ref, want: matches }) => {
        const rows = [...document.querySelectorAll(selector)]
          .slice(0, 5)
          .map((h) => (h.textContent ?? "").trim());
        return rows.length > 0 && (JSON.stringify(rows) === ref) === matches;
      },
      { selector: ROWS, ref: JSON.stringify(reference), want },
      { timeout: 20_000 },
    )
    .catch(() => {});
}

/**
 * Let the request log go quiet before it is counted — a request not yet made
 * cannot be counted, and the counts here are the assertions.
 *
 * Quiet is measured against this probe's own log rather than the whole network,
 * which never settles under `next dev`.
 */
async function quiet(page, log) {
  for (let seen = -1; seen !== log.length; ) {
    seen = log.length;
    await page.waitForTimeout(700);
  }
}

async function pick(page, label) {
  await page.locator("main button, header button").filter({ hasText: /^Order · / }).first().click();
  await page
    .getByRole("menuitemradio", { name: label })
    .or(page.getByRole("radio", { name: label }))
    .first()
    .click();
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

  // Navigational RSC payloads only. The counts below are claims about what a
  // flip costs in list data, so document loads, static assets and speculative
  // prefetches on the same paths would all inflate them without the reader
  // having asked for anything.
  const requests = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    const lane = u.pathname.startsWith("/discover") || u.pathname.startsWith("/commanders");
    const prefetch = r.headers()["next-router-prefetch"] === "1";
    if (lane && u.searchParams.has("_rsc") && !prefetch) {
      requests.push(`${r.method()} ${u.pathname}${u.search}`);
    }
  });

  await signIn(page);
  await page.goto(`${BASE}/discover`, { waitUntil: "networkidle" });
  await page.waitForSelector(ROWS, { timeout: 60_000 });

  const failures = [];
  const check = (ok, claim, detail) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${claim}`);
    if (detail !== undefined) console.log("      ", detail);
    if (!ok) failures.push(claim);
  };

  const before = await names(page);
  check(before.length > 0, "the fit ranking renders rows", before);

  const mark = requests.length;
  await pick(page, "Something new");
  await settle(page, before, false);
  await quiet(page, requests);
  const after = await names(page);
  const flipRequests = requests.slice(mark);

  // The claim the defect broke, and the reason it is read off the screen: the
  // URL said `?o=new` throughout, and so did the request. Only the rows lied.
  check(
    JSON.stringify(before) !== JSON.stringify(after),
    "Something new puts a different ranking on screen",
    after,
  );
  check(
    new URL(page.url()).searchParams.get("o") === "new",
    "the flip writes o=new",
    page.url(),
  );
  check(flipRequests.length === 1, "the flip costs exactly one payload", flipRequests);

  const mark2 = requests.length;
  await pick(page, "Best fit");
  await settle(page, before, true);
  await quiet(page, requests);
  const back = await names(page);
  const backRequests = requests.slice(mark2);
  // A ranking this visit has already been served comes back out of
  // `useDiscoveryCache`, so flipping back is not a request.
  check(
    JSON.stringify(back) === JSON.stringify(before),
    "flipping back restores the fit ranking",
    back,
  );
  check(backRequests.length === 0, "flipping back costs no payload", backRequests);

  // Route round-trip through the in-app nav, which is what the client router
  // cache actually governs — `page.goto` is a document load and bypasses it.
  // Reported rather than asserted: closing this is an open design decision, and
  // a check would fail every run until it is made.
  const go = async (path, label) => {
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await page.waitForURL((url) => url.pathname === path, { timeout: 20_000 }).catch(() => {});
    await page.waitForSelector(ROWS, { timeout: 20_000 }).catch(() => {});
    await quiet(page, requests);
  };

  for (const lap of [1, 2]) {
    const mark3 = requests.length;
    await go("/commanders", "Commanders");
    await go("/discover", "Discover");
    console.log(`lap ${lap} (reported, not asserted):`, requests.slice(mark3));
  }

  return failures;
}

// Reported out here rather than in `run`, because `process.exit` skips the
// `finally` that closes the browser and would leave Chromium running on every
// failing run — the runs where a stray process is least welcome.
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
