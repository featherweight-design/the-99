// The Wishlist's friend-spare press (design_handoff_the99_spares_search, Spares B), at 390x844 and 1300x900. A tile a
// friend holds a spare of draws the press once the one read lands; pressing it opens the Friends-with-a-spare modal
// under `on your wishlist`; the press is ringed (aria-expanded) while open; a tile with no spare draws none; the meta row
// gains `friend has a spare` only with a press; on desktop the Sort gains `Friends' spares` and puts presses first, and
// the phone has no Sort. Read-only. The account's wishlist must hold at least one card a friend shares a spare of and one
// they do not (scripts/tmp-seed-spares-style seeds on a scratch branch).
//
//   PROBE_BASE=http://localhost:<port> [PROBE_SHOTS=<dir>] pnpm probe:spares-wishlist
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) {
  throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
}
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
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
  }, [EMAIL, PASSWORD ?? ""]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

let failed = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`); if (!ok) failed++; };
await clerkSetup();
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const wide = vp.width >= 1000;
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  await signIn(page);
  console.log(`\n${vp.label}`);
  await page.goto(`${BASE}/collection/wishlist`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-testid='wishlist-tile']").first().waitFor({ timeout: 30_000 });
  await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
  const presses = page.locator("[data-testid='wishlist-spare-press']");
  await presses.first().waitFor({ timeout: 15_000 }).catch(() => {});
  const count = await presses.count();
  const tiles = await page.locator("[data-testid='wishlist-tile']").count();
  check("a tile with a friend's spare draws a press", count > 0, `${count} presses`);
  check("a tile with no spare draws none", count < tiles, `${count} of ${tiles} tiles`);
  if (count === 0) continue;
  const box = await presses.first().boundingBox();
  check("the press is a 26px box", Math.abs(box.height - 26) <= 1.5 && box.width < 80, `${box.width}x${box.height}`);
  check("the meta row names the key", (await page.locator("body").innerText()).includes("friend has a spare"));
  const sort = page.getByRole("combobox", { name: "Sort" });
  check(wide ? "desktop Sort has Friends' spares" : "phone has no Sort", wide ? (await sort.locator("option", { hasText: "Friends\u2019 spares" }).count()) === 1 : (await sort.count()) === 0 || !(await sort.isVisible()));
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/wishlist-spares-rest-${vp.width}.png` });
  await presses.first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 10_000 }).catch(() => {});
  const text = await dialog.innerText().catch(() => "");
  check("pressing opens Friends with a spare", text.includes("Friends with a spare"));
  check("the kicker reads on your wishlist", text.toLowerCase().includes("on your wishlist"));
  check("the press reports expanded while open", (await presses.first().getAttribute("aria-expanded")) === "true");
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/wishlist-spares-${vp.width}.png` });
  await page.keyboard.press("Escape");
  if (wide) {
    await sort.selectOption("friends");
    await page.waitForTimeout(300);
    const first = page.locator("[data-testid='wishlist-tile']").first();
    check("Friends' spares puts a press first", (await first.locator("[data-testid='wishlist-spare-press']").count()) === 1);
  }
  await context.close();
}
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
