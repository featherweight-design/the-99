import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { creditGrants, modelCalls, userPrefs } from "../../db/schema";
import { RESERVATION_TTL_MS } from "../model/allowance-rule";
import { dailyLimitFor } from "../model/allowance";
import { isLive, remaining, type CreditGrant } from "../model/credit-rule";
import { readEverBought } from "./chip";
import { paymentsEnabled } from "./flag";
import { welcomeState, type WelcomeLot, type WelcomeState } from "./welcome-state";
import { welcomeSheet, type WelcomeSheet } from "./welcome-sheet";
import { creditsEntryOf, visibleEntries } from "../about/visible";
import { deckFacts, fitsOf, LIST_TOOLS } from "../discovery/fits";
import { showcaseGroups, writtenForYou } from "../discovery/showcase";
import { TOOLS } from "../discovery/tools";
import type { DeckListItem } from "../decks/read";
import { SWITCH_FLAGS } from "../switches/flags";
import type { SwitchName } from "../switches/registry";

type Reader = Pick<typeof db, "select">;
type Writer = Pick<typeof db, "insert">;

/**
 * The reader's welcome grant row with what it holds (welcome credits G1): ONE indexed read, by the partial unique index
 * `credit_grants_welcome_once` (one welcome lot per account), whose two subqueries count the lot's ledger rows through
 * `model_calls_credit_grant_idx`. Unlike the allowance's read it keeps an expired lot, so the state rule can tell used
 * up, expired and no lot apart. What a lot has left is still `credit-rule.ts`'s `remaining`: the SQL only gathers its
 * inputs (spent rows as a count, reservations young enough to count, whole), as `grantBalances` does.
 *
 * The subqueries are correlated in the PROJECTION of a single-table select, so each aliases `model_calls` and names the
 * outer table in full (AGENTS.md: Drizzle leaves a bare column there, and `id` would resolve against `model_calls`).
 * Apart so a test can render its SQL.
 */
export function welcomeLotQuery(userId: string, now: Date, q: Reader = db) {
  const reservedSince = new Date(now.getTime() - RESERVATION_TTL_MS).toISOString();
  return q
    .select({
      id: creditGrants.id,
      units: creditGrants.units,
      revokedUnits: creditGrants.revokedUnits,
      expiresAt: creditGrants.expiresAt,
      createdAt: creditGrants.createdAt,
      spent: sql<number>`(
        select count(*) from ${modelCalls} mc
        where mc.credit_grant_id = ${creditGrants}.id and mc.status = 'spent'
      )::int`,
      // Epoch milliseconds, as JSON, for the reason `grantBalances` gives.
      reserved: sql<number[] | null>`(
        select json_agg((extract(epoch from mc.created_at) * 1000)::float8) from ${modelCalls} mc
        where mc.credit_grant_id = ${creditGrants}.id and mc.status = 'reserved' and mc.created_at > ${reservedSince}::timestamp
      )`,
    })
    .from(creditGrants)
    .where(and(eq(creditGrants.userId, userId), eq(creditGrants.source, "welcome")))
    .limit(1);
}

/** The reader's welcome lot at `now`, or null when they have none. */
export async function readWelcomeLot(userId: string, now: Date = new Date(), q: Reader = db): Promise<WelcomeLot | null> {
  const [row] = await welcomeLotQuery(userId, now, q);
  // The table's check holds a welcome lot's `expires_at` set; a row without one is not a lot this reads.
  if (!row || !row.expiresAt) return null;
  const grant: CreditGrant = { id: row.id, source: "welcome", units: row.units, revokedUnits: row.revokedUnits, expiresAt: row.expiresAt, createdAt: row.createdAt };
  const reserved = (row.reserved ?? []).map((ms) => new Date(Number(ms)));
  return {
    units: row.units,
    left: remaining(grant, { spent: Number(row.spent ?? 0), reserved }, now),
    expiresAt: row.expiresAt,
    expired: !isLive(grant, now),
  };
}

/** When this reader closed Home's welcome strip (`user_prefs.welcome_strip_dismissed_at`), or null. No row reads as never. */
export async function readWelcomeStripDismissed(userId: string, q: Reader = db): Promise<Date | null> {
  const rows = await q
    .select({ at: userPrefs.welcomeStripDismissedAt })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return rows[0]?.at ?? null;
}

/**
 * Closes the strip for good. Written ONLY while the column is null: `user_prefs` carries the `user_data_touch` stamp
 * trigger (0123), which fires on any UPDATE, a no-op one included, so a second close (another tab) would otherwise
 * retire the reader's cached Home and `/decks` for nothing. Apart so a test can render its SQL.
 */
export function dismissWelcomeStripWrite(userId: string, q: Writer = db) {
  return q
    .insert(userPrefs)
    .values({ userId, welcomeStripDismissedAt: sql`now()` })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { welcomeStripDismissedAt: sql`now()` },
      setWhere: isNull(userPrefs.welcomeStripDismissedAt),
    })
    .returning({ at: userPrefs.welcomeStripDismissedAt });
}

/** Closes the strip for this reader: true only for the call that stamped it. */
export async function dismissWelcomeStrip(userId: string): Promise<boolean> {
  return (await dismissWelcomeStripWrite(userId)).length === 1;
}

/**
 * Everything the welcome surfaces draw from, per request and OUTSIDE every cached page payload (neither `credit_grants`
 * nor `model_calls` moves the reader's data stamp), as the chip's read is: the lot, the dismissal, `everBought` by the
 * chip's own rule, and `PAYMENTS_ENABLED` from `env` (the request's resolved switches, never `process.env`). Three
 * indexed lookups, run together.
 */
export async function readWelcomeState(userId: string, env: NodeJS.ProcessEnv, now: Date = new Date()): Promise<WelcomeState> {
  const [lot, dismissedAt, everBought] = await Promise.all([
    readWelcomeLot(userId, now),
    readWelcomeStripDismissed(userId),
    readEverBought(userId),
  ]);
  return welcomeState({ lot, now, dismissedAt, everBought, payments: paymentsEnabled(env) });
}

/** The reader's own daily free allowance, as the credit line and /credits read it, for the welcome lines that name it. */
export function readFreeAllowance(userId: string): Promise<number> {
  return dailyLimitFor(db, userId);
}

/**
 * The `Where credits work` sheet's list for this reader (welcome credits R2, G6): the five rows `writtenForYou` keeps
 * from the RESOLVED credits caption, as About's Written for you does, so every row follows its switch, and each row's
 * Try it from the shipped resolver (`showcaseGroups`' card states). Null when no row survives (or the credits entry is
 * not visible): then neither the sheet nor any `Where they work` is drawn.
 *
 * No read of its own: the caller hands in the deck list it already holds (Home's cached payload, or /credits' read).
 * The two deck tools with a row, Proposed cuts and Suggested changes, are judged on the list alone (`LIST_TOOLS`).
 */
export function welcomeSheetFor(env: NodeJS.ProcessEnv, facts: { cards: number; decks: readonly DeckListItem[] }): WelcomeSheet | null {
  const visible = visibleEntries(env);
  const written = writtenForYou(creditsEntryOf(visible)?.caption ?? null);
  if (!written) return null;
  const isOn = (name: SwitchName) => SWITCH_FLAGS[name](env);
  const tools = LIST_TOOLS.filter((id) => {
    const tool = TOOLS.find((t) => t.id === id);
    return tool !== undefined && (tool.switch === null || isOn(tool.switch));
  });
  const groups = showcaseGroups({
    isOn,
    visibleEntryIds: new Set(visible.map((e) => e.id)),
    fits: facts.decks.length > 0 ? fitsOf(deckFacts(facts.decks), tools) : {},
    deckCount: facts.decks.length,
    hasSyncBase: false,
    place: true,
  });
  return welcomeSheet({ written: written.rows, cards: facts.cards, decks: facts.decks.length, groups });
}
