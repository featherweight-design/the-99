// Proves Auto's optimistic add in a real browser, at 390 and 1300 (Hugh, 2026-10-16): a card the scanner reads in Auto
// is on the list, and the panel says Added, while its printings are still being read, the panel never says it is
// adding, and when the printings cannot be read the card comes back off the list and a toast says so.
//
// The camera is Chromium's fake one playing a clip that puts Sol Ring down and takes it away, over and over
// (`lib/fake-camera.mjs`). The match is answered here with a fixed answer, so no scan index is needed. The printings
// read is the sheet's server action; this script holds it for HOLD_MS so the panel can be seen ahead of it, and, for
// the rollback, fails it. The list is never saved: the script writes nothing.
//
//   PROBE_BASE=http://localhost:3418 pnpm probe:scan-auto
//
// The server needs COLLECTION_EDIT_ENABLED, and a network for the models.
import path from "node:path";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { fakeCameraArgs, writeFakeClip } from "./lib/fake-camera.mjs";
import { onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const HOLD_MS = 2500;

const CARD = { oracleId: "6ad8011d-3471-4369-9d68-b264cc027487", name: "Sol Ring", scryfallId: "04002706-2236-4b79-bdea-4f263e43cb9c" };
const MATCH = { index: "probe", margin: 0.2, guesses: [{ ...CARD, typeLine: "Artifact", imageUri: null, score: 0.93 }] };

let failed = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
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
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const scene = { w: 720, h: 1280 };
const clip = await writeFakeClip(
  [[scene, 60], [{ ...scene, card: CARD.name, share: 0.3, cx: 0.5, cy: 0.45, angle: 4 }, 180]],
  path.resolve("contact-sheets/probe-scan-auto"),
  "clip",
);

await clerkSetup();
const browser = await chromium.launch({ args: fakeCameraArgs(clip) });
try {
  for (const [label, viewport] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1300, height: 900 }]]) {
    console.log(`\n${label} ${viewport.width}`);
    const context = await browser.newContext({ permissions: ["camera"], viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await signIn(page);
    await page.evaluate(() => localStorage.setItem("the99.scan.mode", "fast"));
    await page.route("**/api/card-scan/match", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MATCH) }));
    await page.route("**/api/card-scan/timing", (route) => route.fulfill({ status: 204 }));
    // The sheet's printings read is a server action: a POST to the page carrying `next-action`.
    const actions = { mode: "hold", inFlight: 0, kept: 0, failed: 0 };
    await page.route("**/collection**", async (route) => {
      const req = route.request();
      if (req.method() !== "POST" || !req.headers()["next-action"]) return route.continue();
      actions.inFlight++;
      try {
        if (actions.mode === "fail") {
          actions.failed++;
          return await route.abort("failed");
        }
        await new Promise((r) => setTimeout(r, HOLD_MS));
        actions.kept++;
        return await route.continue();
      } finally {
        actions.inFlight--;
      }
    });
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    await page.locator("main h1").first().waitFor({ timeout: 60_000 });
    for (let i = 0; !(await page.locator("[role=dialog]").first().isVisible()); i++) {
      if (i === 20) throw new Error("the Add cards sheet never opened");
      await onPageRole(page, "button", /^(\+\s*)?Add( cards)?$/).first().click();
      await page.waitForTimeout(1500);
    }
    await onPageRole(page, "button", /^Scan$/).first().click();
    const scanner = page.locator("[data-testid=scanner]");
    await scanner.waitFor();
    check("the mode reads Auto", (await scanner.getByRole("button", { name: /^Auto$/ }).count()) > 0);
    // Every text the scanner shows, from now on: Auto must never say it is adding.
    await page.evaluate(() => {
      window.__seen = [];
      const root = document.querySelector("[data-testid=scanner]");
      new MutationObserver(() => window.__seen.push(root.textContent ?? "")).observe(root, { subtree: true, childList: true, characterData: true });
    });
    const panel = scanner.locator("[data-testid=scan-panel]");

    // The add, held: Added while the printings read is still in flight, and the tray already counts it.
    await panel.and(page.locator("[data-state=added]")).waitFor({ timeout: 90_000 });
    check("Added shows while the printings read is still in flight", actions.inFlight > 0);
    check("the panel names the card", (await panel.textContent())?.includes(`${CARD.name} is on the list`));
    // The copies on the list: the phone's tray ("<n> on the list"), else the desktop list's summary line.
    const onList = () => page.evaluate(() => {
      for (const el of document.querySelectorAll("[role=dialog] *")) {
        const m = el.textContent?.trim().match(/^(\d+) on the list$/);
        if (m) return Number(m[1]);
      }
      // The desktop draws no tray: the sheet's list beside the camera says its copies.
      for (const el of document.querySelectorAll("[role=dialog] *")) {
        const m = el.textContent?.trim().match(/^\d+ lines? · (\d+) cop(?:y|ies)$/);
        if (m) return Number(m[1]);
      }
      return NaN;
    });
    const rows = () => page.locator("[role=dialog] li").filter({ hasText: CARD.name }).count();
    const first = await onList();
    if (label === "phone") check("the tray already counts it", first >= 1, `${first} on the list`);
    // The desktop's summary counts only lines with a printing; the pending line itself is drawn beside the camera.
    else check("the list beside the camera already draws it", (await rows()) >= 1, `${await rows()} rows`);
    const seen = await page.evaluate(() => window.__seen.join("\n"));
    check("the scanner never said it was adding", !/Adding/i.test(seen));

    // The rollback: the next copy's printings fail, so it comes back off and the toast says so.
    for (let i = 0; actions.inFlight > 0 && i < 40; i++) await page.waitForTimeout(250);
    const keptAtFail = actions.kept;
    actions.mode = "fail";
    const toast = page.getByText(`${CARD.name} came off the list`, { exact: false });
    await toast.first().waitFor({ timeout: 90_000 });
    check("a failed add says it came off the list", true);
    await page.waitForTimeout(500);
    const after = await onList();
    if (label === "phone") check("the taken-back copy is off the count", after === first + (actions.kept - keptAtFail), `${first} then ${after}, ${actions.kept - keptAtFail} kept since`);
    else check("the taken-back line is off the list: one row, one copy", (await rows()) === 1 && after === 1, `${await rows()} rows, ${after} copies`);
    // The clip holds the card in view 6s at a time: 1.5s after the toast it is still there, and nothing has re-taken it.
    await page.waitForTimeout(1500);
    check("a taken-back card is not taken again while it stays in view", actions.failed === 1, `${actions.failed} failed reads`);
    await page.screenshot({ path: path.resolve(`contact-sheets/probe-scan-auto/${label}.png`) });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failed === 0 ? "\nprobe:scan-auto passed" : `\nprobe:scan-auto FAILED ${failed}`);
process.exit(failed === 0 ? 0 : 1);
