// Gate for the `⛶ Card details` control on the commander detail page.
//
// The unit tests render both breakpoint trees at once — jsdom resolves no media
// query — so they can count the triggers in the document but never say which one
// a reader at a given width can reach. That is exactly the defect this covers:
// the control existed only in the phone's art header, so at desktop widths the
// commander's card could not be opened at all, and with it went the printings,
// the rulings, and the flip a two-faced commander's back face lives behind.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-commander-card-details.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
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
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// Visible, not present: both trees are in the DOM at every width, so
// `getClientRects()` is the only thing here that knows about CSS.
const READ_TRIGGERS = `() => {
  const visible = (el) => el.getClientRects().length > 0;
  const all = [...document.querySelectorAll('button[aria-label="View card details"]')];
  return all.filter(visible).map((b) => {
    const r = b.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
  });
}`;

// The modal, and whether the card it opened on can be turned over. The flip
// control is the reason the trigger's reachability matters beyond the printings.
const READ_MODAL = `() => {
  const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
  if (!dialog) return { open: false };
  const flip = [...dialog.querySelectorAll('button')].filter(
    (b) => b.getClientRects().length && /turn over|flip|other face|back/i.test(
      (b.getAttribute('aria-label') || '') + ' ' + b.textContent,
    ),
  );
  return {
    open: true,
    title: dialog.querySelector('#card-modal-title')?.textContent?.trim() ?? null,
    flips: flip.length,
  };
}`;

const findings = [];
const note = (line) => {
  findings.push(line);
  console.log(line);
};
const fail = (line) => note(`  FAIL ${line}`);

// A two-faced commander, so one walk answers both the reachability question and
// the flip one. Any owned `transform` legend does; this one is in the local
// fixture. Override when the fixture changes.
const COMMANDER = process.env.PROBE_COMMANDER ?? "Ojer Axonil";

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const [vpName, viewport] of [
    ["desktop", { width: 1440, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await signIn(page);

    // Through the lane's own search, so the probe never has to guess a slug —
    // `finalizeRecommendations` suffixes duplicates, so a slug built from the
    // name alone is right only until two commanders share one.
    await page.goto(`${BASE}/commanders?q=${encodeURIComponent(COMMANDER)}`, {
      waitUntil: "networkidle",
    });
    const card = page.locator('a[href^="/commanders/"]').first();
    if ((await card.count()) === 0) {
      fail(`${vpName}: no commander matched "${COMMANDER}" — set PROBE_COMMANDER`);
      await context.close();
      continue;
    }
    await card.click();
    await page.waitForURL(/\/commanders\/[^/]+$/, { timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/commander-card-details-${vpName}.png` });

    const triggers = await page.evaluate(`(${READ_TRIGGERS})()`);
    note(`${vpName} ${page.url().replace(BASE, "")}: ${triggers.length} visible card-details control(s)`);
    if (triggers.length !== 1) {
      fail(`expected exactly one visible control at this width, got ${triggers.length}`);
    }
    // 26px is the chip's own height; anything smaller is a control that shipped
    // clipped by the frame it now sits inside.
    for (const t of triggers) {
      if (t.h < 24 || t.w < 60) fail(`control measures ${t.w}×${t.h}, too small to hit`);
    }

    if (triggers.length) {
      await page.locator('button[aria-label="View card details"]:visible').first().click();
      await page.waitForTimeout(1200);
      const modal = await page.evaluate(`(${READ_MODAL})()`);
      if (!modal.open) fail("the control did not open the card modal");
      else note(`  modal opens on "${modal.title}", ${modal.flips} flip control(s)`);
      if (modal.open && modal.flips === 0) {
        fail(`no flip control on "${modal.title}" — expected a two-faced commander`);
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const fails = findings.filter((f) => f.includes("FAIL"));
console.log(`\n${fails.length} failures. Screenshots in /tmp/commander-card-details-*.png`);
if (fails.length) process.exitCode = 1;
