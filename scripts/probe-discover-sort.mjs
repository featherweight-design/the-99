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

const names = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("main ul > li h3")].slice(0, 5).map((h) =>
      (h.textContent ?? "").trim(),
    ),
  );

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
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });

  const requests = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/discover") || u.pathname.startsWith("/commanders")) {
      requests.push(`${r.method()} ${u.pathname}${u.search} rsc=${r.headers().rsc ?? "-"}`);
    }
  });

  await signIn(page);
  await page.goto(`${BASE}/discover`, { waitUntil: "networkidle" });
  await page.waitForSelector("main ul > li h3", { timeout: 60_000 });

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
  await page.waitForTimeout(6000);
  const after = await names(page);
  const flipRequests = requests.slice(mark);

  // The claim the defect broke, and the reason it is read off the screen: the
  // URL said `?o=new` throughout, and so did the request. Only the rows lied.
  check(
    JSON.stringify(before) !== JSON.stringify(after),
    "Something new puts a different ranking on screen",
    after,
  );
  check(page.url().endsWith("?o=new"), "the flip writes ?o=new", page.url());
  check(flipRequests.length === 1, "the flip costs exactly one payload", flipRequests);

  const mark2 = requests.length;
  await pick(page, "Best fit");
  await page.waitForTimeout(4000);
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
  const go = async (label) => {
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await page.waitForTimeout(3500);
  };
  for (const lap of [1, 2]) {
    const mark3 = requests.length;
    await go("Commanders");
    await go("Discover");
    console.log(`lap ${lap} (reported, not asserted):`, requests.slice(mark3));
  }

  await browser.close();

  if (failures.length > 0) {
    console.error(`\n${failures.length} failed: ${failures.join(" · ")}`);
    process.exit(1);
  }
  console.log("\nall checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
