// Cardboard that is not a card, proved against a real Postgres and the real catalog by calling
// the real resolver.
//
// Scryfall's catalog holds Jumpstart theme fronts, planes, schemes, avatars and a few `normal`
// objects whose type line is only `Card`. One of the fronts is named "Lands", so a pasted list's
// section header resolved to it by exact name and the deck gained a card called Lands (Hugh's
// staging walk, 2026-09-25). `isGameCard` is the rule and `matchRows` applies it; the unit tests
// prove both over hand-built catalogs. What only a database answers is whether the catalog
// `loadMatchInputs` reads carries the columns the rule needs, whether the real "Lands" front is
// refused, and whether the skipped-printings ledger reports only the TOKEN layouts as skipped.
//
// Four paths, one resolver. Deck import and "Update from a list" both run `buildDeckImport` over
// `loadMatchInputs({ detailed: true })`; the collection CSV runs `matchRows` over the plain read.
// Both reads are exercised.
//
// Search is the other half. The unresolved-row picker and quick-add share `searchCards`, which
// reads commander-legal cards only, and Scryfall marks Unfinity's sticker sheets commander-legal.
// So the last section signs in and TYPES a sticker sheet's name into a deck's quick-add, with
// `Owned only` off, in a real browser: a server action behind Clerk is out of reach of a script,
// and the rendered list is the thing a player sees. A control search for Sol Ring must list a
// row, or the empty sticker search proved nothing. Needs a dev server on this worktree
// (PROBE_BASE, default http://localhost:3000) and `E2E_AUDIT_USER_EMAIL` in the .env.
//
// It writes two sentinel rows into `skipped_printings`, under ids no printing can have, and
// deletes them in a `finally`; the browser half writes only the account's About row, as every
// probe that clears the gate does. Point it at local-dev or a scratch branch, NEVER production.
//
// Run: `pnpm probe:non-game`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the .env has to be
// loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { loadMatchInputs } from "../src/lib/collection/import";
import { matchRows } from "../src/lib/collection/match";
import { buildDeckImport } from "../src/lib/decks/import";
import type { CollectionRow } from "../src/lib/manabox/parse";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["DATABASE_URL", "E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD ?? "";

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

const csvRow = (name: string, scryfallId: string | null, line: number): CollectionRow => ({
  name, setCode: "", collectorNumber: "", quantity: 1, scryfallId,
  finish: "nonfoil", condition: null, line,
});

const TOKEN_ID = randomUUID();
const FRONT_ID = randomUUID();

async function main() {
  const { rows: fronts } = await db.execute<{ oracle_id: string; scryfall_id: string }>(sql`
    select c.oracle_id, p.scryfall_id from cards c
    join printings p on p.oracle_id = c.oracle_id
    where c.name = 'Lands' and c.layout = 'front_card'
    order by p.scryfall_id limit 1
  `);
  const lands = fronts[0];
  if (!lands) throw new Error("no 'Lands' front_card with a printing in this catalog: the probe has no subject");

  // ── Deck import and Update from a list ─────────────────────────────────
  const detailed = await loadMatchInputs([], { detailed: true });
  const deck = buildDeckImport({
    text: "1 Sol Ring\nLands\n1 Forest\nCreatures",
    catalog: detailed.catalog,
    indexes: detailed.indexes,
  });
  const names = deck.cards.map((c) => c.oracleId);
  check("the 'Lands' header is not imported as a card", !names.includes(lands.oracle_id),
    `${deck.cards.length} card(s) imported`);
  check("the 'Lands' header reads as unresolved", deck.unresolved.some((u) => u.rawName === "Lands"),
    `unresolved: ${JSON.stringify(deck.unresolved.map((u) => u.rawName))}`);
  check("the real cards beside it still import", deck.cards.length === 2,
    `${deck.cards.length} of 2`);

  // ── Collection CSV, by name and by the front's own printing id ─────────
  await db.execute(sql`
    insert into skipped_printings (scryfall_id, layout, name) values
      (${TOKEN_ID}, 'token', 'probe-non-game token'),
      (${FRONT_ID}, 'front_card', 'probe-non-game front')
  `);
  const rows = [
    csvRow("Lands", null, 2),
    csvRow("Lands", lands.scryfall_id, 3),
    csvRow("probe-non-game token", TOKEN_ID, 4),
    csvRow("probe-non-game front", FRONT_ID, 5),
    csvRow("Sol Ring", null, 6),
  ];
  const plain = await loadMatchInputs(rows);
  const result = matchRows(rows, plain.catalog, plain.indexes);
  const unmatchedLines = result.unmatched.map((r) => r.line);
  check("a CSV row naming 'Lands' is unmatched", unmatchedLines.includes(2),
    `unmatched lines ${JSON.stringify(unmatchedLines)}`);
  // Not "unmatched": Scryfall has at some point listed this printing as a token, and the ledger
  // still holds it that way (315 printings sit in both tables, on local-dev and staging alike).
  // Either way it is not imported, which is the rule; what it must never be is matched.
  check("a CSV row carrying the front's printing id is not matched", !result.matched.some((m) => m.row.line === 3),
    `line 3 is ${unmatchedLines.includes(3) ? "unmatched" : result.skipped.some((r) => r.line === 3) ? "skipped" : "matched"}`);
  check("a token in the ledger is still reported skipped", result.skipped.some((r) => r.line === 4),
    `skipped lines ${JSON.stringify(result.skipped.map((r) => r.line))}`);
  check("a theme front in the ledger reads as unmatched, not skipped", unmatchedLines.includes(5),
    `unmatched lines ${JSON.stringify(unmatchedLines)}`);
  check("Sol Ring still matches", result.matched.some((m) => m.row.line === 6),
    `${result.matched.length} matched`);

  // ── The picker and quick-add: one search, commander-legal cards only ───
  // A commander-legal sticker sheet is the subject; without one the check below has nothing to
  // refuse, so its absence fails the run rather than passing it.
  const { rows: sheets } = await db.execute<{ name: string }>(sql`
    select name from cards where commander_legal and btrim(type_line) = 'Stickers' order by name limit 1
  `);
  if (!sheets[0]) throw new Error("no commander-legal sticker sheet in this catalog");
  await searchInBrowser(sheets[0].name);
}

async function signIn(page: Page): Promise<string> {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded: boolean } }).Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Clerk's browser global is untyped here.
    const clerk = (window as any).Clerk;
    try {
      let attempt = email.includes("+clerk_test")
        ? await clerk.client.signIn.create({ identifier: email })
        : await clerk.client.signIn.create({ identifier: email, password });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as above.
        const factor = attempt.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
        if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
        await clerk.client.signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        attempt = await clerk.client.signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as above.
      return (error as any)?.errors?.[0]?.longMessage ?? String(error);
    }
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as above.
  const userId = await page.evaluate(() => (window as any).Clerk.user.id as string);
  await clearAboutSheet(page, userId);
  return userId;
}

/** Types `query` into the deck's quick-add with `Owned only` off and returns the listed names. */
async function quickAdd(page: Page, query: string): Promise<string[]> {
  const bar = onPage(page, 'input[role="combobox"]').first();
  await bar.focus();
  const owned = onPageRole(page, "checkbox", /only cards you own/i).first();
  // `force`: the input is the visually hidden peer of the drawn switch, which intercepts a pointer.
  if ((await owned.count()) > 0) await owned.setChecked(false, { force: true });
  await bar.fill(query);
  await onPage(page, '[role="option"]').first().waitFor({ state: "attached", timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1_000);
  return onPage(page, '[role="option"]').allInnerTexts();
}

async function searchInBrowser(sheet: string) {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    const userId = await signIn(page);
    const { rows: decks } = await db.execute<{ id: string }>(sql`
      select id from decks where user_id = ${userId} order by created_at limit 1
    `);
    if (!decks[0]) throw new Error("the probe account owns no deck to open quick-add on");
    await page.goto(`${BASE}/decks/${decks[0].id}`, { waitUntil: "networkidle" });
    const deckTab = onPage(page, "#tab-deck").first();
    if ((await deckTab.count()) > 0) await deckTab.click();

    const control = await quickAdd(page, "Sol Ring");
    check("quick-add lists Sol Ring, so an empty search below means something",
      control.some((t) => t.includes("Sol Ring")), `${control.length} row(s)`);
    const offered = await quickAdd(page, sheet);
    check(`quick-add does not offer the sticker sheet "${sheet}"`,
      !offered.some((t) => t.includes(sheet)), `${offered.length} row(s): ${JSON.stringify(offered.slice(0, 3))}`);
  } finally {
    await browser.close();
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    try {
      await db.execute(sql`delete from skipped_printings where scryfall_id in (${TOKEN_ID}, ${FRONT_ID})`);
    } catch (error) {
      failures += 1;
      console.error("cleanup failed", error);
    }
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
