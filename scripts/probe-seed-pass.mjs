// Gate 6 (side-effect provenance) for #360's fill-pass ledger. A pass row is
// created by *something else happening* — a deck being built — so no amount of
// reading a rendered page proves it fired, fired once, and landed on the right
// deck. This builds two decks in one session and then reads the ledger back.
//
// Run by hand: `node scripts/probe-seed-pass.mjs`.
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const sql = neon(DATABASE_URL);

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
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
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

async function buildDeck(page, name, commanderIndex) {
  await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Select"), [role="radio"], li button').nth(commanderIndex).click();
  await page.waitForTimeout(300);
  await page.fill("#picker-deck-name", name);
  await page.locator('button:has-text("Create deck")').first().click();
  await page.waitForURL(/\/decks\/[0-9a-f-]{36}/, { timeout: 60_000 });
  return page.url().match(/\/decks\/([0-9a-f-]{36})/)[1];
}

const browser = await clerkSetup().then(() => chromium.launch());
const page = await browser.newPage();
await signIn(page);

const stamp = Date.now();
const first = await buildDeck(page, `Pass probe A ${stamp}`, 0);
const second = await buildDeck(page, `Pass probe B ${stamp}`, 1);
console.log(`built ${first} and ${second}`);

for (const [label, deckId] of [["A", first], ["B", second]]) {
  const passes = await sql`
    select p.id, p.kind, p.ordinal, p.open_slots,
           (select count(*) from fill_pass_cards c where c.pass_id = p.id) as members
    from fill_passes p where p.deck_id = ${deckId} order by p.created_at`;
  const [{ count: cards }] = await sql`
    select count(*)::int as count from deck_cards where deck_id = ${deckId}`;
  console.log(`deck ${label}: ${cards} cards, ${passes.length} pass(es)`);
  for (const p of passes) {
    console.log(`  ${p.kind} ${p.ordinal} · open_slots ${p.open_slots} · ${p.members} members`);
  }
  const [{ count: crossed }] = await sql`
    select count(*)::int as count from fill_pass_cards c
    join fill_passes p on p.id = c.pass_id
    where p.deck_id = ${deckId}
      and not exists (
        select 1 from deck_cards d
        where d.deck_id = ${deckId} and d.oracle_id = c.oracle_id)`;
  console.log(`  members not present in this deck: ${crossed}`);
}

await browser.close();
