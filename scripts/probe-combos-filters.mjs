// Collection quick filters feedback (Hugh 2026-11-25), PR C: the combos view loads with the list's skeleton, opens with both
// toggle counts, and keeps the chip pressed while the Collection's filters narrow the pairs.
//
// Run by hand against a dev server: `PROBE_BASE=http://localhost:3147 node scripts/probe-combos-filters.mjs`.
// It fails on main, where the view is blank while it loads, the "You own one" count pops in after its side is
// fetched, and typing a search takes the chip back to the card list. Not part of `pnpm test`: it needs a browser
// and a signed-in session.
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
    // Hold the combos request so the loading state can be seen.
    await page.route("**/api/collection-combos*", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    console.log(`\n== ${vp.label}`);
    const chip = page.locator("[data-quick-strip]:visible button", { hasText: "Two-card combos" }).first();
    await chip.waitFor({ timeout: 30_000 });
    await chip.click();
    check((await chip.getAttribute("aria-pressed")) === "true", `${vp.label}: the chip is pressed`);
    check(
      (await page.locator("[data-combos-loading]").count()) > 0,
      `${vp.label}: the list's loading state draws while the pairs load, not a blank`,
    );
    await page.waitForSelector("[data-combo-pair]", { timeout: 30_000 });
    const toggle = (label) => page.locator("[data-combos-view] [role=group] button", { hasText: label });
    check(/\d/.test(await toggle("You own one").innerText()), `${vp.label}: the You own one count is there with the first pairs`);
    check(/\d/.test(await toggle("You own both").innerText()), `${vp.label}: the You own both count is there with the first pairs`);
    const before = await page.locator("[data-combo-pair]").count();
    // A word of the first pair's first card, so something survives the search.
    const title = (await page.locator("[data-combo-title]").first().innerText()).replace(/\s+/g, " ");
    const word = title.split(" ").find((w) => w.length > 3 && /^[A-Za-z]+$/.test(w)) ?? title.slice(0, 4);
    const search = page.locator("input[type=search]:visible, [role=searchbox]:visible").first();
    await search.fill(word);
    await page.waitForTimeout(600);
    check((await chip.getAttribute("aria-pressed")) === "true", `${vp.label}: typing "${word}" keeps the chip pressed`);
    check((await page.locator("[data-combos-view]").count()) === 1, `${vp.label}: the combos view stays`);
    const after = await page.locator("[data-combo-pair]").count();
    check(after > 0 && after <= before, `${vp.label}: the search narrows the pairs (${before} to ${after})`);
    await search.fill("");
    await page.waitForTimeout(400);
    check((await page.locator("[data-combo-pair]").count()) === before, `${vp.label}: clearing the search brings every pair back`);
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${vp.label}: no sideways page scroll`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall ok");
