// Wishlist printing (PR 3): the printings panel's wishlist foot, pressed through the real controls.
//
// Adds PROBE_CARD to the wishlist, opens the card, opens the printings panel (the phone's printings button at 390, the
// strip's Search tile at 1300), checks the foot reads `Wanted: any printing`, previews another printing, presses
// `Want <SET> <n>` in the FOOT, and checks the foot reads `Wanted: <SET> <n>` with `Any printing` to go back, and that
// the wanted thumb carries the bookmark. Then presses `Any printing` and removes the card. Fails on main: the panel has
// no foot.
//
//   PROBE_BASE=http://localhost:3102 PROBE_CARD="Counterspell" node scripts/probe-wishlist-panel-foot.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const CARD = process.env.PROBE_CARD;
if (!CARD) throw new Error("Set PROBE_CARD to a card with two or more printings.");

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



const failures = [];
const check = (ok, what, got) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}${ok ? "" : `  (got ${JSON.stringify(got)})`}`);
  if (!ok) failures.push(what);
};

async function run(viewport, label) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  let added = false;
  try {
    await signIn(page);
    await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "domcontentloaded" });
    const search = page.getByPlaceholder(/Add a card to your wishlist/).first();
    await search.waitFor({ timeout: 30_000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await search.click();
    await search.pressSequentially(CARD, { delay: 40 });
    const add = page.getByRole("button", { name: /^Add( to wishlist)?$/ }).first();
    await add.waitFor({ timeout: 20_000 });
    await add.click();
    added = true;
    const tile = page.getByTestId("wishlist-tile").filter({ hasText: CARD }).first();
    await tile.waitFor({ timeout: 20_000 });
    await tile.locator("button, a").first().click();
    const dialog = page.getByRole("dialog").first();
    await dialog.waitFor({ timeout: 20_000 });
    if (viewport.width < 600) {
      await dialog.getByTestId("printings-button").click();
    } else {
      await dialog.getByRole("button", { name: /search printings/i }).first().click();
    }
    const panel = dialog.getByTestId("printings-panel");
    await panel.waitFor({ timeout: 10_000 });
    const foot = panel.getByTestId("panel-wishlist-foot");
    await foot.waitFor({ timeout: 10_000 });
    check(/Wanted: any printing/.test((await foot.textContent()) ?? ""), `${label}: foot reads Wanted: any printing`, await foot.textContent());
    const box = await foot.boundingBox();
    check(box !== null && box.x >= 0 && box.x + box.width <= viewport.width, `${label}: the foot sits inside the viewport`, box);
    await panel.locator("button[aria-pressed='false']").first().click();
    const want = foot.getByRole("button", { name: /^Want [A-Z0-9]+ \S+, .* from / });
    await want.waitFor({ timeout: 10_000 });
    const wantText = ((await want.textContent()) ?? "").trim();
    check(/^Want [A-Z0-9]+ \S+$/.test(wantText), `${label}: foot offers Want <SET> <n>`, wantText);
    await want.click();
    await want.waitFor({ state: "detached", timeout: 15_000 });
    const chosen = wantText.replace(/^Want /, "");
    check(((await foot.textContent()) ?? "").includes(`Wanted: ${chosen}`), `${label}: foot reads Wanted: ${chosen}`, await foot.textContent());
    check((await foot.getByRole("button", { name: "Any printing" }).count()) === 1, `${label}: foot offers Any printing`, null);
    check((await panel.getByRole("button", { name: new RegExp(`, Wanted: ${chosen}$`) }).count()) === 1, `${label}: the wanted thumb is marked`, null);
    if (process.env.PROBE_SHEET) {
      await page.evaluate(() => document.querySelectorAll("*").forEach((e) => { if (e.scrollLeft > 0) e.scrollLeft = 0; }));
      await page.screenshot({ path: `${process.env.PROBE_SHEET}-${label}-chosen.png` });
    }
    await foot.getByRole("button", { name: "Any printing" }).click();
    await foot.getByRole("button", { name: "Any printing" }).waitFor({ state: "detached", timeout: 15_000 });
    check(/Wanted: any printing/.test((await foot.textContent()) ?? ""), `${label}: Any printing goes back`, await foot.textContent());
  } catch (error) {
    await page.screenshot({ path: process.env.PROBE_SHOT ?? "probe-wishlist-panel-foot-fail.png" }).catch(() => {});
    throw error;
  } finally {
    if (added) {
      try {
        await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "load" });
        const d = page.getByRole("dialog").first();
        await page.getByTestId("wishlist-tile").filter({ hasText: CARD }).first().locator("button, a").first().click();
        await d.waitFor({ timeout: 10_000 });
        await d.getByText("Remove", { exact: true }).first().evaluate((el) => el.click());
        await page.getByTestId("wishlist-tile").filter({ hasText: CARD }).first().waitFor({ state: "detached", timeout: 10_000 });
      } catch (error) {
        console.log(`CLEANUP NEEDED: remove ${CARD} from the wishlist by hand (${String(error).slice(0, 120)})`);
      }
    }
    await browser.close();
  }
}

await clerkSetup();
await run({ width: 390, height: 844 }, "phone");
await run({ width: 1300, height: 900 }, "desktop");
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
