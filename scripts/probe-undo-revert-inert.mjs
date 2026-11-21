// Undo on the collection toast, with card details open (Hugh's bug): pressing Undo opens the Revert dialog, and its Revert button
// must be PRESSABLE. The Edit copies toast lives in the shell beside <main>; a card modal over the page makes everything beside its
// path inert, so a Revert dialog drawn inside the toast's wrapper was inert with it. The probe adds one copy of an owned card from
// its details, presses Undo, checks the dialog is not under an `inert` ancestor, presses Revert, and asserts the revert happened (the
// dialog closes only through `onReverted`; a stale, short or refused answer keeps it open). It FAILS on main.
//
// Writes: one copy added then reverted on the audit account's collection. Point it at local-dev or a scratch branch, NEVER production
// or staging. PROBE_OWNED_QUERY must name a card the account owns (default Sol Ring).
//   PROBE_BASE=http://localhost:3721 node scripts/probe-undo-revert-inert.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const QUERY = process.env.PROBE_OWNED_QUERY ?? "Sol Ring";
let failed = 0;
const check = (width, label, ok, saw) => {
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} [${width}] ${label}: ${saw}`);
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

async function takeBack(page) {
  const press = (role, label) =>
    page.evaluate(([r, l]) => {
      const el = [...document.querySelectorAll(r)].find((e) => e.textContent?.trim() === l && !e.disabled);
      el?.click();
      return Boolean(el);
    }, [role, label]);
  const dialog = page.getByRole("dialog", { name: /^Revert/ });
  if (!(await dialog.count()) && !(await press("button", "Undo"))) throw new Error("no Undo toast or Revert dialog to take the copy back with");
  await dialog.waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((e) => e.textContent?.trim() === "Revert" && !e.disabled), null, { timeout: 90_000 });
  await press("button", "Revert");
  await dialog.waitFor({ state: "detached", timeout: 30_000 });
}

async function run(browser, name, { width, height, touch }) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, serviceWorkers: "block" });
  const page = await ctx.newPage();
  let added = false;
  let reverted = false;
  try {
    await signIn(page);
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 8 && !(await sheet(page).isVisible()); i++) {
      await page.getByRole("button", { name: "Search all cards", exact: true }).locator("visible=true").first().click();
      await sheet(page).waitFor({ timeout: 3_000 }).catch(() => {});
    }
    await sheet(page).getByRole("combobox").fill(QUERY);
    const option = sheet(page).getByRole("option").first();
    await option.waitFor({ timeout: 30_000 });
    await option.click();
    await card(page).first().waitFor({ timeout: 30_000 });
    const more = card(page).first().getByRole("button", { name: /All details/ }).locator("visible=true").first();
    if (await more.count()) await more.click();

    await card(page).getByRole("button", { name: /Edit copies/ }).locator("visible=true").first().click();
    const edit = page.getByRole("dialog", { name: "Edit copies" });
    await edit.waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => !document.body.textContent?.includes("Reading your copies"), null, { timeout: 30_000 });
    await edit.getByRole("button", { name: "More", exact: true }).first().click();
    await edit.getByRole("button", { name: "Save", exact: true }).click();
    added = true;

    const undo = page.getByRole("button", { name: "Undo", exact: true }).locator("visible=true").first();
    await undo.waitFor({ timeout: 30_000 });
    await undo.click();
    const revert = page.getByRole("dialog", { name: /^Revert/ });
    await revert.waitFor({ timeout: 30_000 });
    const button = revert.getByRole("button", { name: "Revert", exact: true });
    await button.waitFor({ timeout: 30_000 });
    // The dry run reads first (a dev server compiles the action on first use): the button is disabled until it lands.
    await page.waitForFunction((el) => !el.disabled, await button.elementHandle(), { timeout: 90_000 });
    const inertAbove = await button.evaluate((el) => el.closest("[inert]") !== null);
    check(name, "the Revert dialog is not under an inert ancestor", !inertAbove, inertAbove ? "inert ancestor" : "live");
    const hit = await button.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top === el || el.contains(top);
    });
    check(name, "the Revert button is what a press at its centre lands on", hit, String(hit));
    // Disabled while the dry run reads (a dev server compiles the action on first use): the press waits for it.
    await button.click({ timeout: 60_000 });
    const gone = await revert.waitFor({ state: "detached", timeout: 15_000 }).then(() => true, () => false);
    check(name, "pressing Revert reverts: the dialog closes (only on success)", gone, gone ? "closed" : "still open");
    reverted = gone;
  } catch (error) {
    check(name, "walk completed", false, String(error?.message ?? error).split("\n").slice(0, 8).join(" / "));
  } finally {
    // A run that failed after the copy was saved leaves it on the account: take it back. `el.click()` goes around `inert`, which is
    // exactly what a failing run is stuck behind.
    if (added && !reverted) await takeBack(page).catch((error) => console.log(`  cleanup failed: ${error?.message ?? error}`));
    await ctx.close();
  }
}

await clerkSetup();
const browser = await chromium.launch();
for (const [name, size] of Object.entries(SIZES)) await run(browser, name, size);
await browser.close();
console.log(failed ? `${failed} FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
