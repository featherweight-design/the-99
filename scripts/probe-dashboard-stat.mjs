// #14 gate: the dashboard's commanders stat, driven rather than read. Reports
// the visible half of the greeting stats line and every row of the collection
// stats panel, at both widths, so the streamed figure can be checked against
// what /commanders reports for the same account.
//
// Run by hand: `node scripts/probe-dashboard-stat.mjs`. Not part of `pnpm test`:
// it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

// Lifted from `scripts/probe-rollup-ui.mjs`, which documents at length why the
// hosted portal cannot be driven unattended and `window.Clerk` can.
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

// Only the visible half: both breakpoint variants of the stats line are in the
// DOM at all times, so reading text content alone reports the desktop copy
// while looking at a phone.
async function readDashboard(page) {
  return page.evaluate(() => {
    const visible = (n) => n.getClientRects().length > 0;
    const statsLine = [...document.querySelectorAll("p span")]
      .filter((n) => visible(n) && /cards ·/.test(n.textContent ?? ""))
      .map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim());
    const panelRows = [...document.querySelectorAll("aside div")]
      .filter((n) => visible(n) && n.children.length === 2)
      .map((n) => {
        const [label, value] = n.children;
        return {
          label: (label.textContent ?? "").trim(),
          value: (value.textContent ?? "").trim(),
          colour: getComputedStyle(value).color,
        };
      });
    return { statsLine, panelRows };
  });
}

// The dashboard stat claims to be the same figure /commanders reports, which is
// why it borrows that surface's noun. Read the subtitle so the claim is checked
// rather than asserted.
async function readCommandersSubtitle(page) {
  return page.evaluate(
    () =>
      [...document.querySelectorAll("p")]
        .map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim())
        .find((t) => /commanders you own/.test(t)) ?? null,
  );
}

const browser = await chromium.launch();
try {
  await clerkSetup();
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    // The count streams, so the em-dash placeholder is a legitimate first paint.
    // Wait for it to resolve rather than reporting the fallback as the answer.
    await page
      .waitForFunction(
        () => !/·\s*—\s*commanders/.test(document.body.textContent ?? ""),
        null,
        { timeout: 30_000 },
      )
      .catch(() => {});
    console.log(`\n── ${viewport.label} ──`);
    console.log(JSON.stringify(await readDashboard(page), null, 2));
    await page.goto(`${BASE}/commanders`, { waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(() => /commanders you own/.test(document.body.textContent ?? ""), null, {
        timeout: 60_000,
      })
      .catch(() => {});
    console.log(`/commanders: ${await readCommandersSubtitle(page)}`);
    await context.close();
  }
} finally {
  await browser.close();
}
