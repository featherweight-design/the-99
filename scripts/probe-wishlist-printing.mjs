// Wishlist printing (PR 2): choosing a printing on a wishlist line, pressed through the real controls.
//
// Adds PROBE_CARD to the signed-in account's wishlist through the tab's search, opens the card from its tile,
// previews another printing in the strip, presses `Want <SET> <n>`, and checks: the box says which printing the
// line names, the strip marks it, the link-out names it, and after closing the tile draws `SET number`. Then it
// presses `Any printing`, checks the tile line drops the printing, and removes the card, leaving the account as it
// found it. Fails on main: there is no Printing line, so no press named `Want ...` exists.
//
// Run with the dev server up (local-dev only; it writes one wishlist row and removes it):
//   PROBE_BASE=http://localhost:3101 PROBE_CARD="Counterspell" node scripts/probe-wishlist-printing.mjs
// PROBE_CARD must be a card with two or more printings that the account does not already want.
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
    const strip = dialog.getByTestId("printing-strip");
    await strip.waitFor({ timeout: 20_000 });
    // Preview a printing that is not the one on screen.
    await strip.locator("button[aria-pressed='false']").first().click();
    const want = dialog.getByRole("button", { name: /^Want .* from .*, number / });
    await want.waitFor({ timeout: 10_000 });
    const wantText = (await want.textContent())?.trim() ?? "";
    check(/^Want [A-Z0-9]+ \S+$/.test(wantText), `${label}: the Printing line offers Want <SET> <n>`, wantText);
    await want.click();
    const line = dialog.getByTestId("wishlist-printing-line");
    await want.waitFor({ state: "detached", timeout: 15_000 });
    const chosen = wantText.replace(/^Want /, "");
    check((await line.textContent())?.includes(chosen), `${label}: the box names ${chosen} after the press`, await line.textContent());
    check((await strip.getByRole("button", { name: /Wanted: / }).count()) === 1, `${label}: the strip marks the wanted printing`, null);
    const buy = dialog.getByRole("link", { name: new RegExp(`Buy ${chosen} at Mana Pool`) });
    check((await buy.count()) > 0, `${label}: the link-out reads Buy ${chosen} at Mana Pool`, null);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 10_000 });
    await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "load" });
    const printed = page.getByTestId("wishlist-tile").filter({ hasText: CARD }).first().getByTestId("wishlist-tile-printing");
    await printed.waitFor({ timeout: 20_000 });
    const lineText = (await printed.textContent()) ?? "";
    check(lineText.replace(/\s+/g, " ").includes(chosen.split(" ")[0]), `${label}: the tile draws the chosen printing`, lineText);
    // The phone's tile keeps the set code and drops the number.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "load" });
    const phoneLine = page.getByTestId("wishlist-tile").filter({ hasText: CARD }).first().getByTestId("wishlist-tile-printing");
    await phoneLine.waitFor({ timeout: 20_000 });
    const phoneText = await phoneLine.evaluate((n) => n.innerText);
    const [setCode, number] = chosen.split(" ");
    check(phoneText.includes(setCode) && !phoneText.includes(number), "phone: the tile line draws the set code without the number", phoneText);
    await page.setViewportSize(viewport);
    await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "load" });
    // Back to any printing.
    await page.getByTestId("wishlist-tile").filter({ hasText: CARD }).first().locator("button, a").first().click();
    await dialog.waitFor({ timeout: 20_000 });
    await dialog.getByRole("button", { name: "Any printing" }).click();
    await dialog.getByRole("button", { name: "Any printing" }).waitFor({ state: "detached", timeout: 15_000 });
    check((await dialog.getByRole("button", { name: /Wanted: / }).count()) === 0, `${label}: Any printing clears the strip mark`, null);
  } catch (error) {
    await page.screenshot({ path: process.env.PROBE_SHOT ?? "probe-wishlist-printing-fail.png" }).catch(() => {});
    throw error;
  } finally {
    if (added) {
      try {
        // Fresh page, whatever state the run died in.
        await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "load" });
        const d = page.getByRole("dialog").first();
        await page.getByTestId("wishlist-tile").filter({ hasText: CARD }).first().locator("button, a").first().click();
        await d.waitFor({ timeout: 10_000 });
        await d.getByText("Remove", { exact: true }).first().click();
        await page.getByTestId("wishlist-tile").filter({ hasText: CARD }).first().waitFor({ state: "detached", timeout: 10_000 });
      } catch (error) {
        console.log(`CLEANUP NEEDED: remove ${CARD} from the wishlist by hand (${String(error).slice(0, 120)})`);
      }
    }
    await browser.close();
  }
}

await clerkSetup();
await run({ width: 1300, height: 900 }, "desktop");
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
