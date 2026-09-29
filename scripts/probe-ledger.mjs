// Gate 2 (forced-state runtime) for #359's provenance ledger. Every state the
// design table's §13/§14 name is driven in a real browser at both widths: the
// legacy line a pre-ledger deck gets, the seed line and its stated reversal, a
// top-off line with its own undo, the mark landing on the decklist rows below,
// the recount a keep produces, and a refused undo.
//
// Run by hand: `PROBE_BASE=http://localhost:3022 PROBE_DECK=<id> node scripts/probe-ledger.mjs`.
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const DECK = process.env.PROBE_DECK;
const OUT = "probe-out/ledger";

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

/** Back to a deck with its seed pass and nothing else. The fixture deck was
 *  built before the ledger existed, so the seed pass is written here rather
 *  than assumed — that record is what the app writes on a fill today. */
async function resetDeck() {
  await sql`
    delete from deck_cards
     where deck_id = ${DECK}
       and oracle_id in (
         select fpc.oracle_id from fill_pass_cards fpc
           join fill_passes fp on fp.id = fpc.pass_id
          where fp.deck_id = ${DECK} and fp.kind = 'top_off')`;
  await sql`delete from fill_passes where deck_id = ${DECK}`;
  await sql`update deck_cards set auto = true where deck_id = ${DECK}`;
  const [{ n: autos }] = await sql`
    select count(*) n from deck_cards where deck_id = ${DECK} and auto = true`;
  const [seed] = await sql`
    insert into fill_passes (deck_id, kind, ordinal, open_slots)
    values (${DECK}, 'seed', 1, ${Number(autos)}) returning id`;
  await sql`
    insert into fill_pass_cards (pass_id, oracle_id, quantity)
    select ${seed.id}, oracle_id, quantity from deck_cards
     where deck_id = ${DECK} and auto = true`;
  console.log(`[reset] seed pass over ${autos} auto cards`);
}

/** The legacy state: auto cards with no membership record at all. deck_id is
 *  not nullable, so the rows go rather than being detached; `resetDeck` writes
 *  the seed back afterwards. */
async function dropPasses() {
  await sql`delete from fill_passes where deck_id = ${DECK}`;
}

const shots = [];
async function shot(page, label) {
  const file = `${OUT}/${label}.png`;
  await page.screenshot({ path: file, fullPage: false });
  shots.push(file);
}

const ledgerSel = "text=/came from/";

async function openDeck(page) {
  await page.goto(`${BASE}/decks/${DECK}`, { waitUntil: "networkidle" });
  await page.locator(ledgerSel).first().waitFor({ timeout: 20_000 });
}

async function walk(page, width) {
  const w = width === 390 ? "phone" : "desktop";

  await openDeck(page);
  await shot(page, `${w}-1-seed-only`);
  const seedLine = await page.locator("text=the roles and the mana base").count();
  const reversal = await page.locator("text=the sweep reverses it").count();
  console.log(`[${w}] seed line: ${seedLine > 0} · sweep named as its reversal: ${reversal > 0}`);
  const seedUndo = await page.getByRole("button", { name: /Undo the .* from the seed/ }).count();
  console.log(`[${w}] seed offers no undo of its own: ${seedUndo === 0}`);

  // Commit a top-off pass, so the ledger has a second line with a real undo.
  const door = page.getByRole("button", { name: /Choose the cards for the last/ });
  await door.click();
  await page.getByRole("checkbox").first().waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /^Add .* cards to the deck/ }).click();
  await page.waitForTimeout(4000);
  await shot(page, `${w}-2-two-lines`);
  const passLine = await page.locator("text=/you chose from the last/").count();
  console.log(`[${w}] top-off line drawn: ${passLine > 0}`);

  // The mark: press it, count the marked rows in the decklist below.
  const mark = page.getByRole("button", { name: /^Mark the .* from 1st top-off in the deck below$/ });
  await mark.click();
  await page.waitForTimeout(300);
  // The control renames itself once pressed, so the pressed state is read off
  // the clear-label locator rather than the one that was clicked.
  const pressed = page.getByRole("button", { name: /^Clear the mark on 1st top-off$/ });
  const markedRows = await page.locator("text=/^from 1st top-off$/").count();
  console.log(`[${w}] mark pressed: ${await pressed.getAttribute("aria-pressed")} · marked rows: ${markedRows}`);
  await shot(page, `${w}-3-marked`);

  // And clears, by the same control.
  await page.getByRole("button", { name: /^Clear the mark on 1st top-off$/ }).click();
  await page.waitForTimeout(300);
  console.log(`[${w}] mark cleared: ${(await page.locator("text=/^from 1st top-off$/").count()) === 0}`);

  // The recount. A keep clears the auto flag, so the pass's line stops claiming
  // that card and states what became of it instead. Forced in the database so
  // the count is known rather than whichever row a click happened to land on.
  await sql`
    update deck_cards set auto = false
     where deck_id = ${DECK}
       and oracle_id = (
         select fpc.oracle_id from fill_pass_cards fpc
           join fill_passes fp on fp.id = fpc.pass_id
          where fp.deck_id = ${DECK} and fp.kind = 'top_off'
          order by fpc.oracle_id limit 1)`;
  await openDeck(page);
  console.log(`[${w}] recount after a keep: ${(await page.locator("text=/1 now yours/").count()) > 0}`);
  await shot(page, `${w}-3b-recounted`);

  // Forced failure: kill the undo's POST. The line stays, the control comes
  // back, and the refusal is stated rather than thrown.
  await page.route("**/decks/**", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await page.getByRole("button", { name: /Undo the .* from 1st top-off/ }).click();
  await page.waitForTimeout(2000);
  const refusal = await page.locator("text=/couldn’t put those back/").count();
  const stillThere = await page.getByRole("button", { name: /Undo the .* from 1st top-off/ }).count();
  console.log(`[${w}] undo refused and said so: ${refusal > 0} · line survived: ${stillThere > 0}`);
  await shot(page, `${w}-4-undo-refused`);
  await page.unroute("**/decks/**");

  // Forced in-flight: hold the POST open long enough to read the label, and to
  // see that the seed's line beside it is untouched.
  await page.route("**/decks/**", async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 4000));
    await route.continue();
  });
  await page.getByRole("button", { name: /Undo the .* from 1st top-off/ }).click();
  await page.waitForTimeout(900);
  console.log(`[${w}] in-flight label: ${(await page.locator("text=/Putting .* back…/").count()) > 0}`);
  await shot(page, `${w}-5-undo-inflight`);
  await page.waitForTimeout(6000);
  await page.unroute("**/decks/**");
  await page.waitForTimeout(1500);
  console.log(`[${w}] pass gone after undo: ${(await page.locator("text=/you chose from the last/").count()) === 0}`);
  await shot(page, `${w}-6-after-undo`);

  // The legacy line: auto cards the app has no record for.
  await dropPasses();
  await openDeck(page);
  const legacy = await page.locator("text=/built before we started keeping this record/").count();
  console.log(`[${w}] legacy line for a pre-ledger deck: ${legacy > 0}`);
  await shot(page, `${w}-7-legacy`);
}

const browser = await clerkSetup().then(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await signIn(page);
await resetDeck();
await walk(page, 1280);

const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  storageState: await page.context().storageState(),
});
await resetDeck();
await walk(phone, 390);

console.log(`\nshots:\n${shots.join("\n")}`);
await browser.close();
