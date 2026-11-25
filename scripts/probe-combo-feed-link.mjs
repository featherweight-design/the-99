// Collection quick filters, PR 5: a new-combo feed item's See your combos press, pressed for real on Home at phone, tablet
// and desktop widths.
//
// Seed first (writes one marked feed row for the audit account, local-dev): `pnpm tsx scripts/seed-combo-feed-fixture.mts`,
// remove after with `... remove`. Run: `PROBE_BASE=http://localhost:3115 node scripts/probe-combo-feed-link.mjs`.
// Asserts the second press exists beside See the combo, is a sibling link (not nested in the row's button), lands on
// /collection?combos=both&new=<variant> with the view drawn and that pair tagged NEW, and that See the combo still opens
// the combo sheet. It fails on main, where the row has no See your combos link.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;

const VIEWPORTS = [
  { label: "phone 390x844", width: 390, height: 844, form: "phone" },
  { label: "tablet 820x1180", width: 820, height: 1180, form: "phone" },
  { label: "tablet 1180x820", width: 1180, height: 820, form: "wide" },
  { label: "desktop 1300x900", width: 1300, height: 900, form: "wide" },
];

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
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


await clerkSetup();
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    // The seeded item is unseen, so Home leads with it (a lead card, not a list row): the link is on either.
    const link = page.locator("a[data-feed-combos-view]:visible").first();
    await link.waitFor({ timeout: 40_000 }).catch(() => {});
    console.log(`\n== ${vp.label}`);
    check((await link.count()) === 1, `${vp.label}: the combo item draws See your combos`);
    if ((await link.count()) === 0) { await context.close(); continue; }
    check(((await link.getAttribute("href")) ?? "").startsWith("/collection?combos=both&new="), `${vp.label}: it links to the combos view with the pair named`);
    check(await link.evaluate((a) => !a.closest("button, a:not([data-feed-combos-view])")), `${vp.label}: the link is not nested in another press`);
    const box = await link.boundingBox();
    check(box !== null && box.height >= 28, `${vp.label}: the link is at least 28px tall (${box?.height})`);
    await link.click();
    await page.waitForURL(/\/collection\?combos=both&new=/, { timeout: 30_000 });
    await page.waitForSelector("[data-combos-view]", { timeout: 30_000 });
    check(new URL(page.url()).searchParams.get("combos") === "both", `${vp.label}: the combos view (own both) opens`);
    await page.waitForSelector("[data-combo-pair]", { timeout: 30_000 });
    const tagged = await page.locator("[data-combo-new]").count();
    check(tagged >= 1, `${vp.label}: the announced pair carries NEW (${tagged})`);
    // The row's own press still opens the combo sheet.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /See the combo/ }).first().click();
    await page.waitForTimeout(900);
    check((await page.getByRole("dialog").count()) > 0, `${vp.label}: See the combo still opens the combo sheet`);
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.log(`\n${failures.length} FAIL`);
  process.exit(1);
}
console.log("\nall ok");
