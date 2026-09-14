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
 * Cards the account owns that could be a commander, cheapest first.
 *
 * This asks NOTHING about claims, and that is a decision rather than an
 * oversight. Three consecutive review rounds landed on the predicate that used
 * to try: it excluded `deck_cards` rows the application does not treat as
 * claims, then every historical version's commander columns rather than only
 * the newest. Each fix was right and the next round found the next way the
 * approximation had drifted, because `loadAvailability` is a large query with
 * seniority, maturity and self-exclusion rules and this was a second copy of it
 * written from memory.
 *
 * So it does not model the claim at all. The rendered free list is the oracle --
 * it is the thing under test and the thing whose answer matters -- and
 * `pickFree` below simply asks the page, candidate by candidate, until it has
 * the two it needs. That cannot drift from the application, because it IS the
 * application.
 *
 * `Legendary` + `Creature` rather than the app's `isCommanderCandidate`: a
 * Planeswalker commander missed here costs a candidate, never a wrong answer.
 * The `owned <= 2` cap keeps the fixture's claim small, since every copy has to
 * be sleeved for the card to leave the free pool.
 */
async function ownedLegends(userId) {
  const { rows } = await pool.query(
    `select ci.oracle_id, c.name, sum(ci.quantity)::int as owned
       from collection_items ci
       join cards c on c.oracle_id = ci.oracle_id
      where ci.user_id = $1
        and c.commander_legal
        and c.type_line like '%Legendary%'
        and c.type_line like '%Creature%'
      group by ci.oracle_id, c.name
      having sum(ci.quantity) <= 2
      order by sum(ci.quantity), c.name
      limit 60`,
    [userId],
  );
  return rows;
}

/**
 * The first two of those the free list actually holds.
 *
 * The first becomes the fixture's sleeved card, the second its commander. The
 * commander leaves BOTH lists -- `notBuiltBy` drops any commander that helms a
 * deck, in either mode -- which is why it must not be the card under test: its
 * disappearance would prove nothing about `Build from`.
 *
 * Both are confirmed present BEFORE anything is written, so a run that cannot
 * find them stops instead of reporting a pass it never earned.
 */
async function pickFree(page, candidates) {
  const found = [];
  for (const candidate of candidates) {
    const lane = await readLane(page, { avail: "free", query: candidate.name });
    if (holds(lane, candidate.name)) found.push(candidate);
    if (found.length === 2) return found;
  }
  throw new Error(
    `Only ${found.length} of ${candidates.length} owned legends are on the free list. ` +
      "The fixture needs one card to sleeve and one to lead the deck.",
  );
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
  // The RESULT ROW, not every paragraph the rack draws. `[data-chassis-row]`
  // unqualified also collects the control legends — which is why a desktop
  // reading used to come back with `BUILD FROM` glued to the front of the
  // sentence — and a legend that ever held the word `sleeved` would satisfy
  // `hiddenCount` with the result line saying nothing at all.
  const line = await onPage(page, '[data-chassis-row="result"]')
    .allInnerTexts()
    .catch(() => []);
  return {
    names: names.map((n) => n.trim()),
    text: (await onPage(page, "*").first().innerText()).replace(/\s+/g, " "),
    line: line.join(" ").replace(/\s+/g, " "),
  };
}

/**
 * Normalised for comparison: the row heading is uppercased by `text-transform`,
 * which `innerText` reports as rendered.
 *
 * Compared WHOLE. A prefix match passed for any other commander sharing its
 * first 18 characters, so a run could report the target gone while looking
 * straight at it.
 */
const norm = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
const holds = (lane, name) => lane.names.some((n) => norm(n) === norm(name));

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

/**
 * The commander's own detail link, read off the list in `All my cards` — the one
 * mode that still holds the row. Slugs carry dedup suffixes, so this asks the
 * page rather than deriving one from the name.
 */
async function detailHref(page, name) {
  await readLane(page, { avail: "all", query: name });
  // Found by ROW, then by the row's link. A row wraps more than one anchor to
  // the same page and none of them need carry the name as their own text, so
  // matching on link text finds nothing; the row is what holds the heading.
  for (const row of await onPage(page, "li").all()) {
    if (!norm(await row.innerText()).includes(norm(name))) continue;
    const link = row.locator('a[href*="/commanders/"]').first();
    if ((await link.count()) > 0) return link.getAttribute("href");
  }
  return null;
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

    const [target, commander] = await pickFree(page, await ownedLegends(userId));
    console.log(`\nfixture · sleeving ${target.name} (${target.owned} owned), led by ${commander.name}`);

    // `pickFree` has already confirmed both are on the free list, which is the
    // half that must be true before anything is written: the target's absence
    // afterwards says nothing unless it was present first.
    const baseline = hiddenCount((await readLane(page, { avail: "free" })).line);
    if (baseline > 0) {
      note(`baseline already hides ${baseline} — another fixture on this database`);
    }
    note(`before · free lists ${target.name}`);

    await buildHolder(userId, target, commander, (id) => {
      deckId = id;
    });

    // AFTER, at both widths: the rack draws inline at `CHASSIS_WIDE_MIN_PX` and
    // above, and inside a sheet below it, and the result line is the rack's — so
    // a line that only reaches one of the two forms is a half-shipped fix.
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

      // The detail page for a commander free mode no longer lists. The list
      // cannot link here any more, but a bookmark can, and the page drops to the
      // canonical score either way — so the mode has to come off the URL rather
      // than sit over a score from the other pool. Read at both widths because
      // the redirect is the server's and must not depend on the viewport.
      const href = await detailHref(page, target.name);
      if (!href) {
        failures.push(`${viewport.label} · no detail link for ${target.name} under All my cards`);
      } else {
        await page.goto(`${BASE}${href.split("?")[0]}?avail=free`, {
          waitUntil: "domcontentloaded",
        });
        await onPage(page, "h1").first().waitFor({ timeout: 30_000 });
        if (new URL(page.url()).searchParams.get("avail") !== null) {
          failures.push(
            `${viewport.label} · the detail page kept avail=free over a canonical score: ${page.url()}`,
          );
        }
      }
    }
  } finally {
    // The delete gets its own `try`, and the shutdown its own `finally`. With
    // them in one block a delete that rejects — a database away at exactly the
    // wrong moment — skipped `browser.close()` and `pool.end()`, so the probe
    // hung instead of reporting whatever failure sent it here, AND left the
    // fixture behind. A stranded fixture is not a private problem: this database
    // is shared, and a deck holding a hard claim changes what every other run
    // measures. If the delete fails, say so loudly enough that someone removes
    // it by hand.
    try {
      if (deckId) {
        // Versions, version cards and deck cards cascade off the deck row.
        await pool.query(`delete from decks where id = $1 and user_id = $2`, [deckId, userId]);
      }
    } catch (error) {
      // A FAILURE, not just an exit code. Setting `process.exitCode` alone left
      // the report below free to print its green line, so the run said the rule
      // holds and the shell said it does not — and the reader believes the line.
      failures.push(
        `could not delete fixture deck ${deckId}: it is still claiming cards on this ` +
          `database and must be removed by hand (${error?.message ?? error})`,
      );
    } finally {
      await browser.close();
      await pool.end();
    }
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
