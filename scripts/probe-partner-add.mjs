// probe:partner-add — Add a partner to an existing deck (#491), pressed in a real browser at 390x844 and 1300x820.
// Per width, and from each door (the deck header, and the commander's card details box), it opens Change commander on a single-commander deck with a full 99, presses Choose on the first partner,
// confirms with the suggested cut, then asserts the deck now holds the pair (read back from the database) and that the
// toast's Undo restores it: one commander again and the cut card back in the 99. On main there is no Add a partner section,
// so the first wait fails.
// Its writes: it inserts its own deck (`probe:partner-add`, Tormod, the Desecrator plus 98 cards copied from the signed-in
// account's largest deck, padded with basics to 99) and deletes it in `finally`. Production and staging are refused by
// `neon.branch_id`. DATABASE_URL must be the database the dev server reads.
//
//   PROBE_BASE=http://localhost:3291 node scripts/probe-partner-add.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertNotSharedBranch } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const sql = neon(DATABASE_URL);
const NAME = "probe:partner-add";
if (!EMAIL.includes("+clerk_test")) throw new Error("Use a +clerk_test account (see the local-auth note).");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("This probe runs against a local dev server only.");

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
  return page.evaluate(() => window.Clerk.user.id);
}

/** The probe's own deck: a lone partner-capable commander over a full 99. */
async function makeDeck(userId) {
  const [source] = await sql`select d.id from decks d where d.user_id = ${userId} and d.name <> ${NAME}
    order by (select coalesce(sum(quantity), 0) from deck_cards dc where dc.deck_id = d.id) desc limit 1`;
  if (!source) throw new Error("The signed-in account owns no deck to copy cards from.");
  const [tormod] = await sql`select oracle_id from cards where name = 'Tormod, the Desecrator' limit 1`;
  const [swamp] = await sql`select oracle_id from cards where name = 'Swamp' limit 1`;
  const [deck] = await sql`insert into decks (user_id, name, commander_oracle_id) values (${userId}, ${NAME}, ${tormod.oracle_id}) returning id`;
  await sql`insert into deck_cards (deck_id, oracle_id, quantity) select ${deck.id}, oracle_id, 1 from deck_cards
    where deck_id = ${source.id} and oracle_id not in (${tormod.oracle_id}, ${swamp.oracle_id}) limit 98`;
  const [{ n }] = await sql`select coalesce(sum(quantity), 0)::int n from deck_cards where deck_id = ${deck.id}`;
  await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}, ${swamp.oracle_id}, ${99 - n})
    on conflict (deck_id, oracle_id) do update set quantity = excluded.quantity`;
  return deck.id;
}

const state = async (deckId) => {
  const [d] = await sql`select partner_oracle_id from decks where id = ${deckId}`;
  const [{ n }] = await sql`select coalesce(sum(quantity), 0)::int n from deck_cards where deck_id = ${deckId}`;
  return { paired: d?.partner_oracle_id != null, body: n };
};
async function until(deckId, want, ms = 20_000) {
  const end = Date.now() + ms;
  let s = await state(deckId);
  while (Date.now() < end && !want(s)) {
    await new Promise((r) => setTimeout(r, 500));
    s = await state(deckId);
  }
  return s;
}

async function walk(browser, width, userId, deckId, via) {
  const context = await browser.newContext({ viewport: width.viewport });
  const page = await context.newPage();
  const L = (s) => `${width.label} via ${via}: ${s}`;
  try {
    await signIn(page);
    await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    if (via === "details") {
      // The commander's card details: its Second commander box is the second door (#491). On main the box is absent.
      const details = page.getByRole("button", { name: "View card details" }).first();
      await details.waitFor({ timeout: 60_000 });
      await details.click();
      // The phone opens on the peek; the box sits in the full sheet, one press on All details away.
      const more = page.getByRole("button", { name: /^All details/ });
      if (await more.first().waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false)) await more.first().click();
      const box = page.locator("[data-commander-box-cta]");
      const drawn = await box.first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
      if (!report(L("card details draw the Second commander box"), drawn, drawn ? "" : (await page.locator("[role=dialog]").first().innerText().catch(() => "no dialog")).replace(/\s+/g, " ").slice(0, 400))) return;
      await box.first().click();
    } else {
      const door = page.getByRole("button", { name: "Change commander" }).first();
      await door.waitFor({ timeout: 60_000 });
      await door.click();
    }
    const section = page.locator("[data-choose]");
    const opened = await section.first().waitFor({ timeout: 60_000 }).then(() => true, () => false);
    if (!report(L("Add a partner section draws on the sheet"), opened, opened ? "" : (await page.locator("[role=dialog]").first().innerText().catch(() => "no dialog")).replace(/\s+/g, " ").slice(0, 300))) return;
    await section.first().click();
    const make = page.getByRole("button", { name: /^Make .+ commanders$/ });
    await make.waitFor({ timeout: 30_000 });
    report(L("the confirm names a card that leaves"), (await page.getByText("The card that leaves").count()) > 0);
    await make.click();
    const paired = await until(deckId, (s) => s.paired);
    report(L("the deck holds the pair"), paired.paired, `body ${paired.body}`);
    report(L("the pair add took one card out (99 to 98)"), paired.body === 98, `body ${paired.body}`);
    const undo = page.locator("[data-deck-toast-stack]").getByRole("button", { name: "Undo" });
    const shown = await undo.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    report(L("the toast offers Undo"), shown);
    if (!shown) return;
    await undo.click();
    const back = await until(deckId, (s) => !s.paired && s.body === 99);
    report(L("Undo restores one commander and the cut card"), !back.paired && back.body === 99, `paired ${back.paired}, body ${back.body}`);
  } finally {
    await context.close();
  }
}

await clerkSetup();
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
await assertNotSharedBranch(branch, "probe-partner-add");
const browser = await chromium.launch();
let deckId = null;
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const userId = await signIn(page);
  await context.close();
  for (const width of WIDTHS) {
    for (const via of ["header", "details"]) {
      deckId = await makeDeck(userId);
      try {
        await walk(browser, width, userId, deckId, via);
      } finally {
        await sql`delete from decks where id = ${deckId}`;
        deckId = null;
      }
    }
  }
} finally {
  if (deckId) await sql`delete from decks where id = ${deckId}`;
  await browser.close();
}
console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
