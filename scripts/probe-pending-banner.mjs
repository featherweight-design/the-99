// Gate for Surface 1: the pending-changes banner, at both densities and on both
// breakpoints, driven out of a real database rather than asserted in jsdom.
//
// Four things a component test cannot settle:
//
//   1. The DENSITY SWITCH is a fact about a real draft, not a prop. At six
//      changes or fewer the banner names every change and says nothing about
//      money; at seven or more the names are gone, a "since" line appears beside
//      the counts, and `Review N changes` takes the primary slot from the commit.
//      The boundary is `INLINE_CHANGE_MAX`, and only a diff computed by
//      `loadDraftState` against a committed version can land on either side of it.
//   2. The CLEAN state is a different component. A committed deck with no edits
//      draws one line — the version and its date — and none of the card's
//      chrome. That the banner disappears rather than emptying is the claim.
//   3. BOTH BREAKPOINTS in one run. Every measurement in the design differs
//      between phone and desktop, and the controls change layout: the primary
//      takes its own full-width row under 768px and joins the others above it.
//   4. The money sentence needs a PRICED, UNOWNED add. Whether one renders is a
//      question about the price join and the claim read, which no fixture in
//      `pnpm test` performs.
//
// THE FIXTURE IS THIS SCRIPT'S OWN, AND IT HAS TO BE. The probe account is not
// the account that owns local-dev's 99-card decks, and a deck page the signed-in
// player does not own is a 404 — so a run pointed at a fixture deck reports the
// banner absent everywhere and makes a working feature look dead. Instead the
// script copies a 99-row template deck into a deck OWNED BY THE ACCOUNT IT SIGNED
// IN AS, commits that copy as v1, and deletes the whole deck in a `finally`.
// Edits then land on `deck_cards`, because a draft IS the difference between
// those rows and the newest version — there is no `is_draft` column to set.
//
// Point it at `local-dev` or a scratch Neon branch — NEVER production. It writes.
//
// Run by hand, with a dev server up:
//   node scripts/probe-pending-banner.mjs
// Set PROBE_TEMPLATE_DECK to copy a different 99-row deck; any deck will do,
// whoever owns it, because only its card list and commander are read.
// Not part of `pnpm test`: it needs a browser, a signed-in session and a database.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = ws;

const {
  E2E_AUDIT_USER_EMAIL: EMAIL,
  E2E_AUDIT_USER_PASSWORD: PASSWORD,
  DATABASE_URL,
} = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "E2E_AUDIT_USER_PASSWORD",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
]);

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const TEMPLATE = process.env.PROBE_TEMPLATE_DECK ?? "a1111111-1111-1111-1111-111111111111";

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

// Six is INLINE_CHANGE_MAX. The two stages sit either side of it by one, which is
// the only pair of counts that proves where the boundary is rather than that one
// exists somewhere.
const INLINE_CHANGES = 6;
const COUNTS_CHANGES = 7;

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
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user?.id ?? null);
  if (!userId) throw new Error("Signed in but Clerk reports no user.");
  return userId;
}

/**
 * What the banner says, read off the rendered page.
 *
 * Anchored on the banner's own container — the accent left rule at 3px is what
 * makes it that card and not the clean strip — so a string appearing elsewhere on
 * a 99-card page cannot be mistaken for one of its lines.
 */
const readBanner = (page) =>
  page.evaluate(() => {
    const card = [...document.querySelectorAll("div")].find(
      (el) => el.style.borderLeft === "3px solid var(--accent)",
    );
    if (!card) {
      return {
        banner: false,
        cleanLine: /v\d+ · committed [^\n]*/.exec(document.body.innerText)?.[0] ?? null,
      };
    }
    const text = card.innerText;
    const controls = [...card.querySelectorAll("a,button")].map((el) => ({
      label: el.innerText.trim(),
      // The primary is the bone fill; every other control is transparent. Read the
      // computed value rather than the class, because that is what the reader sees.
      fill: getComputedStyle(el).backgroundColor,
      width: Math.round(el.getBoundingClientRect().width),
      height: Math.round(el.getBoundingClientRect().height),
      top: Math.round(el.getBoundingClientRect().top),
    }));
    return {
      banner: true,
      cleanLine: null,
      label: /Pending changes/i.test(text),
      counts: text.match(/[+−]\d+/g) ?? [],
      since: /\d+ changes? since v\d+/.exec(text)?.[0] ?? null,
      nameLines: card.querySelectorAll("li").length,
      money: text.split("\n").find((l) => l.includes("$")) ?? null,
      controls,
      cardWidth: Math.round(card.getBoundingClientRect().width),
    };
  });

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * A 99-row deck owned by the signed-in account, committed as v1.
 *
 * Copied from a template rather than assembled from the catalog, so the list is a
 * legal Commander deck with a real commander and a real curve — the decklist below
 * the banner has to render too, and a pile of arbitrary cards would test the
 * banner against a page that never happens.
 */
async function buildFixture(userId) {
  const template = await pool.query(
    `select commander_oracle_id, partner_oracle_id from decks where id = $1`,
    [TEMPLATE],
  );
  if (template.rows.length === 0) throw new Error(`No template deck ${TEMPLATE}.`);
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, partner_oracle_id, filled)
       values ($1, $2, $3, $4, true) returning id`,
    [
      userId,
      "Probe · pending banner",
      template.rows[0].commander_oracle_id,
      template.rows[0].partner_oracle_id,
    ],
  );
  const deckId = rows[0].id;
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, oracle_id, quantity, false from deck_cards where deck_id = $2`,
    [deckId, TEMPLATE],
  );
  const version = await pool.query(
    `insert into deck_versions (deck_id, number, commander_oracle_id, partner_oracle_id)
       values ($1, 1, $2, $3) returning id`,
    [deckId, template.rows[0].commander_oracle_id, template.rows[0].partner_oracle_id],
  );
  await pool.query(
    `insert into deck_version_cards (version_id, oracle_id, quantity)
       select $1, oracle_id, quantity from deck_cards where deck_id = $2`,
    [version.rows[0].id, deckId],
  );
  const count = await pool.query(`select count(*)::int as n from deck_cards where deck_id = $1`, [
    deckId,
  ]);
  return { deckId, rowCount: count.rows[0].n };
}

/**
 * Cards to add: unowned by this player and priced in the newest ingest, so the
 * counts-density stage has a genuine purchase to state a figure for. Falls back to
 * any card outside the deck if the local database has no prices — the density
 * claims still hold, and the run says the money line was unreachable rather than
 * reporting its absence as a pass.
 */
async function pickAdds(deckId, userId, n) {
  const priced = await pool.query(
    `select distinct c.oracle_id
       from cards c
       join printings p on p.oracle_id = c.oracle_id
       join printing_prices pp on pp.scryfall_id = p.scryfall_id
       where pp.price_cents is not null
         and pp.as_of = (select max(as_of) from printing_prices)
         and c.oracle_id not in (select oracle_id from deck_cards where deck_id = $1)
         and c.oracle_id not in (select oracle_id from collection_items where user_id = $2)
       limit $3`,
    [deckId, userId, n],
  );
  if (priced.rows.length === n) return { adds: priced.rows.map((r) => r.oracle_id), priced: true };
  const any = await pool.query(
    `select c.oracle_id from cards c
      where c.oracle_id not in (select oracle_id from deck_cards where deck_id = $1)
      limit $2`,
    [deckId, n],
  );
  return { adds: any.rows.map((r) => r.oracle_id), priced: false };
}

/**
 * n changes, half of them adds and the rest cuts: both anatomies in every stage.
 *
 * Each stage starts by restoring the committed list, so the counts are absolute
 * rather than accumulated from the stage before.
 */
async function stage(deckId, versionId, adds, n) {
  await pool.query(`delete from deck_cards where deck_id = $1`, [deckId]);
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto)
       select $1, oracle_id, quantity, false from deck_version_cards where version_id = $2`,
    [deckId, versionId],
  );
  if (n === 0) return { addCount: 0, cutCount: 0 };
  const addCount = Math.ceil(n / 2);
  const cutCount = n - addCount;
  await pool.query(
    `delete from deck_cards where deck_id = $1 and oracle_id in (
       select oracle_id from deck_cards where deck_id = $1 order by oracle_id limit $2)`,
    [deckId, cutCount],
  );
  for (const oracleId of adds.slice(0, addCount)) {
    await pool.query(
      `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false)`,
      [deckId, oracleId],
    );
  }
  return { addCount, cutCount };
}

await clerkSetup();
const browser = await chromium.launch();
let deckId = null;
try {
  const context = await browser.newContext({ viewport: VIEWPORTS[0] });
  const page = await context.newPage();
  const userId = await signIn(page);
  const fixture = await buildFixture(userId);
  deckId = fixture.deckId;
  const versionId = (
    await pool.query(`select id from deck_versions where deck_id = $1`, [deckId])
  ).rows[0].id;
  const picked = await pickAdds(deckId, userId, COUNTS_CHANGES);
  console.log(`signed in as ${userId}`);
  console.log(`fixture deck ${deckId} · v1 · ${fixture.rowCount} rows`);
  console.log(
    `adds picked: ${picked.adds.length}${picked.priced ? " (priced, unowned)" : " (UNPRICED — money line unreachable)"}`,
  );
  await context.close();

  for (const { label, width, height } of VIEWPORTS) {
    const vpContext = await browser.newContext({ viewport: { width, height } });
    const vpPage = await vpContext.newPage();
    await signIn(vpPage);

    for (const [name, n] of [
      ["CLEAN", 0],
      ["INLINE (names)", INLINE_CHANGES],
      ["COUNTS", COUNTS_CHANGES],
    ]) {
      const staged = await stage(deckId, versionId, picked.adds, n);
      await vpPage.goto(`${BASE}/decks/${deckId}`, { waitUntil: "networkidle" });
      await vpPage.waitForTimeout(1200);
      const seen = await readBanner(vpPage);
      console.log(
        `\n########## ${label} · ${name} (${staged.addCount} adds, ${staged.cutCount} cuts)`,
      );
      if (!seen.banner) {
        console.log(`  banner: ABSENT · clean line: ${seen.cleanLine ?? "ABSENT"}`);
        continue;
      }
      console.log(`  card width: ${seen.cardWidth}px · "Pending changes": ${seen.label ? "yes" : "NO"}`);
      console.log(`  counts: ${seen.counts.join(" ") || "none"}`);
      console.log(`  since: ${seen.since ?? "absent"}`);
      console.log(`  name lines: ${seen.nameLines}`);
      console.log(`  money: ${seen.money ?? "absent"}`);
      for (const c of seen.controls) {
        console.log(`  control: "${c.label}" ${c.width}x${c.height} top ${c.top} fill ${c.fill}`);
      }
    }
    await vpContext.close();
  }
} finally {
  // The whole deck goes, and its versions and cards with it by cascade. Nothing
  // this run wrote lives outside that one row.
  if (deckId) await pool.query(`delete from decks where id = $1`, [deckId]);
  await pool.end();
  await browser.close();
}
