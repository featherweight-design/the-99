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

  const before = await names(page);
  console.log("URL       :", page.url());
  console.log("bestfit   :", before);

  const mark = requests.length;
  await pick(page, "Something new");
  await page.waitForTimeout(6000);
  const after = await names(page);
  console.log("URL       :", page.url());
  console.log("new       :", after);
  console.log("identical :", JSON.stringify(before) === JSON.stringify(after));
  console.log("requests  :", requests.slice(mark));

  const mark2 = requests.length;
  await pick(page, "Best fit");
  await page.waitForTimeout(4000);
  console.log("back      :", await names(page));
  console.log("requests  :", requests.slice(mark2));

  // Route round-trip through the in-app nav, which is what the client router
  // cache actually governs — `page.goto` is a document load and bypasses it.
  const go = async (label) => {
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await page.waitForTimeout(3500);
  };
  const mark3 = requests.length;
  await go("Commanders");
  await go("Discover");
  console.log("lap 1     :", requests.slice(mark3));
  const mark4 = requests.length;
  await go("Commanders");
  await go("Discover");
  console.log("lap 2     :", requests.slice(mark4));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
