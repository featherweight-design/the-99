// Presses the log-your-game reminder's closed-table surfaces on a dev server, at 390 and 1300 wide (plan
// 2026-11-21-log-reminder.md, PR 2a; PR 2b adds the Home card). Needs `scripts/seed-log-reminder-fixture.mts` on a scratch
// branch, `pnpm dev` on that branch, and the audit account: PROBE_BASE names the server (a localhost, pk_test instance).
//   C1  the closed page draws `Your game`; pressing `Log this game` lands on the deck's Games tab with `game=<ms>` and
//       the prefilled form (`log-from`)
//   L1  the logged game draws its note and no button
//   H   Home's Game to log card (PR 2b): two games draw as rows (C1 and C3); ✕ on a row hides it and Undo restores it;
//       with one left the card is the one-game card whose `Log this game` lands on the prefilled form; at 1300 the hide
//       is also read back after a reload (it is stored, not just client state)
//   C2  past the keep window the page says nothing fills in, and `Log it by hand` lands on the deck's blank Log form
// It fails on `main`: there the closed page has no `Your game` card, and a table past its keep window is not found.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv(["E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error(`refusing: PROBE_BASE must be a server on this machine, got ${BASE}`);
const IDS = { C1: "7a0e0000-0000-4000-8000-0000000000c1", L1: "7a0e0000-0000-4000-8000-0000000000a1", C2: "7a0e0000-0000-4000-8000-0000000000c2", C3: "7a0e0000-0000-4000-8000-0000000000c3" };
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failures.push(what); };

await clerkSetup();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
const page = await ctx.newPage();
await setupClerkTestingToken({ page });
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 120000 });
const failure = await page.evaluate(async ([email, password]) => {
  try {
    const signIn = window.Clerk.client.signIn;
    let a = await signIn.create({ identifier: email, password });
    if (a.status === "needs_client_trust") {
      const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
      a = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    }
    if (a.status !== "complete") return `status ${a.status}`;
    await window.Clerk.setActive({ session: a.createdSessionId });
    return null;
  } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
}, [EMAIL, PASSWORD]);
if (failure) throw new Error(`sign-in failed: ${failure}`);

const open = async (id) => {
  await page.goto(`${BASE}/friends/table/${id}`, { waitUntil: "load", timeout: 240000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
};
const press = async (name) => {
  const link = page.getByRole("link", { name, exact: true });
  await link.waitFor({ state: "visible", timeout: 20000 });
  await Promise.all([page.waitForURL(/\/decks\//, { timeout: 120000 }), link.click()]);
};

for (const [w, h] of [[390, 844], [1300, 900]]) {
  await page.setViewportSize({ width: w, height: h });
  const at = `${w}px`;

  await open(IDS.C1);
  try {
    await page.getByTestId("your-game").waitFor({ state: "visible", timeout: 30000 });
    check(true, `${at} C1 draws Your game`);
    await press("Log this game");
    const u = new URL(page.url());
    check(u.searchParams.get("tab") === "games" && u.searchParams.get("table") === IDS.C1 && /^\d+$/.test(u.searchParams.get("game") ?? ""), `${at} C1 Log this game lands on the Games tab with table and game= (${u.pathname}${u.search})`);
    await page.getByTestId("log-from").waitFor({ state: "visible", timeout: 60000 });
    check(true, `${at} C1 the Log form is prefilled from the table`);
  } catch (e) { check(false, `${at} C1: ${String(e.message).split("\n")[0]}`); }

  await open(IDS.L1);
  try {
    await page.getByTestId("your-game").waitFor({ state: "visible", timeout: 30000 });
    const text = await page.getByTestId("your-game").innerText();
    check(/You logged this game on/.test(text) && (await page.getByRole("link", { name: "Log this game", exact: true }).count()) === 0, `${at} L1 draws the logged note and no Log button`);
  } catch (e) { check(false, `${at} L1: ${String(e.message).split("\n")[0]}`); }

  await open(IDS.C2);
  try {
    await page.getByText(/Logging from this table ended .* so nothing is filled in now/).waitFor({ state: "visible", timeout: 30000 });
    check(true, `${at} C2 says nothing is filled in`);
    await press("Log it by hand");
    const u = new URL(page.url());
    check(u.searchParams.get("tab") === "games" && !u.searchParams.has("table") && !u.searchParams.has("game"), `${at} C2 Log it by hand lands on the deck's blank Log form (${u.pathname}${u.search})`);
  } catch (e) { check(false, `${at} C2: ${String(e.message).split("\n")[0]}`); }

  // Home's card. The audit account may hold other unlogged games, so rows are counted against the fixture's two.
  try {
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 240000 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const card = page.getByTestId("home-log-card");
    await card.waitFor({ state: "visible", timeout: 60000 });
    const rows = page.getByTestId("home-log-row");
    // A game is a row, or the lone card once one is left (the card is a different shape at one game).
    const games = () => page.evaluate(() => { const r = document.querySelectorAll('[data-testid="home-log-row"]').length; return r > 0 ? r : document.querySelector('[data-testid="home-log-card"]') ? 1 : 0; });
    const gamesBecome = (k) => page.waitForFunction((k) => { const r = document.querySelectorAll('[data-testid="home-log-row"]').length; return (r > 0 ? r : document.querySelector('[data-testid="home-log-card"]') ? 1 : 0) === k; }, k, { timeout: 10000 });
    const n = await games();
    check(n >= 2, `${at} H Home draws the Games to log rows (${n})`);
    if (process.env.PROBE_SHOTS) await card.screenshot({ path: `${process.env.PROBE_SHOTS}/home-log-rows-${w}.png` });
    const box = await card.boundingBox();
    check(box !== null && box.x >= 0 && box.x + box.width <= w + 1, `${at} H the card fits the viewport (${box && Math.round(box.x)}..${box && Math.round(box.x + box.width)})`);
    // ✕ on the first row hides it, Undo restores it
    await rows.first().getByTestId("home-log-hide").click();
    await gamesBecome(n - 1);
    check(true, `${at} H the ✕ hides a row at once`);
    if (process.env.PROBE_SHOTS && (await games()) === 1) await page.getByTestId("home-log-card").screenshot({ path: `${process.env.PROBE_SHOTS}/home-log-one-${w}-after-hide.png` });
    await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
    await gamesBecome(n);
    check(true, `${at} H Undo brings the row back`);
    if (w === 1300) {
      // Hide the last row, let the action land, reload: one fewer game must come back (a row = a game; a lone card = one).
      await page.getByTestId("home-log-hide").last().click();
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("home-log-card").first().waitFor({ state: "visible", timeout: 60000 }).catch(() => {});
      const total = await games();
      check(total === n - 1, `${at} H the hide is stored: ${n} games became ${total} after a reload`);
      if (total === 1) {
        if (process.env.PROBE_SHOTS) await page.getByTestId("home-log-card").screenshot({ path: `${process.env.PROBE_SHOTS}/home-log-one-${w}.png` });
        await Promise.all([page.waitForURL(/\/decks\//, { timeout: 120000 }), page.getByTestId("home-log-open").click()]);
        const u = new URL(page.url());
        check(u.searchParams.get("tab") === "games" && /^\d+$/.test(u.searchParams.get("game") ?? ""), `${at} H the one-game card's Log this game lands on the Games tab with game=<ms>`);
        await page.getByTestId("log-from").waitFor({ state: "visible", timeout: 60000 });
        check(true, `${at} H the one-game card's Log form is prefilled from the table`);
      }
    } else {
      await rows.first().getByRole("link").first().click(); // the row's own link, before any hide
      await page.waitForURL(/\/decks\//, { timeout: 120000 });
      const u = new URL(page.url());
      check(u.searchParams.get("tab") === "games" && /^\d+$/.test(u.searchParams.get("game") ?? ""), `${at} H a row lands on the Games tab with game=<ms> (${u.pathname}${u.search})`);
      await page.getByTestId("log-from").waitFor({ state: "visible", timeout: 60000 });
      check(true, `${at} H the row's Log form is prefilled from the table`);
    }
  } catch (e) { check(false, `${at} H: ${String(e.message).split("\n")[0]}`); }
}
await browser.close();
if (failures.length) { console.error(`${failures.length} failed`); process.exit(1); }
console.log("all passed");
