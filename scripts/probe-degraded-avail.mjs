// Gate 2 for #43 Task 7: the degraded banner, driven rather than read.
//
// Three things a component test cannot settle:
//
//   1. ONE banner, not two. The `both` variant is a render-time choice, but
//      "there is exactly one amber box on the page" is a fact about the page.
//   2. The banner and the struck segment have to appear TOGETHER. They are
//      wired in two different places off one flag, and the failure mode is that
//      a control goes dead with nothing on screen saying why.
//   3. `?avail=free` arriving on a degraded load must render as `all` — the URL
//      is a request, not a promise, and this is the only way to see the page
//      answer a request it cannot honour.
//
// Run by hand after forcing the read to fail:
//
//   cp src/lib/decks/availability-query.ts /tmp/aq.bak
//   # add `throw new Error("probe");` as the first line of loadAvailability
//   pnpm dev &  node scripts/probe-degraded-avail.mjs
//   cp /tmp/aq.bak src/lib/decks/availability-query.ts
//
// That seam stays UNCOMMITTED: a test hook on a production path costs more than
// a two-line edit for the length of one run. Set PROBE_BASE if dev is not on 3000.
import { config } from "dotenv";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";

// Loaded here rather than sourced. `--env-file`, `set -a; . ./.env` and
// `export $(grep …)` all choke on this file's special characters, and each one
// fails by leaving the vars UNSET, which reads as "creds not configured".
//
// `override` is load-bearing. An inherited shell can carry another project's
// `E2E_AUDIT_USER_EMAIL`, and the failure then looks like a Clerk problem
// ("Couldn't find your account") rather than the wrong account.
config({ path: new URL("../.env", import.meta.url), override: true, quiet: true });

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const EMAIL = process.env.E2E_AUDIT_USER_EMAIL;
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const SECRET = process.env.CLERK_SECRET_KEY;
if (!EMAIL || !PASSWORD || !SECRET) {
  throw new Error("Set E2E_AUDIT_USER_EMAIL, E2E_AUDIT_USER_PASSWORD, CLERK_SECRET_KEY.");
}

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

// Lifted verbatim from `scripts/probe-rank-toggle.mjs`, which documents at
// length why the hosted portal cannot be driven unattended and `window.Clerk` can.
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

// Counted by the amber left border, which is what makes the box read as a
// banner at a glance. Two matches is the mobile/desktop pair of ONE banner;
// four would be the stacking bug.
async function banners(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("div")]
      .filter((n) => getComputedStyle(n).borderLeftColor === "rgb(224, 145, 60)")
      .map((n) => {
        const r = n.getBoundingClientRect();
        return {
          visible: r.width > 0 && r.height > 0,
          w: Math.round(r.width),
          text: (n.textContent ?? "").trim().slice(0, 90),
        };
      }),
  );
}

async function segments(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[role='radio']")].map((n) => ({
      label: n.getAttribute("aria-label"),
      checked: n.getAttribute("aria-checked"),
      disabled: n.getAttribute("aria-disabled"),
      line: getComputedStyle(n).textDecorationLine,
    })),
  );
}

const retries = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("button[type='submit']")]
      .filter((n) => /retry/i.test(n.textContent ?? ""))
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { text: (n.textContent ?? "").trim(), visible: r.width > 0 && r.height > 0 };
      }),
  );

await clerkSetup();
const browser = await chromium.launch();

for (const { label, width, height } of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n########## ${label}`);

  // A plain load first, then the same page asked for a mode it cannot serve.
  for (const path of ["/commanders", "/commanders?avail=free"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    console.log(`  ── ${path}`);
    for (const b of await banners(page)) console.log(`    banner:  ${JSON.stringify(b)}`);
    for (const s of await segments(page)) console.log(`    segment: ${JSON.stringify(s)}`);
    console.log(`    retries: ${JSON.stringify(await retries(page))}`);
    console.log(`    overflow: ${await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);
  }

  await context.close();
}

await browser.close();
