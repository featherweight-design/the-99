// probe:start-a-deck — the new-deck screen's "How we build it" choice, at 390 and 1300.
//
// Claims (guided build PR B, calls 1, 3, 4): the choice is a radiogroup of exactly two options with Free build
// pre-marked; each row is at least 44px tall; choosing Just the commander moves the mark and keeps the press reading
// "Create deck →"; with picks in ?select= the Your picks block draws one thumb per pick and says every option keeps
// them; nothing scrolls sideways at either width. Read-only: nothing is created. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3470 node scripts/probe-start-a-deck.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const COMMANDER = "7656f93b-336f-49cb-b8fe-c2b5c014258f"; // The Wise Mothman, scored for the fixture account
const PICKS = ["6ad8011d-3471-4369-9d68-b264cc027487", "0bc7f093-bef0-4f1a-852c-4b75ebf54838", "2c63e4e1-89d2-4bc6-a232-94e75c4b1c8a"];

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}
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
          if (!factor?.emailAddressId) return "no email_code first factor";
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (e) {
        return String(e?.errors?.[0]?.longMessage ?? e);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(failure);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const [tag, width, height] of [["phone", 390, 844], ["desktop", 1300, 900]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block" });
    const page = await ctx.newPage();
    await signIn(page);
    for (const withPicks of [false, true]) {
      const q = withPicks ? `&select=${PICKS.join(",")}` : "";
      await page.goto(`${BASE}/decks/new?commander=${COMMANDER}${q}`, { waitUntil: "domcontentloaded" });
      const group = onPage(page, "[role=radiogroup]");
      await group.waitFor({ timeout: 30_000 });
      const at = `${tag}${withPicks ? " + picks" : ""}`;
      const radios = group.locator("input[type=radio]");
      report((await radios.count()) === 2, `${at}: two options`, `count=${await radios.count()}`);
      report(await radios.nth(0).isChecked(), `${at}: Free build pre-marked`);
      for (let i = 0; i < 2; i += 1) {
        const box = await group.locator("label").nth(i).boundingBox();
        report(!!box && box.height >= 44, `${at}: row ${i + 1} at least 44px tall`, `h=${box?.height}`);
      }
      if (!withPicks) {
        await group.locator("label").nth(1).click();
        report(await radios.nth(1).isChecked() && !(await radios.nth(0).isChecked()), `${at}: choosing Just the commander moves the mark`);
        const press = await onPage(page, "form button[type=submit]").first().innerText();
        report(/Create deck/.test(press), `${at}: the press reads Create deck`, press);
      } else {
        const block = onPage(page, "[data-testid=build-picks]");
        await block.waitFor({ timeout: 15_000 });
        report((await block.locator("li").count()) === PICKS.length, `${at}: one thumb per pick`, `n=${await block.locator("li").count()}`);
        report((await block.innerText()).includes("Every option keeps them."), `${at}: says every option keeps them`);
        report((await block.innerText()).includes("not owned"), `${at}: the unowned pick is tagged`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      report(overflow <= 0, `${at}: no sideways scroll`, `overflow=${overflow}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
