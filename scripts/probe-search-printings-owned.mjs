// Alternate printings from search, an OWNED card (handoff design_handoff_the99_alternate_printings O1-O3, #3002), pressed:
// the card's Set field reads `N printings · you own K`; open, it lists IN YOUR COLLECTION then OTHER PRINTINGS (`not
// owned`); selecting an other printing PREVIEWS it (nothing stored, the ◇ moves into that group), picking one of the
// reader's own ends the preview, and Add to collection while previewing opens Edit copies with it as a NEW line.
//
// Read-only: it signs in, searches, presses and cancels; it writes nothing (the Edit copies sheet is discarded).
//   PROBE_BASE=http://localhost:3721 PROBE_OWNED_QUERY="Sol Ring" node scripts/probe-search-printings-owned.mjs
// PROBE_OWNED_QUERY must name a card the account owns that has other catalog printings. Point it at
// local-dev or a scratch branch, NEVER production. PROBE_SHOTS=<dir> saves a frame per step.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const QUERY = process.env.PROBE_OWNED_QUERY ?? "Sol Ring";
const SHOTS = process.env.PROBE_SHOTS;
let failed = 0;
const check = (width, label, ok, saw) => {
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} [${width}] ${label} — ${saw}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const s = window.Clerk.client.signIn;
      let a = await s.create({ identifier: email });
      const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
      await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
      a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (a.status !== "complete") return `sign-in status: ${a.status}`;
      await window.Clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const SIZES = { phone: { width: 390, height: 844, touch: true }, desktop: { width: 1300, height: 900, touch: false } };
const sheet = (page) => page.getByRole("dialog", { name: "Search all cards" });
const card = (page) => page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: new RegExp(QUERY, "i") }) });

async function run(browser, name, { width, height, touch }) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const shot = async (tag) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/printings-owned-${name}-${tag}.png` }); };
  const openCard = async () => {
    // The press can land before hydration: press again until the sheet is up.
    for (let i = 0; i < 8 && !(await sheet(page).isVisible()); i++) {
      await page.getByRole("button", { name: "Search all cards", exact: true }).locator("visible=true").first().click();
      await sheet(page).waitFor({ timeout: 3_000 }).catch(() => {});
    }
    const field = sheet(page).getByRole("combobox");
    await field.fill(QUERY);
    const option = sheet(page).getByRole("option").first();
    await option.waitFor({ timeout: 30_000 });
    await option.click();
    await card(page).first().waitFor({ timeout: 30_000 });
    // The phone's sheet rests as a teaser: raise it.
    const more = card(page).first().getByRole("button", { name: /All details/ }).locator("visible=true").first();
    if (await more.count()) await more.click();
  };
  try {
    await signIn(page);
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    await openCard();
    const trigger = card(page).locator("button[aria-expanded]").filter({ hasText: /\d+ printings/ }).locator("visible=true").first();
    await trigger.waitFor({ timeout: 15_000 });
    const label = (await trigger.innerText()).replace(/\s+/g, " ");
    check(name, "the Set field reads N printings · you own K (or ◆ Your pick · N printings)", /\d+ printings/.test(label) && (/you own \d+/.test(label) || /your pick/i.test(label)), `trigger="${label}"`);
    await shot("closed");

    await trigger.click();
    const groups = card(page).getByRole("radiogroup", { name: "Printings" }).locator("visible=true");
    await groups.first().waitFor({ timeout: 15_000 });
    const heads = (await card(page).locator("p").filter({ hasText: /^(In your collection|Other printings) · \d+$/i }).locator("visible=true").allInnerTexts()).map((t) => t.trim());
    check(name, "two groups are headed IN YOUR COLLECTION and OTHER PRINTINGS", heads.length === 2 && /^in your collection/i.test(heads[0]) && /^other printings/i.test(heads[1]), JSON.stringify(heads));
    check(name, "the finish chips step aside", (await card(page).getByRole("radio", { name: /^(Nonfoil|Foil|Etched)$/ }).count()) === 0, "no finish chip");
    const others = groups.nth(1).getByRole("radio");
    const oArias = await others.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    check(name, "every other printing says not owned", oArias.length > 0 && oArias.every((a) => /not owned/.test(a)), `n=${oArias.length}`);
    await shot("open");

    const before = (await trigger.innerText()).replace(/\s+/g, " ");
    await others.first().click();
    const after = await others.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    check(name, "selecting another printing moves the ◇ into that group", /shown now/.test(after[0]), `"${after[0]}"`);
    const caption = (await trigger.innerText()).replace(/\s+/g, " ");
    check(name, "the Set caption follows the preview", caption !== before, `"${caption}"`);
    await shot("previewing");

    const add = card(page).getByRole("button", { name: /Add to collection|Edit copies/ }).locator("visible=true").first();
    if (await add.count()) {
      await add.click();
      const edit = page.locator('[role="dialog"]').filter({ hasText: /Edit copies|Add cards|Add to collection/ }).last();
      await edit.waitFor({ timeout: 30_000 });
      const m = /\((\w+)\), number (\S+?),/.exec(after[0] ?? "");
      await page.waitForFunction(() => ![...document.querySelectorAll('[role="dialog"]')].some((d) => /Reading your copies/.test(d.textContent ?? "")), null, { timeout: 30_000 });
      const body = (await edit.innerText()).replace(/\s+/g, " ");
      check(name, "Add to collection opens a new line with the previewed printing chosen", !!m && body.includes(`${m[1]} · #${m[2]}`), `want="${m?.[1]} · #${m?.[2]}"`);
      await shot("edit");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Discard", exact: true }).click({ timeout: 10_000 });
      await page.waitForTimeout(800);
    } else {
      check(name, "Add to collection is offered", false, "no button");
    }

    // Picking one of the reader's own ends a preview of another.
    const mine = groups.first().getByRole("radio");
    if (await mine.count()) {
      await mine.first().click();
      const o2 = await others.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
      check(name, "picking an owned printing ends the preview", o2.every((a) => !/shown now/.test(a)), `shown=${o2.filter((a) => /shown now/.test(a)).length}`);
    }
  } catch (e) {
    failed++;
    await shot("threw").catch(() => {});
    const labels = await page.locator("button[aria-label]:visible").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")).slice(0, 12)).catch(() => []);
    console.log(` seen buttons: ${JSON.stringify(labels)} at ${page.url()}`);
    console.log(` FAIL [${name}] threw — ${String(e).split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}

await clerkSetup();
const browser = await chromium.launch();
for (const [name, size] of Object.entries(SIZES)) await run(browser, name, size);
await browser.close();
console.log(failed ? `${failed} FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
