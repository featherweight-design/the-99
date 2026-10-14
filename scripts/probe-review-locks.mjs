// probe:review-locks — Locked (never cut) on the review screen, `/decks/[id]/changes`, at 1300x900
// and 390x844, against a real Postgres (Locked PR 5, review half).
//
// Two rulings only a real server and a real database can answer:
//   - L2: `Pull it` never takes a copy from a deck where the card is locked. The row draws the
//     `locked` guard tag beside the holding deck's name, which it already prints, offers no
//     control, and carries the sentence in the name trigger's description.
//   - L1: `Put back` returns a card that left LOCKED as a locked card, and one that left unlocked as
//     an unlocked one. The dormant lock has to be woken BEFORE the re-add, whose own insert trigger
//     deletes a dormant row, and that ordering is a fact about Postgres no unit test here reaches.
//     Both are read back from `deck_locks`, not off the screen.
//
// Fixture, built per width under the signed-in account and deleted in a `finally` (versions,
// cards and locks cascade): two committed decks copied from a template. The HOLDER sleeves the
// one copy the account owns of a card, and holds it LOCKED; the deck UNDER REVIEW adds that card,
// and has removed two of its own cards, one of which it had locked (a dormant lock, as a removal
// leaves it). Needs a server with NEVER_CUT_ENABLED=true. Point it at `local-dev`, never production.
//
//   PROBE_BASE=http://localhost:3238 node scripts/probe-review-locks.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "DATABASE_URL"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? null;
const TEMPLATE = process.env.PROBE_TEMPLATE_DECK ?? "a1111111-1111-1111-1111-111111111111";
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
const sql = neon(DATABASE_URL);

const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 } },
  { label: 390, viewport: { width: 390, height: 844 } },
];

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
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
  // The About gate, cleared as `probe:verdict-block` clears it, with `greatest` so a checkout
  // pinned behind the database never lowers the stored value.
  const { version } = JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"));
  const userId = await page.evaluate(() => window.Clerk.user.id);
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, userId);
  return userId;
}

/** A committed copy of the template: its cards in the draft and in version 1. */
async function buildDeck(userId, name) {
  const [t] = await sql`select commander_oracle_id, partner_oracle_id from decks where id = ${TEMPLATE}`;
  if (!t) throw new Error(`No template deck ${TEMPLATE}.`);
  const [{ id }] = await sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id, filled)
    values (${userId}, ${name}, ${t.commander_oracle_id}, ${t.partner_oracle_id}, true) returning id`;
  await sql`insert into deck_cards (deck_id, oracle_id, quantity, auto)
    select ${id}, oracle_id, quantity, false from deck_cards where deck_id = ${TEMPLATE}`;
  const [v] = await sql`
    insert into deck_versions (deck_id, number, commander_oracle_id, partner_oracle_id)
    values (${id}, 1, ${t.commander_oracle_id}, ${t.partner_oracle_id}) returning id`;
  await sql`insert into deck_version_cards (version_id, oracle_id, quantity)
    select ${v.id}, oracle_id, quantity from deck_cards where deck_id = ${id}`;
  return { deckId: id, versionId: v.id };
}

/** One card the account owns exactly one copy of, sleeved nowhere and nobody's commander, put in
 *  the holder's draft AND version so the holder is committed and not pending. `probe:review`'s
 *  `claimOneCopy`, which says why each clause is there. */
async function claimOneCopy(userId, holder, reviewedId) {
  const rows = await sql`
    select ci.oracle_id, c.name from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${userId} and c.type_line not like 'Basic Land%'
      and ci.oracle_id not in (select oracle_id from deck_cards where deck_id in (${holder.deckId}, ${reviewedId}))
      and not exists (select 1 from deck_version_cards vc join deck_versions v on v.id = vc.version_id
                      join decks d on d.id = v.deck_id where d.user_id = ${userId} and vc.oracle_id = ci.oracle_id)
      and not exists (select 1 from decks d where d.user_id = ${userId}
                      and ci.oracle_id in (d.commander_oracle_id, d.partner_oracle_id))
    group by ci.oracle_id, c.name having sum(ci.quantity) = 1
    order by ci.oracle_id limit 1`;
  if (rows.length === 0) throw new Error("No singly-owned, unsleeved card to claim.");
  const { oracle_id: oracleId, name } = rows[0];
  await sql`insert into deck_cards (deck_id, oracle_id, quantity, auto) values (${holder.deckId}, ${oracleId}, 1, false)`;
  await sql`insert into deck_version_cards (version_id, oracle_id, quantity) values (${holder.versionId}, ${oracleId}, 1)`;
  return { oracleId, name };
}

const lockOf = async (deckId, oracleId) =>
  (await sql`select removed_at from deck_locks where deck_id = ${deckId} and oracle_id = ${oracleId}`)[0] ?? null;
const holds = async (deckId, oracleId) =>
  (await sql`select 1 from deck_cards where deck_id = ${deckId} and oracle_id = ${oracleId}`).length > 0;

/** What the add row draws, found from its own name trigger outward. */
function readAddRow(page, name, holderName) {
  return page.evaluate(([label, holderName]) => {
    const visible = (el) => el.getBoundingClientRect().width > 0;
    const trigger = [...document.querySelectorAll("main button")].find((b) => b.getAttribute("aria-label") === label && visible(b));
    if (!trigger) return null;
    let row = trigger.parentElement;
    while (row && !row.textContent.includes(holderName)) row = row.parentElement;
    if (!row) return { found: true, holder: false };
    const tag = [...row.querySelectorAll("span")].find((s) => s.textContent === "locked" && s.children.length === 0 && visible(s));
    const pull = [...row.querySelectorAll("button")].some((b) => /^Pull it$/.test(b.innerText.trim()) && visible(b));
    const described = (trigger.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
    return { found: true, holder: true, tag: !!tag, pull, described };
  }, [`View details for ${name}`, holderName]);
}

async function putBack(page, name) {
  const button = onPage(page, `button[aria-label="Put ${name} back in the deck"]`).first();
  await button.waitFor({ state: "visible", timeout: 15_000 });
  await button.click();
}

async function until(check, ms = 15_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  const made = [];
  try {
    const context = await browser.newContext({ viewport: WIDTHS[0].viewport });
    const page = await context.newPage();
    const userId = await signIn(page);

    for (const { label, viewport } of WIDTHS) {
      await page.setViewportSize(viewport);
      const reviewed = await buildDeck(userId, "Probe · locks under review");
      made.push(reviewed.deckId);
      const holder = await buildDeck(userId, `Probe · locks holder ${label}`);
      made.push(holder.deckId);
      const claimed = await claimOneCopy(userId, holder, reviewed.deckId);
      await sql`insert into deck_locks (deck_id, oracle_id) values (${holder.deckId}, ${claimed.oracleId})`;

      // Two of the reviewed deck's own cards removed from its draft, the first of them locked: its
      // lock is left DORMANT, exactly as `pruneOrphanLocks` leaves one at a removal.
      const cuts = await sql`
        select vc.oracle_id, c.name from deck_version_cards vc join cards c on c.oracle_id = vc.oracle_id
        where vc.version_id = ${reviewed.versionId} and c.type_line not like 'Basic Land%' and vc.quantity = 1
          -- COLORLESS and legal: Put back re-validates the card, and the template carries an
          -- off-identity card whose refusal would read as a lock failure.
          and cardinality(c.color_identity) = 0 and c.commander_legal
        order by vc.oracle_id limit 2`;
      if (cuts.length < 2) throw new Error("The template holds fewer than two colorless legal singletons to cut.");
      const [lockedCut, plainCut] = cuts.map((c) => ({ oracleId: c.oracle_id, name: c.name }));
      await sql`insert into deck_locks (deck_id, oracle_id) values (${reviewed.deckId}, ${lockedCut.oracleId})`;
      await sql`delete from deck_cards where deck_id = ${reviewed.deckId} and oracle_id in (${lockedCut.oracleId}, ${plainCut.oracleId})`;
      await sql`update deck_locks set removed_at = now() where deck_id = ${reviewed.deckId} and oracle_id = ${lockedCut.oracleId}`;
      await sql`insert into deck_cards (deck_id, oracle_id, quantity, auto) values (${reviewed.deckId}, ${claimed.oracleId}, 1, false)`;

      await page.goto(`${BASE}/decks/${reviewed.deckId}/changes`, { waitUntil: "domcontentloaded" });
      await onPage(page, `button[aria-label="View details for ${claimed.name}"]`).first().waitFor({ state: "attached", timeout: 30_000 });
      const holderName = `Probe · locks holder ${label}`;
      const add = await readAddRow(page, claimed.name, holderName);
      report(`${label}px · the add row names the holding deck`, !!add?.holder, JSON.stringify(add));
      report(`${label}px · the locked guard tag is drawn`, !!add?.tag, JSON.stringify(add));
      report(`${label}px · no Pull it is offered`, add?.found && add.pull === false, JSON.stringify(add));
      report(`${label}px · the row's description says why`, !!add?.described?.includes(`${claimed.name} is locked in ${holderName}, so it can’t be pulled.`), add?.described ?? "no row");
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/review-locked-guard-${label}.png` });

      // The phone shows one column at a time; the cuts are the second segment.
      if (label === 390) {
        const segment = onPage(page, 'button[aria-pressed="false"]').first();
        if (await segment.count()) await segment.click();
      }
      await putBack(page, lockedCut.name);
      const back = await until(() => holds(reviewed.deckId, lockedCut.oracleId));
      const lock = await lockOf(reviewed.deckId, lockedCut.oracleId);
      const alerts = back ? [] : await page.evaluate(() => [...document.querySelectorAll('main [role="alert"]')].map((a) => a.textContent));
      report(`${label}px · Put back returns the locked card`, back, back ? "in the draft" : `never re-added; alerts: ${JSON.stringify(alerts)}`);
      report(`${label}px · ...LOCKED (L1)`, !!lock && lock.removed_at === null, lock ? `removed_at ${lock.removed_at}` : "no lock row: the trigger deleted it");

      await putBack(page, plainCut.name);
      const plainBack = await until(() => holds(reviewed.deckId, plainCut.oracleId));
      const plainLock = await lockOf(reviewed.deckId, plainCut.oracleId);
      report(`${label}px · Put back returns the unlocked card unlocked`, plainBack && plainLock === null, plainBack ? `lock row: ${JSON.stringify(plainLock)}` : "never re-added");
    }
  } finally {
    try {
      for (const id of made) await sql`delete from decks where id = ${id}`;
    } catch (err) {
      console.error("cleanup failed:", err);
      failures += 1;
    }
    await browser.close();
  }
}

await run();
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
