// probe:delete-warning — the deletion warning on Manage account (buying credits §7, D1/D2; plan E6, U5), in a real
// browser at 1300x900 (the popover) and 390x844 (the sheet).
//
// What the unit tests cannot see: the real read of held paid credits through `readAllowance` against Postgres, the
// payments switch resolved per reader from `flag_overrides`, and the press leaving for Clerk's hosted page. Cases:
//   a  no paid credits, payments ON: Manage account goes straight to Clerk; no warning is drawn
//   b  a 40-credit pack, payments ON, at 1300: the warning names 40, draws the Packs cell alone (D2), and Continue goes on
//   c  74 plan + 40 pack, payments OFF, at 1300: the warning still opens, names 114 and both cells (D1); ✕ stays put
//   d  a 40-credit pack at 390: the warning is the sheet; Continue goes on
//   e  a welcome lot only (a gift, not a purchase): no warning
// "Goes to Clerk" means the page started a navigation off this origin; it is recorded and aborted, never followed.
//
// IT WRITES: the signed-in account's `credit_grants` (paid and welcome lots it seeds and removes) and one
// `flag_overrides` row for `PAYMENTS_ENABLED` on that account. So it refuses anything but a scratch branch, by the
// branch the database reports (`assertScratchBranch`), and restores both tables for the account in a `finally`.
//
//   PROBE_BASE=http://localhost:3392 PROBE_DATABASE_URL=… pnpm probe:delete-warning
// The server must read the same database (its `.env` `DATABASE_URL`).
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, PROBE_DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "PROBE_DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");

const sql = neon(PROBE_DATABASE_URL);
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertScratchBranch(branch, "probe:delete-warning");

const MARK = `probe-delete-warning-${Date.now()}`;
const PAGE = process.env.PROBE_PAGE ?? "/about";
const DIALOG = '[role="dialog"]:has([data-delete-warning])';
let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${saw === undefined ? "" : `  (${saw})`}`);
};

async function signIn(page) {
  // A client-side failure draws the error screen with nothing in the server's log: print it.
  page.on("pageerror", (e) => console.log(`PAGE ERROR  ${String(e?.stack ?? e).slice(0, 900)}`));
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
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
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
  // Each visit waits for `load`: leaving a page while its stream is still arriving cuts that stream, and React's
  // reveal script then fails on the half-written document.
  await page.goto(`${BASE}${PAGE}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.Clerk?.loaded && window.Clerk.user?.id, null, { timeout: 30_000 });
  return page.evaluate(() => window.Clerk.user.id);
}

/** The account's lots and its payments override, as the probe found them, so the `finally` can put them back. */
async function snapshot(userId) {
  return {
    // As Postgres's own JSON, so a timestamp column (no zone) goes back exactly: the driver would parse it as local time.
    grants: (await sql`select row_to_json(t)::text as j from credit_grants t where user_id = ${userId}`).map((r) => r.j),
    overrides: (await sql`select row_to_json(t)::text as j from flag_overrides t where switch = 'PAYMENTS_ENABLED' and scope = 'user' and user_id = ${userId}`).map((r) => r.j),
  };
}

async function setCase(userId, { plan = 0, pack = 0, welcome = 0, payments }) {
  await sql`delete from credit_grants where user_id = ${userId}`;
  const future = new Date(Date.now() + 20 * 86_400_000);
  if (plan) await sql`insert into credit_grants (user_id, source, units, expires_at, external_id) values (${userId}, 'plan', ${plan}, ${future}, ${`${MARK}-plan`})`;
  if (pack) await sql`insert into credit_grants (user_id, source, units, external_id) values (${userId}, 'pack', ${pack}, ${`${MARK}-pack`})`;
  if (welcome) await sql`insert into credit_grants (user_id, source, units, expires_at, external_id) values (${userId}, 'welcome', ${welcome}, ${future}, ${`${MARK}-welcome`})`;
  await sql`delete from flag_overrides where switch = 'PAYMENTS_ENABLED' and scope = 'user' and user_id = ${userId}`;
  await sql`insert into flag_overrides (switch, scope, user_id, value, note, updated_by) values ('PAYMENTS_ENABLED', 'user', ${userId}, ${payments ? "on" : "off"}, ${MARK}, ${MARK})`;
}

/** Opens the account menu and presses Manage account; reports whether the page then tried to leave for Clerk. */
async function pressManage(page, left) {
  left.length = 0;
  // Any page carries the account menu; a light one keeps the probe off the collection's size.
  await page.goto(`${BASE}${PAGE}`, { waitUntil: "load" });
  const trigger = page.locator("[data-account-trigger]:visible").first();
  if (!(await trigger.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false))) {
    const where = await page.evaluate(() => ({ url: location.href, triggers: document.querySelectorAll("[data-account-trigger]").length }));
    throw new Error(`no visible account trigger: ${JSON.stringify(where)}`);
  }
  await trigger.click();
  await page.getByRole("menuitem", { name: "Manage account" }).click();
  await page.waitForTimeout(1_500);
}

async function run(browser, userId, w) {
  const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone, serviceWorkers: "block" });
  const page = await context.newPage();
  const left = [];
  // A navigation off this origin is Clerk's hosted page: record it, abort it. Only off-origin requests are routed:
  // routing the app's own streamed pages through the probe closes their streams early and breaks hydration.
  const home = new URL(BASE).origin;
  await page.route((url) => url.origin !== home, (route) => {
    const req = route.request();
    if (req.isNavigationRequest()) {
      left.push(req.url());
      return route.abort();
    }
    return route.continue();
  });
  try {
    await signIn(page);
    for (const c of w.cases) {
      await setCase(userId, c.seed);
      await pressManage(page, left);
      const dialog = page.locator(DIALOG);
      const shown = (await dialog.count()) > 0;
      check(shown === c.warns, `${w.name} ${c.label}: the warning ${c.warns ? "opens" : "does not open"}`, `shown ${shown}`);
      if (!c.warns) {
        check(left.length > 0, `${w.name} ${c.label}: the press goes on to Clerk`, left[0] ?? "no navigation");
        continue;
      }
      check(left.length === 0, `${w.name} ${c.label}: nothing leaves before the warning is answered`, left[0] ?? "stayed");
      if (process.env.PROBE_SHOTS) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${process.env.PROBE_SHOTS}/delete-warning-${w.name}-${c.label.split(" ")[0]}.png` });
      }
      const title = await dialog.getByRole("heading").first().textContent().catch(() => null);
      check(title === c.title, `${w.name} ${c.label}: the title names the paid total`, title);
      const cells = await dialog.locator("[data-held]").evaluateAll((els) => els.map((e) => e.getAttribute("data-held")));
      check(JSON.stringify(cells) === JSON.stringify(c.cells), `${w.name} ${c.label}: the split shows only what is held`, cells.join(","));
      if (c.then === "continue") {
        await dialog.getByRole("button", { name: "Continue to Manage account" }).click();
        await page.waitForTimeout(1_000);
        check(left.length > 0, `${w.name} ${c.label}: Continue goes on to Clerk`, left[0] ?? "no navigation");
      } else {
        await dialog.getByRole("button", { name: "Close" }).click();
        await page.waitForTimeout(500);
        check((await page.locator(DIALOG).count()) === 0 && left.length === 0, `${w.name} ${c.label}: ✕ closes and stays`, `left ${left.length}`);
      }
    }
  } finally {
    await context.close();
  }
}

await clerkSetup();
const browser = await chromium.launch();
let userId = null;
let saved = null;
try {
  {
    const page = await browser.newPage({ serviceWorkers: "block" });
    userId = await signIn(page);
    await page.close();
  }
  saved = await snapshot(userId);
  const desk = {
    name: "1300", width: 1300, height: 900, phone: false,
    cases: [
      { label: "a · no paid credits, payments on", seed: { payments: true }, warns: false },
      { label: "e · a welcome lot only", seed: { welcome: 15, payments: true }, warns: false },
      { label: "b · a pack, payments on", seed: { pack: 40, payments: true }, warns: true, title: "You have 40 paid credits", cells: ["pack"], then: "continue" },
      { label: "c · plan and pack, payments off", seed: { plan: 74, pack: 40, payments: false }, warns: true, title: "You have 114 paid credits", cells: ["plan", "pack"], then: "close" },
    ],
  };
  const phone = {
    name: "390", width: 390, height: 844, phone: true,
    cases: [{ label: "d · a pack, as the sheet", seed: { pack: 40, payments: true }, warns: true, title: "You have 40 paid credits", cells: ["pack"], then: "continue" }],
  };
  for (const w of [desk, phone]) {
    console.log(`\n── ${w.name}`);
    await run(browser, userId, w);
  }
} finally {
  await browser.close();
  if (userId && saved) {
    // Put the account back as it was found.
    await sql`delete from credit_grants where user_id = ${userId}`;
    // Every column, whatever the schema holds by then: each row goes back through its own table's record type.
    for (const g of saved.grants) {
      await sql`insert into credit_grants select * from json_populate_record(null::credit_grants, ${g}::json)`;
    }
    await sql`delete from flag_overrides where switch = 'PAYMENTS_ENABLED' and scope = 'user' and user_id = ${userId}`;
    for (const o of saved.overrides) {
      await sql`insert into flag_overrides select * from json_populate_record(null::flag_overrides, ${o}::json)`;
    }
  }
}
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
