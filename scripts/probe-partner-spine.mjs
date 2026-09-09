// #364 decisions 18 and 22: the deck header caption at both widths. Creates a
// pair deck through the picker, then reports what the header states at the four
// desktop widths the ordered shrink covers and on a phone.
//
// The caption is a single `<p>` of mono text, so the handle is the primary's
// name and the `<p>` it sits in — no class name in the band is stable.
//
// Run by hand: `node scripts/probe-partner-spine.mjs`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const PAIRS = "Atreus, Impulsive Son";
const PARTNER = "Kratos, Stoic Father";

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

// The caption is a flex group of spans, so the handle is the span whose text is
// exactly the primary's name and the group it sits in. Both breakpoints render
// a header and one of them is always hidden, so only the visible one is read —
// the desktop and phone copies differ, which is decision 18's two arms.
//
// The group's own line count is what decision 18 rules on: the ordered shrink
// exists so the names ellipsise rather than wrapping, and more than one line
// here is the failure it forbids.
async function report(page, label) {
  const seen = await page.evaluate((primary) => {
    const span = [...document.querySelectorAll("span")].find(
      (n) => n.textContent?.trim() === primary && n.getClientRects().length > 0,
    );
    const group = span?.parentElement;
    if (!group) return null;
    const box = group.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(group).lineHeight || "13");
    return {
      text: [...group.children].map((n) => n.textContent).join(" | "),
      width: Math.round(box.width),
      lines: Math.round(box.height / lineHeight),
      // A shrunk half reports more content than it can draw, which is the only
      // direct evidence the ellipsis is doing the work rather than the wrap.
      clipped: [...group.children]
        .filter((n) => n.scrollWidth > n.clientWidth + 1)
        .map((n) => n.textContent),
    };
  }, PAIRS);
  if (!seen) return console.log(`  ${label}: no caption`);
  console.log(`  ${label}: ${seen.text}`);
  console.log(
    `    ${seen.width}px wide · ${seen.lines} line(s) · clipped: ${seen.clipped.join(", ") || "none"}`,
  );
}

const browser = await clerkSetup().then(() => chromium.launch());
const context = await browser.newContext({ viewport: { width: 1300, height: 950 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${String(e).slice(0, 300)}`));

await signIn(page);

// Build the motivating deck through the picker, so the probe walks the real
// path a player takes rather than a row written straight into the database.
await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.fill('input[placeholder*="Search" i], input[type="search"]', "Atreus");
await page.waitForTimeout(350);
await page.locator(`li button:has-text("${PAIRS}"):visible`).first().click();
await page.waitForTimeout(250);
await page.locator('button[aria-label^="Add a partner"]:visible').first().click();
await page.waitForTimeout(350);
await page.locator(`li button:has-text("${PARTNER}"):visible`).first().click();
await page.waitForTimeout(300);
const name = `Probe spine ${Date.now()}`;
await page.locator('input#picker-deck-name, input[type="text"]:visible').first().fill(name);
await page.locator('button:visible').filter({ hasText: /create deck/i }).first().click();
await page.waitForURL(/\/decks\/[0-9a-f-]{8,}/, { timeout: 20_000 });
await page.waitForTimeout(800);
console.log(`created ${page.url()}`);

// The four desktop widths decision 18's ordered shrink covers.
for (const width of [1180, 1085, 900, 768]) {
  await page.setViewportSize({ width, height: 950 });
  await page.waitForTimeout(600);
  await report(page, `desktop ${width}`);
}

// Back to a width the whole caption fits, so the checks below read the partner
// rather than the ordered shrink's remains: at 768 the partner is shrunk to
// nothing, which is what a shrink factor of 1000 against a 232px column means.
await page.setViewportSize({ width: 1180, height: 950 });
await page.waitForTimeout(600);

console.log("\ndenominator and pips");
const figure = await page.evaluate(() => {
  const span = [...document.querySelectorAll("span")].find(
    (n) => /^\s*\/ \d+$/.test(n.textContent ?? "") && n.getClientRects().length > 0,
  );
  return span?.textContent?.trim() ?? "—";
});
console.log(`  denominator: ${figure}`);
const pips = await page.evaluate((primary) => {
  const span = [...document.querySelectorAll("span")].find(
    (n) => n.textContent?.trim() === primary && n.getClientRects().length > 0,
  );
  const row = span?.parentElement?.parentElement;
  const swatches = row?.querySelector('[aria-hidden="true"]');
  return [...(swatches?.children ?? [])].map((n) => getComputedStyle(n).backgroundColor);
}, PAIRS);
console.log(`  identity pips (${pips.length}): ${pips.join(" | ")}`);

// The partner's name is the trigger, and the rule under it is the whole
// affordance — a border on the word, never a text-decoration on the button.
const trigger = page.getByRole("button", { name: `Show the printing for ${PARTNER}` });
const count = await trigger.count();
const deco = await trigger
  .first()
  .evaluate((n) => getComputedStyle(n.firstElementChild ?? n).borderBottom)
  .catch(() => "—");
console.log(`  partner trigger: ${count} in DOM · rule ${deco}`);
await trigger.locator("visible=true").first().click();
await page.waitForTimeout(1200);
const modal = await page
  .locator('[role="dialog"]')
  .first()
  .innerText()
  .catch(() => "no modal");
console.log(`  opens: ${modal.split("\n").slice(0, 2).join(" / ")}`);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// Reading order: the band's own pill, then the caption's partner trigger.
const order = await page.evaluate(() => {
  const header = [...document.querySelectorAll("header")].find(
    (n) => n.getClientRects().length > 0,
  );
  return [...(header?.querySelectorAll("button, a, input") ?? [])]
    .filter((n) => n.getClientRects().length > 0)
    .map((n) => (n.getAttribute("aria-label") || n.textContent || n.tagName).trim().slice(0, 40));
});
console.log(`  header focus order: ${order.join(" › ")}`);

console.log("\nmobile 390");
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
await report(page, "mobile 390");
const target = await page
  .getByRole("button", { name: `Show the printing for ${PARTNER}` })
  .locator("visible=true")
  .first()
  .boundingBox()
  .catch(() => null);
console.log(`  partner target: ${target ? `${Math.round(target.width)}x${Math.round(target.height)}` : "—"}`);

await browser.close();
