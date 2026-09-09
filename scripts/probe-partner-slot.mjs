// #364 decisions 17 and 20: the picker's second slot. Walks /decks/new at both
// widths and reports what the slot draws for a commander that can pair, for one
// that cannot, and for the re-headed pairing list.
//
// Anchored to the copy the slot renders rather than to class names: the plate is
// a bare element with no text of its own, so the eyebrow and the caption are the
// only stable handles.
//
// Run by hand: `node scripts/probe-partner-slot.mjs`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

// The motivating pair, and a legend with no partner ability to prove state A.
const PAIRS = "Atreus, Impulsive Son";
const PARTNER = "Kratos, Stoic Father";
const LONE = "Aang, the Last Airbender";

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

// Both breakpoints render a slot and one of them is always hidden, so every
// handle in this file is `:visible` — `.first()` would resolve to the phone's
// copy at 1300 and time out on a click.
function slot(page) {
  return page.locator('div:visible:has(> p:text-is("Partner"))').last();
}

async function pick(page, name) {
  await page.fill('input[placeholder*="Search" i], input[type="search"]', name.split(",")[0]);
  await page.waitForTimeout(350);
  await page.locator(`li button:has-text("${name}")`).first().click();
  await page.waitForTimeout(250);
}

async function report(page, label) {
  const s = slot(page);
  const visible = await s.isVisible().catch(() => false);
  if (!visible) {
    console.log(`  ${label}: no slot drawn`);
    return null;
  }
  const text = (await s.innerText()).replace(/\n+/g, " / ");
  const plate = s.locator("[class*='w-[38px]']").first();
  const box = await plate.boundingBox().catch(() => null);
  const style = box
    ? await plate.evaluate((n) => {
        const c = getComputedStyle(n);
        return `${c.borderTopStyle} ${c.borderTopWidth} r${c.borderTopLeftRadius}`;
      })
    : "no plate";
  console.log(`  ${label}: ${text}`);
  console.log(`    plate ${box ? `${box.width}x${box.height}` : "—"} · ${style}`);
  return text;
}

const browser = await clerkSetup().then(() => chromium.launch());
const context = await browser.newContext({ viewport: { width: 1300, height: 950 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${String(e).slice(0, 300)}`));

await signIn(page);

console.log("desktop 1300 — /decks/new");
await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);

// (a) state A: a commander with no partner ability draws no slot, and no eyebrow.
await pick(page, LONE);
await report(page, `${LONE} (no ability)`);
console.log(
  `    Commander eyebrow present: ${await page.locator('p:text-is("Commander"):visible').first().isVisible().catch(() => false)}`,
);

// (b) state B: the pairing commander draws the plate, the ability verbatim, a count.
await page.fill('input[placeholder*="Search" i], input[type="search"]', "");
await page.waitForTimeout(250);
await pick(page, PAIRS);
await report(page, `${PAIRS} (empty slot)`);
console.log(
  `    Commander eyebrow present: ${await page.locator('p:text-is("Commander"):visible').first().isVisible().catch(() => false)}`,
);

// (c) the re-headed list: only commanders that `canPair` survive.
await page.locator('button[aria-label^="Add a partner"]:visible').first().click();
await page.waitForTimeout(350);
const strip = await page
  .locator("text=/^Partners for /")
  .first()
  .innerText()
  .catch(() => "no strip");
console.log(`  pairing strip: ${strip}`);
const listed = await page.locator("ul li button .font-display, ul li button p").allInnerTexts();
console.log(`  pairing list (${listed.length}): ${listed.slice(0, 12).join(" | ")}`);

// (d) tab order reaches the plate, then fill it.
await page.locator(`li button:has-text("${PARTNER}")`).first().click();
await page.waitForTimeout(350);
await report(page, "filled slot");
const dock = await page
  .locator("text=/·/")
  .last()
  .innerText()
  .catch(() => "—");
console.log(`  summary line: ${dock}`);

// The plate and its actions are buttons, so a keyboard reaches them. Read the
// sidebar's focusables in DOM order rather than driving Tab: the list is a
// sibling of the sidebar and hundreds of rows long, so a Tab walk from either
// end lands in the list long before it says anything about the slot.
const order = await page.evaluate(() => {
  const eyebrow = [...document.querySelectorAll("p")].find(
    (p) => p.textContent?.trim() === "Partner" && p.getClientRects().length > 0,
  );
  const sidebar = eyebrow?.closest("div")?.parentElement;
  if (!sidebar) return ["no sidebar"];
  return [...sidebar.querySelectorAll("button, input, a, [tabindex]")]
    .filter((n) => n.getClientRects().length > 0)
    .map((n) =>
      (n.getAttribute("aria-label") || n.textContent || n.id || n.tagName).trim().slice(0, 44),
    );
});
console.log(`  sidebar focus order: ${order.join(" › ")}`);

// (e) the phone layout: the slot is in the flow, never in the dock.
console.log("\nmobile 390 — /decks/new");
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
await pick(page, PAIRS);
await report(page, `${PAIRS} (mobile)`);
const dockBox = await page
  .locator('[class*="fixed"][class*="bottom-0"]')
  .first()
  .boundingBox()
  .catch(() => null);
const slotBox = await slot(page).boundingBox().catch(() => null);
console.log(
  `    dock ${dockBox ? `y=${Math.round(dockBox.y)} h=${Math.round(dockBox.height)}` : "—"} · slot ${slotBox ? `y=${Math.round(slotBox.y)}` : "—"}`,
);

// (f) import mode. The picker there reads the other row type entirely, so a
// list declaring one half of the pair is the only thing that proves the slot
// draws from a paste as well as from the collection.
console.log("\ndesktop 1300 — /decks/import");
await page.setViewportSize({ width: 1300, height: 950 });
await page.goto(`${BASE}/decks/import`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page
  .locator("textarea")
  .first()
  .fill([`1 ${PAIRS}`, `1 ${PARTNER}`, "1 Sol Ring", "1 Lightning Bolt"].join("\n"));
await page.locator('input[type="text"]:visible').first().fill(`Probe pair ${Date.now()}`);
await page.waitForTimeout(200);
await page.locator("button:visible").filter({ hasText: /continue|import|next/i }).first().click();
await page.waitForTimeout(2500);
console.log(`  landed on ${page.url()}`);
const importRows = await page.locator("ul li button:visible").allInnerTexts();
console.log(`  candidates (${importRows.length}): ${importRows.map((t) => t.split("\n")[0]).join(" | ")}`);
await page.locator(`li button:has-text("${PAIRS}"):visible`).first().click();
await page.waitForTimeout(300);
await report(page, `${PAIRS} (import)`);
await page.locator('button[aria-label^="Add a partner"]:visible').first().click();
await page.waitForTimeout(300);
await page.locator(`li button:has-text("${PARTNER}"):visible`).first().click();
await page.waitForTimeout(300);
await report(page, "import, filled");

await browser.close();
