// Opens the life tracker's setup for a four-seat table at phone width and at both tablet widths and reads the Table
// arrangements each offers (the radio group's labels). Hugh's ruling: layouts are the same on every device, so every
// width must offer the same arrangements, by the same names.
// It only reads: setup writes nothing until Start. The audit account must sit at the table
// (`scripts/seed-rule-zero-fixture.mts`'s S4); production and staging are refused.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-layout-parity.mjs
// Optional: SETUP_TABLE (default the fixture's S4).
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL", "CLERK_SECRET_KEY"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const TABLE = process.env.SETUP_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const WIDTHS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 } },
  { label: "tablet 1024x768", viewport: { width: 1024, height: 768 } },
  { label: "tablet 820x1180", viewport: { width: 820, height: 1180 } },
];

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
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

const [{ branch } = {}] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:tracker-layout-parity");

await clerkSetup();
const browser = await chromium.launch();
const offered = new Map();
try {
  for (const { label, viewport } of WIDTHS) {
    const context = await browser.newContext({ viewport, hasTouch: true });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "networkidle", timeout: 180_000 });
    const group = page.getByRole("radiogroup").first();
    await group.waitFor({ timeout: 30_000 });
    const names = await group.getByRole("radio").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    offered.set(label, names);
    console.log(`${label}: ${names.length} arrangement(s): ${names.join(" | ")}`);
    await context.close();
  }
} finally {
  await browser.close();
}
const [base, ...rest] = [...offered.entries()];
for (const [label, names] of rest) {
  report(`${label} offers what ${base[0]} offers`, names.length === base[1].length && names.every((n) => base[1].includes(n)), `${names.length} vs ${base[1].length}`);
}
report("a four-seat table offers more than one arrangement on every device", [...offered.values()].every((n) => n.length >= 2));
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exitCode = failures ? 1 : 0;
