// An owned set cell shows its price in every sort (bug batch D item 1, Hugh 2026-10-13), at both widths.
//
// Until #1669 an owned cell drew no figure at all, and that change drew it only under Sort by cost, so on
// the default Number order the missing cells carried a price and the owned ones carried none. JSDOM cannot
// say what a cell draws once the page has hydrated with real prices, so this reads the cells the page
// drew: every owned cell's accessible name is built from the same price the visible figure is, so a name
// with no figure is a cell with none. It looks at the first sets of the reader's own index until one holds
// an owned card, and reports which.
//
//   PROBE_BASE=http://localhost:3000 node scripts/probe-set-owned-price.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1300, height: 900 },
];

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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
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

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      hasTouch: w.name === "phone",
      isMobile: w.name === "phone",
    });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/collection/sets`, { waitUntil: "domcontentloaded" });
    await onPage(page, 'a[href^="/collection/sets/"]').first().waitFor({ timeout: 30_000 });
    const hrefs = await onPage(page, 'a[href^="/collection/sets/"]').evaluateAll((as) =>
      [...new Set(as.map((a) => a.getAttribute("href")))].slice(0, 12),
    );
    let found = false;
    for (const href of hrefs) {
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      const cells = onPage(page, 'button[aria-label*="in your collection"]');
      await cells.first().waitFor({ timeout: 30_000 }).catch(() => {});
      const names = await cells.evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")));
      const owned = names.filter((n) => !/not in your collection/.test(n));
      if (owned.length === 0) continue;
      found = true;
      // The default order is Number: a sort that is NOT price, which is the case that was missing.
      const bare = owned.filter((n) => !/\$\d|no stock/.test(n));
      check(bare.length === 0, `${w.name} ${href}: every owned cell names its price in Number order`, `${owned.length} owned, ${bare.length} without a figure${bare[0] ? `, e.g. "${bare[0]}"` : ""}`);
      break;
    }
    if (!found) check(false, `${w.name}: a set with an owned card exists to measure`, `looked at ${hrefs.length} sets`);
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
