// `Build from` — proof that free mode LISTS from the free pool, against real data.
//
// The unit tests pin the rule where it is decided, in `rankFree`. They cannot
// answer the question this script exists for: whether a commander the reader can
// see on `/commanders` actually leaves the list once a finished deck has sleeved
// its card, and whether the result line accounts for the row it removed. That is
// a fact about a rendered page fed by the real availability rollup, which is raw
// SQL no unit test in this repository reaches.
//
// It is also the check the contact sheet cannot be. The sheet photographs the
// routes, and on an account whose claims are all soft — which is the dev
// account's resting state — `?a=free` draws exactly the same list as `All my
// cards`, with no aside. That photograph looks like coverage and proves nothing.
// The gap is the whole reason this file exists: the state has to be BUILT.
//
// The fixture is one deck with a committed version, holding every copy the
// account owns of one commander candidate. `hard` is `sleeved` — a deck with a
// committed version, whatever its size (`availability-query.ts`, `mature` is
// `cd.sleeved`) — so the deck does not need a full body to claim, and building
// one out of a 99-row template would only add rows whose own claims this script
// would then have to reason about.
//
// Point it at `local-dev` or a scratch Neon branch — NEVER production. It writes.
//
// Run by hand, with a dev server up:
//   node scripts/probe-build-from.mjs
// Not part of `pnpm test`: it needs a browser, a signed-in session and a database.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { onPage } from "./lib/surface.mjs";
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

const VIEWPORTS = [
  { label: "iPhone 13 · 390x844", width: 390, height: 844 },
  { label: "desktop · 1300x900", width: 1300, height: 900 },
];

/** Every way a run found the rule unkept. Any entry fails the run. */
const failures = [];
const note = (line) => console.log(`  ${line}`);

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

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Two commander candidates the account owns and no deck has spoken for.
 *
 * The first becomes the fixture's sleeved card, the second its commander. The
 * commander leaves BOTH lists — `notBuiltBy` drops any commander that helms a
 * deck, in either mode — which is why it must not be the card under test: its
 * disappearance would prove nothing about `Build from`.
 *
 * Ordered by the fewest copies owned, because every copy has to be claimed for
 * the card to leave the free pool, and a deck row is per oracle id.
 *
 * `Legendary` + `Creature` rather than the app's own `isCommanderCandidate`:
 * this is a fixture picker, and it only has to find TWO cards that the page is
 * then asked to confirm it lists. A Planeswalker commander missed here costs a
 * candidate, never a wrong answer.
 */
async function pickCandidates(userId) {
  const { rows } = await pool.query(
    `select ci.oracle_id, c.name, sum(ci.quantity)::int as owned
       from collection_items ci
       join cards c on c.oracle_id = ci.oracle_id
      where ci.user_id = $1
        and c.commander_legal
        and c.type_line like '%Legendary%'
        and c.type_line like '%Creature%'
        and not exists (
          select 1 from decks d
           where d.user_id = $1
             and (d.commander_oracle_id = ci.oracle_id or d.partner_oracle_id = ci.oracle_id)
        )
        and not exists (
          select 1 from deck_cards dc
            join decks d on d.id = dc.deck_id
           where d.user_id = $1 and dc.oracle_id = ci.oracle_id
        )
        -- And the COMMITTED versions, which is where a claim actually comes
        -- from. A deck whose draft has since dropped a card still holds it in
        -- the version it is sleeved as, so a picker that read `deck_cards`
        -- alone could choose a card that is already unavailable — and the
        -- pre-check below would then stop the run over a card the fixture never
        -- touched. Newest version per deck, matching `loadAvailability`.
        and not exists (
          select 1 from deck_version_cards dvc
            join deck_versions v on v.id = dvc.version_id
            join decks d on d.id = v.deck_id
           where d.user_id = $1
             and dvc.oracle_id = ci.oracle_id
             and v.number = (select max(v2.number) from deck_versions v2 where v2.deck_id = v.deck_id)
        )
        and not exists (
          select 1 from deck_versions v
            join decks d on d.id = v.deck_id
           where d.user_id = $1
             and (v.commander_oracle_id = ci.oracle_id or v.partner_oracle_id = ci.oracle_id)
        )
      group by ci.oracle_id, c.name
      having sum(ci.quantity) <= 2
      order by sum(ci.quantity), c.name
      limit 40`,
    [userId],
  );
  if (rows.length < 2) {
    throw new Error(
      "No two unclaimed commander candidates in this collection. " +
        "The fixture needs one card to sleeve and one to lead the deck.",
    );
  }
  return rows;
}

/**
 * The fixture: a deck with a committed version holding every copy of `target`.
 *
 * `onDeck` is called with the id the instant the deck row exists, before any of
 * the rows that hang off it. A helper that only returned at the end would leave
 * a half-built deck behind whenever one of those later inserts threw: the call
 * site's assignment never runs, and the `finally` deletes nothing.
 */
async function buildHolder(userId, target, commander, onDeck) {
  const { rows } = await pool.query(
    `insert into decks (user_id, name, commander_oracle_id, filled)
       values ($1, $2, $3, true) returning id`,
    [userId, "probe · build from", commander.oracle_id],
  );
  const deckId = rows[0].id;
  onDeck(deckId);
  await pool.query(
    `insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, $3, false)`,
    [deckId, target.oracle_id, target.owned],
  );
  const version = await pool.query(
    `insert into deck_versions (deck_id, number, commander_oracle_id)
       values ($1, 1, $2) returning id`,
    [deckId, commander.oracle_id],
  );
  await pool.query(
    `insert into deck_version_cards (version_id, oracle_id, quantity) values ($1, $2, $3)`,
    [version.rows[0].id, target.oracle_id, target.owned],
  );
  return deckId;
}

/**
 * What one visit to the lane says: whether a named commander has a row, and the
 * result line under the rack.
 *
 * The name is searched for rather than scanned for, because the list is windowed
 * — a commander ranked past the first batch is absent from the document while
 * being perfectly present in the list, and a scan would read that as the feature
 * working. Everything is read through `onPage`, so the shell's own controls
 * cannot answer for the lane's.
 */
async function readLane(page, { avail, query }) {
  const url = new URL(`${BASE}/commanders`);
  if (avail === "free") url.searchParams.set("a", "free");
  if (query) url.searchParams.set("q", query);
  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2_500);

  const rows = onPage(page, "li h3, li h2, li [data-commander-name]");
  const names = await rows.allInnerTexts();
  const line = await onPage(page, "[data-chassis-row] p, [data-chassis-form] p")
    .allInnerTexts()
    .catch(() => []);
  return {
    names: names.map((n) => n.trim()),
    text: (await onPage(page, "*").first().innerText()).replace(/\s+/g, " "),
    line: line.join(" ").replace(/\s+/g, " "),
  };
}

const holds = (lane, name) =>
  lane.names.some((n) => n.toLowerCase().startsWith(name.toLowerCase().slice(0, 18)));

/**
 * How many commanders the aside says free mode hid, or 0 where it drew none.
 *
 * Read as a FIGURE rather than tested for presence, because this database is
 * shared and another probe's leaked fixture can leave a commander hard-claimed
 * before this one starts. Against a baseline that already carries an aside,
 * "an aside is present afterwards" is satisfied by the leak alone, and a build
 * with the membership rule reverted would pass. What is this run's own is the
 * DIFFERENCE its fixture made.
 */
function hiddenCount(line) {
  const match = /(\d[\d,]*) more (?:is|are) sleeved into/.exec(line);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  let deckId = null;
  let userId = null;

  try {
    const context = await browser.newContext({ viewport: VIEWPORTS[1] });
    const page = await context.newPage();
    userId = await signIn(page);

    const candidates = await pickCandidates(userId);
    const [target, commander] = candidates;
    console.log(`\nfixture · sleeving ${target.name} (${target.owned} owned), led by ${commander.name}`);

    // BEFORE. The target has to be on the free list to start with, or its
    // absence afterwards says nothing. A run that cannot show it here stops
    // rather than reporting a pass it never earned.
    const before = await readLane(page, { avail: "free", query: target.name });
    if (!holds(before, target.name)) {
      throw new Error(
        `${target.name} is not on the free list before the fixture exists. ` +
          "Nothing this run measures afterwards would mean anything.",
      );
    }
    const baseline = hiddenCount((await readLane(page, { avail: "free" })).line);
    if (baseline > 0) {
      note(`baseline already hides ${baseline} — another fixture on this database`);
    }
    note(`before · free lists ${target.name}`);

    await buildHolder(userId, target, commander, (id) => {
      deckId = id;
    });

    // AFTER, at both widths: the rack draws inline above 1024px and inside a
    // sheet below it, and the result line is the rack's — so a line that only
    // reaches one of the two forms is a half-shipped fix.
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const free = await readLane(page, { avail: "free", query: target.name });
      if (holds(free, target.name)) {
        failures.push(`${viewport.label} · free mode still lists ${target.name}, whose only copies are sleeved`);
      }

      // The other half of the rule, and the one that keeps `All my cards`
      // honest: the commander has not stopped existing, it has stopped being
      // free, and the mode that says so must still show it.
      const all = await readLane(page, { avail: "all", query: target.name });
      if (!holds(all, target.name)) {
        failures.push(`${viewport.label} · All my cards dropped ${target.name}, which only free mode may hide`);
      }

      const freeLine = (await readLane(page, { avail: "free" })).line;
      const hidden = hiddenCount(freeLine);
      if (hidden !== baseline + 1) {
        failures.push(
          `${viewport.label} · the aside should have gone from ${baseline} to ${baseline + 1}, ` +
            `and reads ${hidden}: "${freeLine}"`,
        );
      } else {
        note(`after · ${viewport.label} · "${freeLine}"`);
      }

      // The aside answers for ONE control. In the other mode nothing was
      // hidden, so nothing may be claimed to have been.
      const allLine = (await readLane(page, { avail: "all" })).line;
      if (/sleeved into/.test(allLine)) {
        failures.push(`${viewport.label} · All my cards prints the aside: "${allLine}"`);
      }
    }
  } finally {
    if (deckId) {
      // Versions, version cards and deck cards cascade off the deck row.
      await pool.query(`delete from decks where id = $1 and user_id = $2`, [deckId, userId]);
    }
    await browser.close();
    await pool.end();
  }

  console.log("");
  if (failures.length > 0) {
    for (const f of failures) console.log(`✗ ${f}`);
    console.log(`\n${failures.length} failure(s).`);
    process.exitCode = 1;
    return;
  }
  console.log("✓ free mode lists from the free pool, and says what it hid, at both widths.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
