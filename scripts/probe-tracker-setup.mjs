// probe:tracker-setup — the life tracker's setup screen (F02, F02b, F02c) pressed in a real browser at 390x844 and
// 1300x820, on a four-seat table. It asserts what the boards draw and what the setup does:
//   - the header: "Set up the game", and a 44px ✕ that is a link back to the table;
//   - the lead line under it;
//   - the Table row (84px) offers the screen's four-seat tables as 64x72 tiles, first one checked (on a phone, two long
//     sides first);
//   - the Starting life and Who goes first rows are 56px with a top hairline, the stepper's buttons 44px, and − moves
//     the value;
//   - I'll pick starts on the viewer's own seat, so Start is enabled in both modes;
//   - Start is 52px and its foot sits inside the viewport (pinned), and pressing it opens the board on the chosen
//     table (the layout the device saves).
// It writes nothing to the database: setup and the game it starts live in the browser. The audit account must sit at a
// four-seat table (`scripts/seed-rule-zero-fixture.mts`'s S4 on a scratch branch); production and staging are refused.
//
//   PROBE_BASE=http://localhost:3392 node scripts/probe-tracker-setup.mjs
// Optional: SETUP_TABLE (default the fixture's S4), PROBE_SHOTS=<dir> to keep a photograph of each width.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");
const TABLE = process.env.SETUP_TABLE ?? "7a0e0000-0000-4000-8000-000000000013";
const SHOTS = process.env.PROBE_SHOTS;
const WIDTHS = [
  { label: 390, viewport: { width: 390, height: 844 } },
  { label: 1300, viewport: { width: 1300, height: 820 } },
];

let failures = 0;
function report(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const box = (loc) => loc.boundingBox().then((b) => b ?? { x: 0, y: 0, width: 0, height: 0 });
const near = (a, b) => Math.abs(a - b) <= 0.5;

async function walk(browser, width) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label}: ${s}`;
  try {
    await signIn(page);
    // A game this device already holds would open the board, not setup.
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/friends/table/${TABLE}/play`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    // The fixture seats the account at ten tables, and their "seated you" notices stack over the screen; this probe is
    // about setup, so it sets them aside.
    await page.addStyleTag({ content: "[data-seat-notice-stack]{display:none!important}" });
    const setup = page.getByTestId("tracker-setup");
    await setup.waitFor({ timeout: 60_000 }).catch(async (error) => {
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/tracker-setup-stopped-${width.label}.png` });
      throw new Error(`no setup at ${page.url()}: ${(await page.locator("body").innerText()).slice(0, 160).replace(/\s+/g, " ")}`, { cause: error });
    });

    const title = (await setup.locator("h1").innerText()).trim();
    report(L('the header reads "Set up the game"'), title === "Set up the game", title);
    const close = setup.getByRole("link", { name: "Close" });
    const closeOk = (await close.count()) === 1;
    const cb = closeOk ? await box(close) : null;
    report(
      L("the ✕ is a 44px link back to the table"),
      closeOk && near(cb.width, 44) && near(cb.height, 44) && (await close.getAttribute("href")) === `/friends/table/${TABLE}`,
      closeOk ? `${cb.width}x${cb.height} ${await close.getAttribute("href")}` : "no Close link",
    );
    const lead = await setup.getByText(width.viewport.width < 768 ? "Lay the phone flat and drag each player to the side they sit on." : "Lay the device flat and drag each player to the side they sit on.").isVisible();
    report(L("the lead line is drawn, naming the phone or the device"), lead);

    const group = setup.getByRole("radiogroup", { name: "How the table sits" });
    const tiles = group.getByRole("radio");
    const n = await tiles.count();
    const names = [];
    for (let i = 0; i < n; i += 1) names.push(await tiles.nth(i).getAttribute("aria-label"));
    const firstBox = n ? await box(tiles.first()) : null;
    // A phone offers its two four-seat tables, two long sides first; a tablet has one four-seat table.
    const phone = width.viewport.width < 768;
    const want = phone ? ["Two long sides, two players each", "One player on each side"] : ["Two and two"];
    report(
      L(`the Table row offers ${want.join(", then ")}, as 64x72 tiles`),
      names.join("|") === want.join("|") && near(firstBox.width, 64) && near(firstBox.height, 72),
      `${names.join(" | ")} · ${firstBox?.width}x${firstBox?.height}`,
    );
    report(L("the first table is checked by default"), n > 0 && (await tiles.first().getAttribute("aria-checked")) === "true");
    const tableRow = await box(group.locator("xpath=.."));
    report(L("the Table row is 84px"), near(tableRow.height, 84), `${tableRow.height}`);

    const less = setup.getByRole("button", { name: "Less starting life" });
    const lb = await box(less);
    const lifeRow = await box(less.locator("xpath=../.."));
    const value = setup.locator("output");
    const before = (await value.innerText()).trim();
    await less.click();
    const after = (await value.innerText()).trim();
    report(L("the stepper's − is 44px and lowers the life"), near(lb.width, 44) && near(lb.height, 44) && Number(after) === Number(before) - 1, `${lb.width}x${lb.height} ${before} → ${after}`);
    report(L("the Starting life row is 56px with a top hairline"), near(lifeRow.height, 56) && (await less.locator("xpath=../..").evaluate((e) => getComputedStyle(e).borderTopWidth)) === "1px", `${lifeRow.height}`);
    await setup.getByRole("button", { name: "More starting life" }).click();

    const start = setup.getByRole("button", { name: "Start", exact: true });
    const pick = setup.getByRole("button", { name: "I’ll pick" });
    await pick.click();
    // Turn order starts at the viewer's own seat, so their face holds the first cell, and it is the one pressed.
    const chips = setup.locator("[data-testid=seat-map] [data-slot]");
    const firstPressed = await setup.locator("[data-testid=seat-map] [data-slot='0']").getAttribute("aria-pressed");
    const pressedCount = await setup.locator('[data-testid=seat-map] [data-slot][aria-pressed="true"]').count();
    report(
      L("I'll pick starts on your own seat, and Start stays enabled"),
      firstPressed === "true" && pressedCount === 1 && (await start.isEnabled()),
      `${await chips.count()} faces, ${await setup.locator("[data-testid=seat-map] [data-slot='0']").getAttribute("aria-label")}`,
    );
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tracker-setup-pick-${width.label}.png` });
    await setup.getByRole("button", { name: "Random" }).click();
    const sb = await box(start);
    report(L("Start is 52px and pinned inside the viewport"), near(sb.height, 52) && sb.y + sb.height <= width.viewport.height, `${sb.height}px, foot at ${sb.y + sb.height} of ${width.viewport.height}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tracker-setup-${width.label}.png` });

    // On a phone, Start opens the board on the chosen table; a wider screen offers the phone's tables only when it has none.
    await start.click();
    await page.getByTestId("tracker-play").waitFor({ timeout: 30_000 });
    const saved = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i += 1) {
        const v = localStorage.getItem(localStorage.key(i)) ?? "";
        const m = v.match(/"layout":"([a-z0-9-]+)"/);
        if (m) return m[1];
      }
      return null;
    });
    report(L("Start opens the board on the chosen table"), saved === "phone-4-sides" || (width.label === 1300 && saved?.startsWith("tablet-")), `${saved}`);
  } catch (error) {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/tracker-setup-stopped-${width.label}.png` }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

const [{ branch } = {}] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
assertNotSharedBranch(branch, "probe:tracker-setup");
await clerkSetup();
const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    try {
      await walk(browser, width);
    } catch (error) {
      report(`${width.label}: the walk stopped`, false, String(error?.message ?? error).split("\n")[0]);
    }
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
