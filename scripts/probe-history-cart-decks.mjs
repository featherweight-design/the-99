// A cart purchase's History row names the decks it was bought for, and an add's row names the decks its copies
// went to, entry line and row lines (History deck line, PRs 1 and 3; Hugh 2026-10-13), walked in a real browser at 390x844 and 1300x900.
//
// The row's line reads "From Shopping for all decks. Bought for A, B, C, 2 more and a deck you've since deleted.", each living deck linking to its page. JSDOM has no layout, so this reads the page the server drew
// from a real ledger row: it writes ONE `collection_history` entry sourced `shopping:cart:<ids>` under the
// account it signs in as (five of its decks and one id that is no deck) and deletes it in a `finally`.
// Point it at `local-dev`, never production or staging (it checks the branch).
//
//   PROBE_BASE=http://localhost:3000 node scripts/probe-history-cart-decks.mjs
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1300, height: 900 },
];

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
  return page.evaluate(() => window.Clerk.user.id);
}

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

let entryId = null;
let addId = null;
await clerkSetup();
const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
if (!branch || branch === PRODUCTION || branch === STAGING) {
  throw new Error(`refusing to write a fixture to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
}
const browser = await chromium.launch();
try {
  const setup = await browser.newContext();
  const sp = await setup.newPage();
  const userId = await signIn(sp);
  await setup.close();

  const decks = await sql`select id, name from decks where user_id = ${userId} order by created_at limit 5`;
  if (decks.length < 5) throw new Error("the account needs five decks for the fixture");
  const [card] = await sql`select oracle_id, name from cards where commander_legal order by name limit 1`;
  entryId = randomUUID();
  const ids = [...decks.map((d) => d.id).slice(0, 2), randomUUID(), ...decks.map((d) => d.id).slice(2)];
  const row = { oracleId: card.oracle_id, setCode: "lea", collectorNumber: "1", finish: "nonfoil", name: card.name,
    before: null, after: { quantity: 1, scryfallId: null, condition: null } };
  await sql`
    insert into collection_history (id, user_id, kind, source, rows, raised, lowered)
    values (${entryId}, ${userId}, 'edit', ${`shopping:cart:${ids.join(",")}`}, ${JSON.stringify([row])}::jsonb, 1, 0)`;

  // An add entry whose two rows went to decks 0 and 1, and to deck 2 (`wentTo`, kept at arrival).
  addId = randomUUID();
  const addRow = (n, setNum, deckIds) => ({
    oracleId: card.oracle_id, setCode: "lea", collectorNumber: setNum, finish: "nonfoil", name: n,
    before: null, after: { quantity: 1, scryfallId: null, condition: null },
    wentTo: { decks: deckIds.map((deckId) => ({ deckId, copies: 1 })) },
  });
  await sql`
    insert into collection_history (id, user_id, kind, source, rows, raised, lowered)
    values (${addId}, ${userId}, 'add', null,
      ${JSON.stringify([addRow("Probe Card One", "1", [decks[0].id, decks[1].id]), addRow("Probe Card Two", "2", [decks[2].id])])}::jsonb, 2, 0)`;

  for (const w of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      hasTouch: w.name === "phone",
      isMobile: w.name === "phone",
    });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/collection/history`, { waitUntil: "domcontentloaded" });
    const entry = onPage(page, `[id="entry-${entryId}"]`);
    await entry.waitFor({ timeout: 30_000 });
    const line = entry.locator("p", { hasText: "Bought for" }).first();
    await line.waitFor({ timeout: 10_000 });
    const text = (await line.textContent()) ?? "";
    const want = `From Shopping for all decks. Bought for ${decks[0].name}, ${decks[1].name}, ${decks[2].name}, 2 more and a deck you’ve since deleted.`;
    check(text === want, `${w.name}: the cart row names its decks`, text === want ? "exact line" : `got "${text}"`);
    const hrefs = await line.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check(hrefs.length === 4 && hrefs[0] === "/decks/shopping" && hrefs.slice(1).every((h, i) => h === `/decks/${decks[i].id}`), `${w.name}: the cart link then one link per named deck`, hrefs.join(" "));
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(fits, `${w.name}: the page does not scroll sideways`, fits ? "fits" : "overflows");
    // The add entry: its line names the decks in the order its rows do, and the opened rows say their own.
    const add = onPage(page, `[id="entry-${addId}"]`);
    await add.waitFor({ timeout: 30_000 });
    const entryLine = add.locator("p", { hasText: "Went to" }).first();
    const entryText = (await entryLine.textContent()) ?? "";
    const wantEntry = `Went to ${decks[0].name}, ${decks[1].name} and ${decks[2].name}.`;
    check(entryText === wantEntry, `${w.name}: the add entry names where its copies went`, entryText === wantEntry ? "exact line" : `got "${entryText}"`);
    await add.locator('button[aria-expanded="false"]').first().click();
    await add.getByText("Probe Card Two").first().waitFor({ timeout: 15_000 });
    const rowLines = await add.locator("li span").evaluateAll((els) => els.map((e) => e.textContent).filter((t) => /^Went to /.test(t ?? "")));
    const wantRows = [`Went to ${decks[0].name} and ${decks[1].name}.`, `Went to ${decks[2].name}.`];
    check(JSON.stringify(rowLines) === JSON.stringify(wantRows), `${w.name}: each row says its own decks`, JSON.stringify(rowLines));
    const fits2 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(fits2, `${w.name}: the opened entry does not scroll the page sideways`, fits2 ? "fits" : "overflows");
    await context.close();
  }
} finally {
  for (const id of [entryId, addId]) if (id) await sql`delete from collection_history where id = ${id}`;
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
