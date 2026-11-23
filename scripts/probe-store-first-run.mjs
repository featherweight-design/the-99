// probe:store-first-run — store choice UI-4b (handoff design_handoff_the99_store_choice, Q1; Onboarding O1 to O4):
// Home's first-run checklist carries an unnumbered "Where do you buy cards?" row after the signature row and before Add
// your friends, holding the stores as one radio switch at the reader's store; a press is saved at once. Pressed in
// Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does:
//   - The real first-run Home draws the row in its place (after the signature row, before the Friends row), the kicker
//     still reads Step 1 of 3, and the reader's store is the chosen segment, not Mana Pool by default.
//   - The switch fits its box at both widths (no segment clipped or scrolled away).
//   - A pressed store survives a reload (the server action saved it), and Settings' Store section shows it too.
// Fails on main: there is no `[data-first-run-store]` row.
//
// FIXTURE: a scratch branch of local-dev, which the worktree's `.env` DATABASE_URL and the dev server both read, where
// the audit account has a user STORE_PREFERENCE_ENABLED override 'on'. First run needs no cards and no decks, so the
// probe PARKS the account's collection_items and decks under another user id for the run and puts them back in a
// finally. It also writes the account's user_prefs.preferred_store through the page, and puts the starting store back.
//
//   PROBE_BASE=http://localhost:3158 PROBE_USER_ID=<audit account's Clerk id> pnpm probe:store-first-run
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname)) {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback dev server only`);
  }
}
const USER = process.env.PROBE_USER_ID;
if (!USER) throw new Error("Set PROBE_USER_ID to the audit account's Clerk user id (its rows are parked for the run).");
const PARKED = `${USER}__parked_probe_store_first_run`;

const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1300", width: 1300, height: 900 },
];

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") || !password
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
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

const chosenSegment = (row) => row.locator('[role=radio][aria-checked="true"]').getAttribute("data-store-segment");

async function home(page) {
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  // The first-run tour opens over the page once; it is not what this probe measures.
  await page.keyboard.press("Escape").catch(() => {});
  return page.locator("[data-first-run-store]");
}

async function press(page, row, store) {
  // The press must reach the hydrated page, so wait for the server action's POST.
  const posted = page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers(), { timeout: 30_000 });
  await row.locator(`[data-store-segment=${store}]`).click();
  await posted;
  const toast = await page.getByRole("alert").filter({ hasText: "couldn" }).count();
  check(toast === 0, `pressing ${store} raises no failure toast`, `${toast} alert(s)`);
}

async function run(size, start) {
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: size.width, height: size.height } })).newPage();
    await signIn(page);
    const row = await home(page);
    // The checklist itself first, so a run on main shows the page is in first run and only the row is missing.
    const checklist = await page.locator("#first-run-step-3-title").waitFor({ timeout: 30_000 }).then(() => true, () => false);
    check(checklist, `${size.name}: Home draws the first-run checklist`, checklist ? "present" : "absent");
    const drawn = await row.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    check(drawn, `${size.name}: the first-run store row is drawn`, drawn ? "present" : "absent");
    if (!drawn) return;

    const order = await page.evaluate(() => {
      const r = document.querySelector("[data-first-run-store]");
      const before = (sel) => {
        const e = document.querySelector(sel);
        return e ? Boolean(e.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
      };
      return {
        step3: before("#first-run-step-3-title"),
        // Drawn only until the account picks or skips a signature card; null when this account has done so.
        signature: before("[data-signature-row]"),
        next: r.nextElementSibling?.hasAttribute("data-friends-row") ?? false,
      };
    });
    check(order.step3 === true, `${size.name}: after step 3`, String(order.step3));
    check(order.signature !== false, `${size.name}: after the signature row, when drawn`, order.signature === null ? "not drawn" : String(order.signature));
    check(order.next, `${size.name}: Add your friends comes next`, String(order.next));
    const kicker = await page.getByText("Step 1 of 3").count();
    check(kicker > 0, `${size.name}: the kicker still reads Step 1 of 3`, `${kicker}`);
    const first = await chosenSegment(row);
    check(first === start, `${size.name}: the reader's store is chosen`, `${first} / ${start}`);

    const fit = await row.evaluate((r) => {
      const box = r.getBoundingClientRect();
      const well = r.querySelector("[role=radiogroup]");
      const segs = [...r.querySelectorAll("[role=radio]")].map((s) => s.getBoundingClientRect());
      return {
        overflow: well.scrollWidth - well.clientWidth,
        outside: segs.filter((s) => s.right > box.right + 0.5 || s.left < box.left - 0.5).length,
        page: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(fit.overflow <= 0 && fit.outside === 0 && fit.page <= 0, `${size.name}: the switch fits its box`, JSON.stringify(fit));

    const other = start === "cardkingdom" ? "tcgplayer" : "cardkingdom";
    try {
      await press(page, row, other);
      const shown = await chosenSegment(row);
      check(shown === other, `${size.name}: the press shows at once`, String(shown));
      const reloaded = await chosenSegment(await home(page));
      check(reloaded === other, `${size.name}: the pressed store survives a reload`, String(reloaded));
      await page.goto(`${BASE}/settings`, { waitUntil: "load" });
      const settings = await page.locator("#settings-store input[type=radio]:checked").getAttribute("value");
      check(settings === other, `${size.name}: Settings shows the store chosen at first run`, String(settings));
    } finally {
      const back = await home(page);
      await back.waitFor({ timeout: 30_000 });
      if ((await chosenSegment(back)) !== start) await press(page, back, start);
      const now = await chosenSegment(await home(page));
      check(now === start, `${size.name}: the starting store is put back`, String(now));
    }
  } finally {
    await browser.close();
  }
}

// It parks the audit account's rows and writes its store through the dev server, which reads the same DATABASE_URL:
// refuse production, staging and local-dev by `neon.branch_id` before the first write.
const sql = neon(DATABASE_URL);
{
  const [row] = await sql`select current_setting('neon.branch_id', true) as branch`;
  assertScratchBranch(row?.branch, "probe:store-first-run");
}
const [{ store: saved } = {}] = await sql`select preferred_store as store from user_prefs where user_id = ${USER}`;
const start = saved ?? "manapool";
await sql`update collection_items set user_id = ${PARKED} where user_id = ${USER}`;
await sql`update decks set user_id = ${PARKED} where user_id = ${USER}`;
try {
  await clerkSetup();
  for (const size of WIDTHS) await run(size, start);
} finally {
  await sql`update collection_items set user_id = ${USER} where user_id = ${PARKED}`;
  await sql`update decks set user_id = ${USER} where user_id = ${PARKED}`;
  console.log("restored the parked collection and decks");
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
