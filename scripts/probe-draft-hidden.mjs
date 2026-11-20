// probe:draft-hidden (#2988): a Draft deck Settings hides says why, offers its ways out, and the Settings link lands on the exact box.
//
// On /decks (390 and 1280) the probe opens each tile's ⋯ menu until it finds a deck the owner's Settings rules hide (the default rule
// hides New, Draft and Building decks) and asserts: no "Hidden from friends" checkbox is drawn for it; the why block names the reason;
// the Settings way out links to `/settings#settings-decks-unfinished` (`-see` when "Friends can see my decks" is off); a deck that can
// commit also offers `Commit as v1` to `/decks/<id>/changes?commit=1`; then the Settings link is pressed and the named row carries the
// wash (`data-washed`) with the page scrolled to it. A run that finds no hidden-by-rule deck fails (it would measure nothing).
// Read-only. Needs the audit user to own an unfinished deck, `E2E_AUDIT_USER_*` and `CLERK_SECRET_KEY`; never production.
//
//   PROBE_BASE=http://localhost:3417 node scripts/probe-draft-hidden.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_client_trust") {
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
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const WINDOWS = [
  { label: "phone 390x844", viewport: { width: 390, height: 844 }, touch: true },
  { label: "desktop 1280x800", viewport: { width: 1280, height: 800 }, touch: false },
];

const results = [];
function check(ok, label, detail) {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const win of WINDOWS) {
    const ctx = await browser.newContext({ viewport: win.viewport, hasTouch: win.touch, isMobile: win.touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForSelector("button[aria-label^='Actions for']", { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const triggers = page.locator("button[aria-label^='Actions for']");
    const n = Math.min(await triggers.count(), 14);
    let found = null;
    for (let i = 0; i < n && !found; i++) {
      await triggers.nth(i).scrollIntoViewIfNeeded();
      await triggers.nth(i).click();
      await page.waitForTimeout(250);
      const why = page.locator("[data-hide-from-friends=why]");
      if (await why.count()) {
        found = {
          index: i,
          line: (await why.first().textContent())?.trim(),
          // Inside the one open menu: the block's own parent holds its rows.
          checkbox: await why.first().locator("xpath=..").getByRole("checkbox").count(),
          settings: await page.locator("a[data-hide-from-friends=settings]").first().getAttribute("href"),
          commit: await page.locator("a[data-hide-from-friends=commit]").count(),
          commitHref: await page.locator("a[data-hide-from-friends=commit]").first().getAttribute("href").catch(() => null),
        };
        break;
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
    }
    check(found !== null, `${win.label}: a deck the Settings rules hide shows the why block`, found ? JSON.stringify(found.line) : `${n} menus opened`);
    if (found) {
      check(found.checkbox === 0, `${win.label}: no "Hidden from friends" checkbox is drawn for it`);
      check(/\/settings#settings-decks-(see|unfinished)$/.test(found.settings ?? ""), `${win.label}: the Settings way out lands on the exact box`, found.settings);
      check(found.commit === 0 || /\/decks\/[0-9a-f-]+\/changes\?commit=1$/.test(found.commitHref ?? ""), `${win.label}: Commit as v1, where offered, links to the commit`, found.commit ? found.commitHref : "not offered (the deck cannot commit)");
      await page.locator("a[data-hide-from-friends=settings]").first().click();
      await page.waitForURL(/\/settings/, { timeout: 60_000 });
      const target = found.settings.split("#")[1];
      await page.waitForSelector(`#${target}`, { timeout: 60_000 });
      if (process.env.PROBE_DEBUG) for (let k = 0; k < 8; k++) { console.log("   sy", await page.evaluate(() => [Math.round(scrollY), document.documentElement.scrollHeight]), await page.evaluate((id) => Math.round(document.getElementById(id).getBoundingClientRect().top), target)); await page.waitForTimeout(150); }
      await page.waitForTimeout(600);
      const landed = await page.evaluate((id) => {
        const el = document.getElementById(id);
        const r = el.getBoundingClientRect();
        return { washed: el.hasAttribute("data-washed"), inView: r.top >= 0 && r.bottom <= innerHeight, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, sy: Math.round(scrollY) };
      }, target);
      check(landed.washed, `${win.label}: the landed Settings row is washed`, JSON.stringify(landed));
      check(landed.inView, `${win.label}: the landed row is scrolled into view`, JSON.stringify(landed));
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
