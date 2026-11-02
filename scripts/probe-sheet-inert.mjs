// probe:sheet-inert — a modal sheet holds the page behind it (src/lib/a11y/inert-page.ts).
//
// On a phone, opens the collection's filter sheet and proves with real focus and the real accessibility tree what
// jsdom cannot: Tab never leaves the dialog in 40 presses, the page behind it is gone from the accessibility tree, the
// scrim still dismisses it, and everything is given back on close. (That the four live portals carry the exempt marker
// is pinned in src/lib/a11y/inert-page.test.tsx.)
//
//   E2E_AUDIT_USER_EMAIL=alpha-test+clerk_test@the99.app PROBE_BASE=http://localhost:3300 pnpm probe:sheet-inert
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3300";
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) failures.push(what);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      await signIn.create({ identifier: email });
      const factor = signIn.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
      const attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

/** The browser's own accessibility tree (CDP), as "role:name" for every node it exposes. Playwright's aria snapshot
 *  ignores `inert`; the browser's tree is what a screen reader reads. */
const tree = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  return nodes.filter((n) => !n.ignored && n.role?.value && n.name?.value).map((n) => `${n.role.value}:${n.name.value}`);
};

await clerkSetup();
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await signIn(page);
await page.goto(`${BASE}/collection`, { waitUntil: "networkidle" });

const before = await tree(page);
const trigger = page.getByRole("button", { name: /filter/i }).first();
await trigger.click();
const dialog = page.locator('[role="dialog"][aria-modal="true"]').first();
await dialog.waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(400);

check(await page.evaluate(() => document.querySelectorAll("[inert]").length > 0), "the page behind the sheet carries inert");
let escaped = 0;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press("Tab");
  const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  if (!inside) escaped++;
}
check(escaped === 0, `Tab stayed in the dialog for 40 presses (escaped ${escaped})`);
let escapedBack = 0;
for (let i = 0; i < 10; i++) {
  await page.keyboard.press("Shift+Tab");
  if (!(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) escapedBack++;
}
check(escapedBack === 0, `Shift+Tab stayed in the dialog (escaped ${escapedBack})`);

const open = await tree(page);
const gone = before.filter((n) => /^(link|navigation):/.test(n) && !open.includes(n));
console.log("info  link/nav lines before:", before.filter((n) => /^(link|navigation):/.test(n)).length, "open:", open.filter((n) => /^(link|navigation):/.test(n)).length, "total", before.length, open.length);
check(gone.length > 0, `page links left the accessibility tree behind the sheet (${gone.length} gone, e.g. ${gone[0] ?? "none"})`);
check(open.some((n) => n.startsWith("dialog:")), "the dialog itself is in the accessibility tree");

// A node mounted after it opened is covered too.
await page.evaluate(() => {
  const d = document.createElement("div");
  d.id = "late-probe";
  d.innerHTML = "<button>late</button>";
  document.body.append(d);
});
await page.waitForTimeout(100);
check(await page.evaluate(() => document.getElementById("late-probe").hasAttribute("inert")), "a node mounted after open is inert");

// The scrim still takes the press that dismisses it.
await page.mouse.click(195, 40);
await dialog.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
check((await page.locator('[role="dialog"][aria-modal="true"]').count()) === 0, "pressing the scrim dismissed the sheet");
check(await page.evaluate(() => document.querySelectorAll("[inert]:not(#late-probe)").length === 0), "closing gave the page back (no inert left)");

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
