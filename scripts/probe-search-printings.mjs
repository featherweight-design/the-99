// Alternate printings from search (handoff design_handoff_the99_alternate_printings, #3002), pressed: a card the reader
// owns none of, opened from card search, offers its catalog printings under the Set field. Selecting one PREVIEWS it
// (caption and the ◇ Shown now mark move, nothing is stored), Add to collection opens Edit copies with it chosen, and
// closing forgets the preview.
//
// Read-only: it signs in, searches, presses and cancels; it writes nothing (the Edit copies sheet is cancelled).
//   PROBE_BASE=http://localhost:3721 PROBE_QUERY="Black Lotus" node scripts/probe-search-printings.mjs
// PROBE_QUERY must name a card with 2+ catalog printings that the account owns NONE of. Point it at local-dev or a
// scratch branch, NEVER production. PROBE_SHOTS=<dir> saves a frame per step.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const QUERY = process.env.PROBE_QUERY ?? "Black Lotus";
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
  const shot = async (tag) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/printings-${name}-${tag}.png` }); };
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
    // Held by its disclosure state, not its name: the name changes once it is open.
    const trigger = card(page).locator("button[aria-expanded]").filter({ hasText: /\d+ printings/ }).locator("visible=true").first();
    await trigger.waitFor({ timeout: 15_000 });
    const label = (await trigger.innerText()).replace(/\s+/g, " ");
    check(name, "the Set field offers the printings", /\d+ printings/.test(label) && !/you own/.test(label), `trigger="${label}"`);
    const firstCaption = label;
    await shot("closed");

    await trigger.click();
    const region = card(page).getByRole("radiogroup", { name: "Printings" }).locator("visible=true").first();
    await region.waitFor({ timeout: 15_000 });
    const tiles = region.getByRole("radio");
    const n = await tiles.count();
    const arias = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    check(name, "every tile says not owned", n > 1 && arias.every((a) => /not owned/.test(a)), `n=${n} sample="${arias[0]}"`);
    const shownAt = arias.findIndex((a) => /shown now/.test(a));
    check(name, "one tile is Shown now", arias.filter((a) => /shown now/.test(a)).length === 1, `at=${shownAt}`);
    await shot("open");

    const target = shownAt === 0 ? 1 : 0;
    await tiles.nth(target).click();
    const after = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    check(name, "the ◇ Shown now mark moves to the selected tile", /shown now/.test(after[target]) && after.filter((a) => /shown now/.test(a)).length === 1, `target=${target}`);
    const caption = (await trigger.innerText()).replace(/\s+/g, " ");
    check(name, "the Set caption follows the preview", caption !== firstCaption, `"${caption}"`);
    // A preview is the one radio a reader hears as selected (the shown one); no tile is anyone's pick.
    const states = await tiles.evaluateAll((els) => els.map((e) => [e.getAttribute("aria-checked"), e.getAttribute("aria-label") ?? ""]));
    const checkedTiles = states.filter(([c]) => c === "true");
    check(name, "the previewed tile is the only one selected, and nothing is a pick", checkedTiles.length === 1 && /shown now/.test(checkedTiles[0][1]) && !states.some(([, a]) => /your pick/.test(a)), `checked=${checkedTiles.length}`);
    await shot("previewing");

    const add = card(page).getByRole("button", { name: /Add to collection/ }).locator("visible=true").first();
    if (await add.count()) {
      await add.click();
      const edit = page.locator('[role="dialog"]').filter({ hasText: /Edit copies|Add cards|Add to collection/ }).last();
      await edit.waitFor({ timeout: 30_000 });
      const m = /\((\w+)\), number (\S+?),/.exec(arias[target] ?? "");
      await page.waitForFunction(() => ![...document.querySelectorAll('[role="dialog"]')].some((d) => /Reading your copies/.test(d.textContent ?? "")), null, { timeout: 30_000 });
      const body = (await edit.innerText()).replace(/\s+/g, " ");
      check(name, "Add to collection opens with the previewed printing chosen", !!m && body.includes(`${m[1]} · #${m[2]}`) && /Add another printing/.test(body), `want="${m?.[1]} · #${m?.[2]}"`);
      await shot("edit");
      // The staged line makes Escape ask first (itself the preset's proof): discard it, nothing was saved.
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Discard", exact: true }).click({ timeout: 10_000 });
      await page.waitForTimeout(800);
    } else {
      check(name, "Add to collection is offered", false, "no button");
    }

    // A fresh open: the preview was forgotten with the card.
    // Close whatever is up (Escape leaves the card, then the search), then open the card afresh.
    for (let i = 0; i < 4 && (await page.getByRole("dialog").count()) > 0; i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
    }
    await openCard();
    const reopened = card(page).getByRole("button", { name: /printings\. Select one to see it here/ }).locator("visible=true").first();
    await reopened.waitFor({ timeout: 15_000 });
    const back = (await reopened.innerText()).replace(/\s+/g, " ");
    check(name, "closing forgets the preview", back === firstCaption, `"${back}"`);
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
