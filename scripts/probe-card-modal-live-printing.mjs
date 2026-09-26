// The card modal opens an unowned card on a printing the shop carries NOW, walked in a real
// browser at 1300x900 and 390x844.
//
// The modal's price tag belongs to the printing on screen. An unowned card used to open on its
// printings' first by set code, so a card whose alphabetically-first printing the feed never
// carried read `no stock` over live printings (Zul Ashur on staging: FDC #135 before FDN). The
// rule is `catalogCard`'s, unit tested there; this proves the modal a reader opens draws it.
//
// It finds its own fixture BY QUERY on the database it is pointed at: an unowned, commander-legal
// card whose first printing (set code order) has no live figure in any finish while another
// printing with art has a live non-foil one. It FAILS when there is none, since a run over a card that opens on a live
// printing either way proves nothing. It writes one deck holding that card under the account it
// signs in as and deletes it in a `finally`. Point it at `local-dev`, **never production**.
//
// Run: `node scripts/probe-card-modal-live-printing.mjs`. PROBE_BASE picks the server.

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}: ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
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
  const userId = await page.evaluate(() => window.Clerk.user.id);
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  // Captured BEFORE the write and put back in the run's finally: the About gate is the account's own
  // state, and a probe that only raises it leaves the real audit account changed.
  const prior = await captureAboutSeen(userId);
  restorePrefs = () => restoreAboutSeen(prior);
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  // The version bump's one-time sheet would otherwise sit over every page this walks (E5).
  await clearAboutSheet(page, userId);
  return userId;
}

let restorePrefs = null;
let deckId = null;

/** An unowned card that reproduces the defect here, with the cheapest live figure it should show. */
async function findFixture(userId) {
  const [row] = await sql`
    with newest as (select max(as_of) m from printing_prices),
    firsts as (
      -- The printing the old build opened on: \`comparePrintings\` order, where a collector number with
      -- no digits sorts LAST, strings compare by code unit (collate "C"), and no art filter, because
      -- a printing without its own picture still resolves the oracle's and was drawn first all the same.
      select distinct on (p.oracle_id) p.oracle_id, p.scryfall_id
      from printings p
      order by p.oracle_id, upper(p.set_code) collate "C",
        coalesce(nullif(regexp_replace(p.collector_number, '\\D', '', 'g'), '')::numeric, 9007199254740991),
        p.collector_number collate "C"
    ),
    live as (
      select p.oracle_id, min(pp.price_cents) as cheapest
      from printings p join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where pp.as_of = (select m from newest) and pp.price_cents is not null and p.image_uri is not null
      group by p.oracle_id
    )
    select c.oracle_id, c.name, l.cheapest
    from firsts f join live l using (oracle_id) join cards c using (oracle_id)
    -- No live figure of ANY finish on the first printing, so the old build reads \`no stock\` (or
    -- sold out) there; a foil-only first printing would draw a foil figure instead, a different
    -- state that proves nothing about this one.
    where not exists (
        select 1 from printing_prices pp where pp.scryfall_id = f.scryfall_id
          and pp.as_of = (select m from newest)
          and coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) is not null)
      -- Nor on the oracle's own printing: when that one is live the modal opens on it by design,
      -- and a pricier oracle printing is not the cheapest, so the \`from\` line is right to show.
      and not exists (
        select 1 from printing_prices pp where pp.scryfall_id = c.scryfall_id
          and pp.as_of = (select m from newest) and pp.price_cents is not null)
      and not exists (select 1 from collection_items ci where ci.oracle_id = f.oracle_id and ci.user_id = ${userId})
      and c.commander_legal and c.name not like '%//%'
    order by c.name limit 1`;
  return row ?? null;
}

const dollars = (cents) => `$${(cents / 100).toFixed(2)}`;

async function main() {
  const [{ id: branch }] = await sql`select current_setting('neon.branch_id', true) as id`;
  if (!branch || branch === PRODUCTION || branch === STAGING || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write a fixture to ${branch ?? "(unknown)"}: point DATABASE_URL at local-dev`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const userId = await signIn(page);
    const card = await findFixture(userId);
    if (!report("fixture", card !== null, card ? `${card.name}, live from ${dollars(card.cheapest)}` : "no card reproduces the defect here — NOT a pass")) return;
    // Any legal legend leads it; the deck exists only to put the card on a row that opens the modal.
    const [lead] = await sql`
      select oracle_id from cards where commander_legal and type_line ilike 'Legendary Creature%'
      order by oracle_id limit 1`;
    const [deck] = await sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${userId}, 'probe:card-modal-live-printing', ${lead.oracle_id}) returning id`;
    deckId = deck.id;
    await sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${card.oracle_id}, 1)`;

    for (const width of WIDTHS) {
      const tag = `@${width.label}`;
      await page.setViewportSize(width.viewport);
      await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
      const trigger = onPage(page, `[aria-label^="View details for ${card.name}"]`).filter({ visible: true }).first();
      await trigger.waitFor({ state: "visible", timeout: 30_000 });
      await trigger.click();
      const modal = page.locator('[role="dialog"][aria-labelledby="card-modal-title"]');
      await modal.waitFor({ state: "visible", timeout: 30_000 });
      const tagId = width.label === 390 ? "modal-price-tag-mobile" : "modal-price-tag-desktop";
      const priceTag = modal.getByTestId(tagId);
      await priceTag.waitFor({ state: "attached", timeout: 30_000 });
      const text = (await priceTag.textContent()) ?? "";
      report(`the tag is the live figure ${tag}`, text.includes(dollars(card.cheapest)) && !/no stock|sold out|foil|etched/i.test(text), text);
      const from = await modal.getByTestId(width.label === 390 ? "modal-price-from-mobile" : "modal-price-from-desktop").count();
      report(`no \`from\` line over the cheapest ${tag}`, from === 0, `${from} from line(s)`);
      await page.keyboard.press("Escape");
      await modal.waitFor({ state: "hidden" });
    }
  } finally {
    // Each step on its own, so one failing cannot skip the next.
    if (deckId) await sql`delete from decks where id = ${deckId}`.catch((e) => { failures += 1; console.error(e); });
    if (restorePrefs) await restorePrefs().catch((e) => { failures += 1; console.error(e); });
    await browser.close();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
