// Collection quick filters, PR 4: the Two-card combos chip and view pressed for real at phone, tablet and desktop widths.
//
// Run by hand against a dev server: `PROBE_BASE=http://localhost:3114 node scripts/probe-collection-combos.mjs`.
// Presses the combos chip and asserts what a press does: aria-pressed, ?combos=both in the URL, the view drawn in place
// of the list, the own-both / own-one toggle, the fact lines, the actions per width, and the chip taking it back. It
// fails on main, where there is no combos chip to press. Not part of `pnpm test`: it needs a browser and a signed-in session.
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

// Closes a card sheet the way a reader does: Escape peels one layer, so press it until the sheet is gone.
async function closeSheet(page) {
  for (let i = 0; i < 4 && (await page.getByRole("dialog").count()) > 0; i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
  }
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-quick-strip]:visible").first().waitFor({ timeout: 30_000 });
    const chip = page.locator('[data-quick-strip]:visible [data-quick-chip="combos"]');
    console.log(`\n== ${vp.label}`);
    check((await chip.count()) === 1, `${vp.label}: the Two-card combos chip is drawn`);
    if ((await chip.count()) === 0) { await context.close(); continue; }
    await chip.scrollIntoViewIfNeeded();
    check((await chip.getAttribute("aria-pressed")) === "false", `${vp.label}: combos starts unpressed`);
    await chip.click();
    await page.waitForSelector("[data-combos-view]", { timeout: 20_000 });
    check((await chip.getAttribute("aria-pressed")) === "true", `${vp.label}: combos pressed after a click`);
    check(new URL(page.url()).searchParams.get("combos") === "both", `${vp.label}: the press writes ?combos=both`);
    await page.waitForSelector("[data-combo-pair]", { timeout: 20_000 });
    const pairs = await page.locator("[data-combo-pair]").count();
    check(pairs > 0, `${vp.label}: own-both draws pairs (${pairs})`);
    check(
      (await page.locator("[data-combo-pair]").first().innerText()).match(/In no deck together|Both in /) !== null,
      `${vp.label}: a pair carries its fact line`,
    );
    if (vp.form === "wide") {
      const card = page.locator("[data-combo-card]").first();
      check((await card.count()) > 0, `${vp.label}: a pair's card image is a button`);
      await card.click();
      await page.waitForTimeout(800);
      check((await page.getByRole("dialog").count()) > 0, `${vp.label}: pressing a card image opens that card's details`);
      await closeSheet(page);
      const how = page.getByRole("button", { name: "How it works" }).first();
      check((await how.count()) > 0, `${vp.label}: a pair has How it works`);
      await how.click();
      await page.waitForTimeout(800);
      check((await page.getByRole("dialog").count()) > 0, `${vp.label}: How it works opens the pair's sheet`);
      await closeSheet(page);
      check((await page.getByRole("dialog").count()) === 0, `${vp.label}: the sheet closes back onto the view`);
    } else {
      check((await page.locator("[data-combo-card]").count()) === 0, `${vp.label}: a phone row draws no nested card buttons`);
      await page.locator("[data-combo-pair]").first().click();
      await page.waitForTimeout(800);
      check((await page.getByRole("dialog").count()) > 0, `${vp.label}: a phone row opens the pair's detail`);
      await closeSheet(page);
      check((await page.getByRole("dialog").count()) === 0, `${vp.label}: the sheet closes back onto the view`);
    }
    // The toggle flips to own one and back.
    const one = page.locator("[data-combos-view] [aria-pressed]").nth(1);
    await one.click();
    await page.waitForTimeout(1200);
    check(new URL(page.url()).searchParams.get("combos") === "one", `${vp.label}: the toggle writes ?combos=one`);
    check(
      (await page.locator("[data-combo-pair]").count()) === 0 || (await page.locator("[data-combo-pair]").first().innerText()).includes("Missing"),
      `${vp.label}: own one names the missing card`,
    );
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${vp.label}: no sideways page scroll`,
    );
    // The chip takes the view back.
    await chip.click();
    await page.waitForTimeout(500);
    check((await page.locator("[data-combos-view]").count()) === 0, `${vp.label}: pressing again closes the view`);
    check(new URL(page.url()).searchParams.get("combos") === null, `${vp.label}: closing clears ?combos`);
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
